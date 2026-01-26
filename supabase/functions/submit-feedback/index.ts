/**
 * Supabase Edge Function: submit-feedback
 *
 * Receives feedback form submissions, stores them in the
 * feedback table (approved=false), and creates a GitHub Issue
 * for moderator review.
 *
 * Required secrets (set via `supabase secrets set`):
 *   GITHUB_PAT       - Fine-grained PAT with Issues: Read & Write
 *   GITHUB_REPO      - e.g. "crypticpy/third-spaces-gallery"
 *
 * Deployment:
 *   supabase functions deploy submit-feedback --no-verify-jwt
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT_WINDOW_HOURS = 1;
const RATE_LIMIT_MAX = 5;
const MAX_TEXT_LENGTH = 500;
const MAX_NAME_LENGTH = 50;

const VALID_TAGS = [
  "easy-to-use",
  "looks-great",
  "solves-problem",
  "would-share",
];

interface FeedbackRequest {
  submission_id: string;
  author_name?: string;
  feedback_text?: string;
  tags?: string[];
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
  return `FB-${date}-${code}`;
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
    const body: FeedbackRequest = await req.json();

    // Validate required fields
    if (!body.submission_id || !body.submission_id.trim()) {
      return new Response(JSON.stringify({ error: "Missing submission ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const feedbackText = body.feedback_text?.trim() || "";
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((t) => VALID_TAGS.includes(t))
      : [];

    // Must have text or tags
    if (!feedbackText && tags.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Please add a comment or select at least one tag",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitize inputs
    const submissionId = sanitize(body.submission_id, 100);
    const authorName = body.author_name
      ? sanitize(body.author_name, MAX_NAME_LENGTH)
      : "Anonymous";
    const sanitizedText = feedbackText
      ? sanitize(feedbackText, MAX_TEXT_LENGTH)
      : "";
    const deviceId = body.device_id ? sanitize(body.device_id, 100) : null;

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit check
    if (deviceId) {
      const windowStart = new Date(
        Date.now() - RATE_LIMIT_WINDOW_HOURS * 60 * 60 * 1000,
      ).toISOString();

      const { count } = await supabase
        .from("feedback")
        .select("*", { count: "exact", head: true })
        .eq("device_id", deviceId)
        .gte("created_at", windowStart);

      if (count !== null && count >= RATE_LIMIT_MAX) {
        return new Response(
          JSON.stringify({
            error:
              "You've submitted a lot of feedback recently. Please wait before sending more.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    const reference = generateReference();

    // Insert into feedback table
    const { data: insertData, error: insertError } = await supabase
      .from("feedback")
      .insert({
        submission_id: submissionId,
        author_name: authorName,
        feedback_text: sanitizedText,
        tags,
        approved: false,
        device_id: deviceId,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to save your feedback. Please try again.",
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
        const isPrivateRepo = Deno.env.get("GITHUB_ISSUES_PRIVATE") === "true";
        const issueTitle = `[Feedback] ${submissionId} — ${reference}`;
        const tagList =
          tags.length > 0 ? tags.map((t) => `\`${t}\``).join(", ") : "_none_";

        const bodyLines = [
          "## Feedback Submitted for Review",
          "",
          `**Reference:** \`${reference}\``,
          `**Design:** \`${submissionId}\``,
          `**Tags:** ${tagList}`,
          `**Submitted:** ${new Date().toISOString()}`,
          "",
        ];

        if (isPrivateRepo) {
          bodyLines.push(
            "### Comment",
            "",
            sanitizedText || "_No text provided (tags only)_",
            "",
          );
        } else {
          bodyLines.push(
            `View details in Supabase using record ID: \`${insertData.id}\``,
            "",
          );
        }

        bodyLines.push(
          "---",
          "",
          "**To approve:** Add the `approved` label to this issue.",
          "",
          `<!-- CONTENT_TYPE: feedback -->`,
          `<!-- RECORD_ID: ${insertData.id} -->`,
          "",
          "*Auto-created by the Third Spaces Gallery feedback system.*",
        );

        const issueBody = bodyLines.join("\n");

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
              labels: ["feedback-review"],
            }),
          },
        );

        if (ghResponse.ok) {
          const ghData = await ghResponse.json();
          issueUrl = ghData.html_url;

          await supabase
            .from("feedback")
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
          "Thanks for your feedback! It will appear after a quick review.",
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
