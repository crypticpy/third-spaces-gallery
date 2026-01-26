/**
 * Supabase Edge Function: submit-concern
 *
 * Receives data concern form submissions, stores them in the
 * data_concerns table, and creates a GitHub Issue for admin triage.
 *
 * Required secrets (set via `supabase secrets set`):
 *   GITHUB_PAT       - Fine-grained PAT with Issues: Read & Write
 *   GITHUB_REPO      - e.g. "crypticpy/third-spaces-gallery"
 *
 * Deployment:
 *   supabase functions deploy submit-concern --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX = 3;
const MIN_DETAILS_LENGTH = 10;
const MAX_DETAILS_LENGTH = 2000;

const VALID_CONCERN_TYPES = [
  "delete_data",
  "data_inquiry",
  "privacy_concern",
  "other",
];

const CONCERN_TYPE_LABELS: Record<string, string> = {
  delete_data: "Delete my server data",
  data_inquiry: "What data do you have about me?",
  privacy_concern: "Report a privacy concern",
  other: "Something else",
};

interface ConcernRequest {
  concern_type: string;
  details: string;
  email?: string;
  device_id?: string;
}

function generateReference(): string {
  const now = new Date();
  const date =
    now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, "0") +
    now.getDate().toString().padStart(2, "0");
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `DC-${date}-${code}`;
}

function sanitize(str: string, maxLen: number): string {
  return str.trim().slice(0, maxLen).replace(/[<>]/g, "");
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse body
    const body: ConcernRequest = await req.json();

    // Validate required fields
    if (
      !body.concern_type ||
      !VALID_CONCERN_TYPES.includes(body.concern_type)
    ) {
      return new Response(JSON.stringify({ error: "Invalid concern type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!body.details || body.details.trim().length < MIN_DETAILS_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `Details must be at least ${MIN_DETAILS_LENGTH} characters`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitize inputs
    const concernType = body.concern_type;
    const details = sanitize(body.details, MAX_DETAILS_LENGTH);
    const email = body.email ? sanitize(body.email, 320) : null;
    const deviceId = body.device_id ? sanitize(body.device_id, 100) : null;

    // Basic email format check if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check: max N submissions per device per hour
    if (deviceId) {
      const windowStart = new Date(
        Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
      ).toISOString();

      const { count } = await supabase
        .from("data_concerns")
        .select("*", { count: "exact", head: true })
        .eq("device_id", deviceId)
        .gte("created_at", windowStart);

      if (count !== null && count >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({
            error:
              "You've submitted recently. Please wait before sending another concern.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Generate reference number
    const reference = generateReference();

    // Insert into data_concerns table
    const { data: insertData, error: insertError } = await supabase
      .from("data_concerns")
      .insert({
        reference,
        concern_type: concernType,
        details,
        email,
        device_id: deviceId,
        status: "open",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save your concern. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create GitHub Issue
    const githubPat = Deno.env.get("GITHUB_PAT");
    const githubRepo =
      Deno.env.get("GITHUB_REPO") || "crypticpy/third-spaces-gallery";
    let issueUrl: string | null = null;

    if (githubPat) {
      try {
        const issueTitle = `[Data Concern] ${CONCERN_TYPE_LABELS[concernType] || concernType} — ${reference}`;
        const issueBody = [
          "## Data Concern Submitted",
          "",
          `**Reference:** \`${reference}\``,
          `**Type:** ${CONCERN_TYPE_LABELS[concernType] || concernType}`,
          `**Submitted:** ${new Date().toISOString()}`,
          "",
          `View details in Supabase using record ID: \`${insertData.id}\``,
          "",
          "---",
          "*Auto-created by the Third Spaces Gallery transparency page.*",
        ].join("\n");

        const ghResponse = await fetch(
          `https://api.github.com/repos/${githubRepo}/issues`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${githubPat}`,
              Accept: "application/vnd.github+json",
              "Content-Type": "application/json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify({
              title: issueTitle,
              body: issueBody,
              labels: ["data-concern"],
            }),
          },
        );

        if (ghResponse.ok) {
          const ghData = await ghResponse.json();
          issueUrl = ghData.html_url;

          // Update record with issue URL
          await supabase
            .from("data_concerns")
            .update({ github_issue_url: issueUrl })
            .eq("id", insertData.id);
        } else {
          const errText = await ghResponse.text();
          console.error("GitHub API error:", ghResponse.status, errText);
          // Non-fatal: concern is saved in DB even if issue creation fails
        }
      } catch (ghErr) {
        console.error("GitHub Issue creation failed:", ghErr);
        // Non-fatal: concern is saved in DB
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        message: "Your concern has been received. We'll look into it.",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
