/**
 * Supabase Edge Function: submit-remix
 *
 * Receives published remix submissions, stores them in the
 * published_remixes table (approved=false), and creates a
 * GitHub Issue for moderator review.
 *
 * Required secrets (set via `supabase secrets set`):
 *   GITHUB_PAT       - Fine-grained PAT with Issues: Read & Write
 *   GITHUB_REPO      - e.g. "crypticpy/third-spaces-gallery"
 *
 * Deployment:
 *   supabase functions deploy submit-remix --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX = 3;
const MAX_NOTE_LENGTH = 500;
const MAX_NAME_LENGTH = 50;
const MAX_FEATURES = 20;

interface RemixFeature {
  id: string;
  name: string;
  icon?: string;
  sourceSubmission?: string;
  sourceTitle?: string;
}

interface RemixRequest {
  device_id: string;
  author_name?: string;
  user_note?: string;
  features: RemixFeature[];
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
  return `RX-${date}-${code}`;
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
    const body: RemixRequest = await req.json();

    // Validate required fields
    if (!body.device_id || !body.device_id.trim()) {
      return new Response(JSON.stringify({ error: "Missing device ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(body.features) || body.features.length === 0) {
      return new Response(
        JSON.stringify({ error: "Remix must contain at least one feature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.features.length > MAX_FEATURES) {
      return new Response(
        JSON.stringify({
          error: `Remix can contain at most ${MAX_FEATURES} features`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate each feature has an id
    for (const f of body.features) {
      if (!f.id || typeof f.id !== "string") {
        return new Response(
          JSON.stringify({ error: "Each feature must have an id" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Sanitize inputs
    const deviceId = sanitize(body.device_id, 100);
    const authorName = body.author_name
      ? sanitize(body.author_name, MAX_NAME_LENGTH)
      : "Anonymous";
    const userNote = body.user_note
      ? sanitize(body.user_note, MAX_NOTE_LENGTH)
      : "";

    // Sanitize features
    const features = body.features.slice(0, MAX_FEATURES).map((f) => ({
      id: sanitize(f.id, 100),
      name: sanitize(f.name || f.id, 100),
      icon: f.icon ? sanitize(f.icon, 10) : "🎯",
      sourceSubmission: f.sourceSubmission
        ? sanitize(f.sourceSubmission, 100)
        : null,
      sourceTitle: f.sourceTitle ? sanitize(f.sourceTitle, 200) : null,
    }));

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const { count } = await supabase
      .from("published_remixes")
      .select("*", { count: "exact", head: true })
      .eq("device_id", deviceId)
      .gte("created_at", windowStart);

    if (count !== null && count >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({
          error:
            "You've published several remixes recently. Please wait before submitting another.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const reference = generateReference();

    // Insert into published_remixes table
    const { data: insertData, error: insertError } = await supabase
      .from("published_remixes")
      .insert({
        device_id: deviceId,
        author_name: authorName,
        user_note: userNote,
        features,
        approved: false,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save your remix. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Create GitHub Issue for moderation
    const githubPat = Deno.env.get("GITHUB_PAT");
    const githubRepo =
      Deno.env.get("GITHUB_REPO") || "crypticpy/third-spaces-gallery";
    let issueUrl: string | null = null;

    if (githubPat) {
      try {
        const issueTitle = `[Remix] ${authorName}'s remix (${features.length} features) — ${reference}`;

        // Build feature list for the issue body
        const sources = new Map<string, RemixFeature[]>();
        for (const f of features) {
          const src = f.sourceTitle || f.sourceSubmission || "Unknown";
          if (!sources.has(src)) sources.set(src, []);
          sources.get(src)!.push(f);
        }

        let featureList = "";
        for (const [src, items] of sources) {
          featureList += `\n**From ${src}:**\n`;
          for (const item of items) {
            featureList += `- ${item.icon} ${item.name}\n`;
          }
        }

        const issueBody = [
          "## Remix Published for Review",
          "",
          `**Reference:** \`${reference}\``,
          `**Author:** ${authorName}`,
          `**Features:** ${features.length}`,
          `**Sources:** ${sources.size} design${sources.size !== 1 ? "s" : ""}`,
          `**Submitted:** ${new Date().toISOString()}`,
          "",
          "### Features",
          featureList,
          userNote ? `### Author's Note\n\n${userNote}\n` : "",
          "---",
          "",
          "**To approve:** Add the `approved` label to this issue.",
          "",
          `<!-- CONTENT_TYPE: remix -->`,
          `<!-- RECORD_ID: ${insertData.id} -->`,
          "",
          "*Auto-created by the Third Spaces Gallery remix system.*",
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
              labels: ["remix-review"],
            }),
          },
        );

        if (ghResponse.ok) {
          const ghData = await ghResponse.json();
          issueUrl = ghData.html_url;

          await supabase
            .from("published_remixes")
            .update({ github_issue_url: issueUrl })
            .eq("id", insertData.id);
        } else {
          const errText = await ghResponse.text();
          console.error("GitHub API error:", ghResponse.status, errText);
        }
      } catch (ghErr) {
        console.error("GitHub Issue creation failed:", ghErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reference,
        message:
          "Your remix has been submitted! It will appear in the community section after review.",
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
