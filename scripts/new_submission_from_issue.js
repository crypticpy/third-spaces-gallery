#!/usr/bin/env node

/**
 * new_submission_from_issue.js
 *
 * Parses a GitHub Issue (created from the new-submission form template)
 * and generates a Jekyll _submissions/ file with proper front matter.
 *
 * Called by the new-submission GitHub Actions workflow.
 *
 * Environment variables:
 *   ISSUE_NUMBER  - The GitHub issue number (required)
 *   ISSUE_BODY    - The raw issue body text (required)
 *   ISSUE_TITLE   - The issue title (fallback for design title)
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maps checkbox label keywords → feature_focus IDs */
const FEATURE_CHECKBOX_MAP = {
  "Discovery & Search": "discovery",
  "Maps & Navigation": "navigation",
  "Ratings & Feedback": "feedback",
  "AI Assistant": "ai",
  Accessibility: "accessibility",
  Communication: "communication",
};

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Split the GitHub Issue body into { heading: content } sections.
 * Issue form bodies use `### Heading` separators.
 */
function parseIssueBody(body) {
  const sections = {};
  const parts = body.split(/^###\s+/m);

  for (const part of parts) {
    if (!part.trim()) continue;
    const newlineIndex = part.indexOf("\n");
    if (newlineIndex === -1) continue;

    const heading = part.substring(0, newlineIndex).trim();
    const content = part.substring(newlineIndex + 1).trim();
    sections[heading] = content;
  }

  return sections;
}

/**
 * Return the text values of checked checkboxes from a markdown list.
 * Matches `- [X] label` or `- [x] label`.
 */
function parseCheckboxes(text) {
  const checked = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^-\s*\[([Xx])\]\s*(.+)/);
    if (match) {
      checked.push(match[2].trim());
    }
  }
  return checked;
}

/**
 * Map checked checkbox labels to feature_focus IDs.
 */
function mapFeatures(checkedLabels) {
  const features = [];
  for (const label of checkedLabels) {
    for (const [keyword, id] of Object.entries(FEATURE_CHECKBOX_MAP)) {
      if (label.includes(keyword)) {
        features.push(id);
        break;
      }
    }
  }
  return features;
}

/**
 * Convert a title to a URL-safe slug.
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Wrap a string in double quotes for YAML, escaping inner quotes.
 * Returns `""` for empty/null values.
 */
function escapeYaml(str) {
  if (!str) return '""';
  return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Return true if a field value is missing or the GitHub "no response" sentinel.
 */
function isEmpty(value) {
  return !value || value === "_No response_";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const issueNumber = process.env.ISSUE_NUMBER;
  const issueBody = process.env.ISSUE_BODY;
  const issueTitle = process.env.ISSUE_TITLE || "";

  if (!issueBody) {
    console.error("Error: ISSUE_BODY environment variable is required");
    process.exit(1);
  }
  if (!issueNumber) {
    console.error("Error: ISSUE_NUMBER environment variable is required");
    process.exit(1);
  }

  // --- Parse issue body sections ---
  const sections = parseIssueBody(issueBody);

  // --- Extract fields ---
  const title =
    sections["Design Title"] ||
    issueTitle.replace(/^\[Design\]\s*/, "").trim() ||
    "Untitled Design";

  const designer = sections["Designer Name(s)"] || "Unknown";
  const school = sections["School"] || "Unknown";
  const grade = sections["Grade Level"] || "Middle School (6-8)";
  const summary = sections["Quick Summary"] || "";
  const description = sections["Tell us more!"] || "";
  const creatorNote = sections["What inspired this design? (optional)"] || "";
  const demoUrl = sections["Demo Link (optional)"] || "";

  // Parse feature checkboxes
  const featureText =
    sections["What features does your design focus on?"] || "";
  const checkedFeatures = parseCheckboxes(featureText);
  const featureFocus = mapFeatures(checkedFeatures);

  // --- Derived values ---
  const slug = slugify(title);
  const year = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];
  const imagePath = `/assets/images/submissions/${year}/${slug}`;

  // --- Build front matter ---
  const lines = [
    "---",
    "layout: submission",
    `title: ${escapeYaml(title)}`,
    `slug: ${slug}`,
    `year: ${year}`,
    "",
    `designer: ${escapeYaml(designer)}`,
    `school: ${escapeYaml(school)}`,
    `grade: ${escapeYaml(grade)}`,
    "",
    `summary: ${escapeYaml(summary)}`,
    "",
    "feature_focus:",
  ];

  if (featureFocus.length > 0) {
    for (const f of featureFocus) {
      lines.push(`  - ${f}`);
    }
  } else {
    lines.push("  - discovery");
  }

  lines.push("");
  lines.push(`thumbnail: ${imagePath}/thumb.png`);
  lines.push(`thumbnail_alt: ${escapeYaml(title + " app screenshot")}`);
  lines.push(`cover_image: ${imagePath}/thumb.png`);
  lines.push("screens:");
  lines.push(`  - src: ${imagePath}/screen1.png`);
  lines.push(`    alt: ${escapeYaml(title + " screen 1")}`);
  lines.push('    caption: "App screen"');
  lines.push(`  - src: ${imagePath}/screen2.png`);
  lines.push(`    alt: ${escapeYaml(title + " screen 2")}`);
  lines.push('    caption: "App screen"');
  lines.push("");

  // Creator note (if provided)
  if (!isEmpty(creatorNote)) {
    lines.push(`creator_note: ${escapeYaml(creatorNote)}`);
    lines.push("");
  }

  // Remix features placeholder
  lines.push(
    "# Remix features - author these based on the design's key features",
  );
  lines.push(
    "# Convention: id: feat_{slug}_{short_name}, name: Human-readable, icon: emoji",
  );
  lines.push("features: []");
  lines.push("");

  // Links
  const safeDemoUrl =
    !isEmpty(demoUrl) && /^https?:\/\//i.test(demoUrl) ? demoUrl : null;
  lines.push("links:");
  lines.push(`  demo_url: ${safeDemoUrl ? escapeYaml(safeDemoUrl) : "null"}`);
  lines.push("");

  // Votes (always initialize to 0)
  lines.push("votes:");
  lines.push("  favorite: 0");
  lines.push("  innovative: 0");
  lines.push("  inclusive: 0");
  lines.push("");

  // Metadata
  lines.push(`created_at: ${today}`);
  lines.push(`github_issue: ${issueNumber}`);
  lines.push("---");

  // --- Body content ---
  let bodyContent = "";
  if (!isEmpty(description)) {
    bodyContent = description;
  } else if (!isEmpty(summary)) {
    bodyContent = summary;
  }

  const fileContent = lines.join("\n") + "\n" + bodyContent + "\n";

  // --- Write files ---
  const dirPath = path.join("_submissions", String(year), slug);
  fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, "index.md");
  fs.writeFileSync(filePath, fileContent, "utf8");

  // Create image directory with .gitkeep
  const imgDir = path.join(
    "assets",
    "images",
    "submissions",
    String(year),
    slug,
  );
  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(path.join(imgDir, ".gitkeep"), "", "utf8");

  // --- Output for workflow ---
  // Use GitHub Actions output format
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `slug=${slug}\n`);
    fs.appendFileSync(outputFile, `year=${year}\n`);
    fs.appendFileSync(outputFile, `file=${filePath}\n`);
    fs.appendFileSync(outputFile, `img_dir=${imgDir}\n`);
  }

  console.log(`slug=${slug}`);
  console.log(`year=${year}`);
  console.log(`file=${filePath}`);
  console.log(`img_dir=${imgDir}`);
  console.log(`Created submission: ${filePath}`);
}

main();
