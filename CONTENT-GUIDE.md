# Content Management Guide

How to add and modify content on the Third Spaces Youth Design Gallery.

## Architecture Overview

Content flows through an automated pipeline:

```
Youth submits GitHub Issue → RIDP team reviews → Team adds "approved" label →
Workflow auto-generates submission files → PR created → Team reviews/adds images → Merge → Auto-deploy
```

The GitHub Issue form at `issues/new?template=new-submission.yml` is a structured intake form. When the team adds the `approved` label, the `new-submission.yml` workflow automatically:

1. Parses the issue body into Jekyll front matter
2. Downloads any images from issue comments
3. Creates a PR with the generated submission files
4. Comments on the issue with status

**Manual steps still needed:** The team must review the PR, add/fix images if auto-download missed them, author Remix features, and merge.

### Automated vs. Manual

| Step                              | Automated         | Manual       |
| --------------------------------- | ----------------- | ------------ |
| Issue form parsing → front matter | Yes               | -            |
| Slug generation                   | Yes               | -            |
| Image download from comments      | Yes (best-effort) | Fallback     |
| Remix features (`features` array) | No                | Yes          |
| Screen alt text / captions        | Placeholder       | Refine in PR |
| PR creation                       | Yes               | -            |
| Final review and merge            | -                 | Yes          |

---

## Adding a New Project (Submission)

### Step 1: Collect the Submission

A youth submitter fills out the GitHub Issue form. The issue will have labels `new-submission` and `needs-review`. The form collects:

| Field              | Maps to Front Matter                  |
| ------------------ | ------------------------------------- |
| Design Title       | `title`                               |
| Designer Name(s)   | `designer`                            |
| School             | `school`                              |
| Grade Level        | `grade`                               |
| Quick Summary      | `summary`                             |
| Feature checkboxes | `feature_focus` (requires ID mapping) |
| Tell us more!      | Markdown body content                 |
| Inspiration note   | `creator_note` (optional)             |
| Demo Link          | `links.demo_url`                      |

### Step 2: Create the Submission Directory

```
_submissions/{year}/{slug}/index.md
```

Generate the slug from the title: lowercase, spaces to hyphens, remove special characters.

Example: "Community Hub" → `community-hub`

```bash
mkdir -p _submissions/2025/my-design-name
```

### Step 3: Write the Front Matter

Use this template — copy and fill in all fields:

```yaml
---
layout: submission
title: "Design Name"
slug: design-name
year: 2025

designer: "First L."
school: "School Name"
grade: "Middle School (6-8)" # Must match exactly: "Elementary (K-5)", "Middle School (6-8)", or "High School (9-12)"

summary: "One-sentence description of the design"

feature_focus:
  - discovery # Map from issue checkboxes (see table below)
  - navigation

# Screenshots (see Step 4)
thumbnail: /assets/images/submissions/2025/design-name/thumb.svg
thumbnail_alt: "Description of thumbnail"
cover_image: /assets/images/submissions/2025/design-name/thumb.svg
screens:
  - src: /assets/images/submissions/2025/design-name/screen1.svg
    alt: "Description of screen 1"
    caption: "What this screen shows"
  - src: /assets/images/submissions/2025/design-name/screen2.svg
    alt: "Description of screen 2"
    caption: "What this screen shows"

# Optional: designer's personal note (from "What inspired this design?" field)
creator_note: "What inspired this design"

# Remix Engine features (manually authored per submission)
features:
  - id: feat_design_name_feature1
    name: "Feature Name"
    icon: "🎯"
  - id: feat_design_name_feature2
    name: "Another Feature"
    icon: "✨"

links:
  demo_url: "https://figma.com/..." # or null

votes:
  favorite: 0
  innovative: 0
  inclusive: 0

created_at: 2025-01-25
github_issue: 5 # The issue number
---
Full description in Markdown goes here. This comes from the "Tell us more!" field in the issue.
```

### Feature Checkbox → ID Mapping

When reading the issue, map checked boxes to these IDs:

| Issue Checkbox Label                     | `feature_focus` ID |
| ---------------------------------------- | ------------------ |
| Discovery & Search (finding places)      | `discovery`        |
| Maps & Navigation (getting there)        | `navigation`       |
| Ratings & Feedback (sharing experiences) | `feedback`         |
| AI Assistant (smart help)                | `ai`               |
| Accessibility (works for everyone)       | `accessibility`    |
| Communication (messaging, sharing)       | `communication`    |

### Step 4: Add Screenshots

Create the image directory:

```bash
mkdir -p assets/images/submissions/2025/design-name
```

**From GitHub Issue comments:** Right-click the uploaded images in the issue, save them, and place them in the directory. Rename to `thumb.{ext}`, `screen1.{ext}`, `screen2.{ext}`.

**Image requirements:**

- Thumbnail: used for gallery cards and hero. Aspect ratio ~16:10 works best.
- Screens: individual app screens shown in the carousel.
- Formats: SVG, PNG, or JPG all work. Update the file extensions in front matter to match.
- Paths in front matter must be absolute from site root: `/assets/images/submissions/2025/slug/filename.ext`

### Step 5: Author Remix Features

The `features` array powers the Remix Engine (the "shopping cart" where users collect features). This is NOT in the issue form — you author it based on the design's key features.

**Convention:**

- `id`: `feat_{slug}_{short_name}` (e.g., `feat_community_hub_groups`)
- `name`: Human-readable feature name (e.g., "Interest Groups")
- `icon`: A single emoji that represents the feature

Aim for 3-5 features per submission. Look at the design's screens and description to identify distinct, collectible features.

### Step 6: Commit and Deploy

```bash
git add _submissions/2025/design-name/ assets/images/submissions/2025/design-name/
git commit -m "feat: add design-name submission (#5)"
git push
```

The `pages.yml` workflow auto-deploys on push to `main`.

---

## Modifying Existing Content

### Edit a submission's text

Edit `_submissions/{year}/{slug}/index.md`. Front matter fields and Markdown body can be changed directly.

### Update screenshots

Replace the image files in `assets/images/submissions/{year}/{slug}/`. If changing filenames or formats, update the `thumbnail`, `cover_image`, and `screens` paths in front matter.

### Change feature categories

Edit `_config.yml` under `feature_categories`. The gallery filter chips and immersive gallery filter panel read from `site.feature_categories`.

Note: `_data/features.yml` also defines features but templates currently read from `_config.yml`. Keep both in sync if editing.

### Change vote categories

Edit `_config.yml` under `vote_categories`. Also keep `_data/vote_categories.yml` in sync.

### Edit brand colors

Edit `tailwind.config.js` under `theme.extend.colors.brand`, then rebuild CSS:

```bash
npm run build:css
```

### Edit site metadata

Edit `_config.yml` for `title`, `description`, `url`, `baseurl`, `giscus` settings.

---

## Edge Cases and Gotchas

1. **Slugs must be unique.** If two submissions have similar titles, ensure slugs differ.

2. **Grade values must match exactly.** Use one of: `"Elementary (K-5)"`, `"Middle School (6-8)"`, `"High School (9-12)"`. The gallery filters depend on exact string matching.

3. **Image paths are absolute.** Always start with `/assets/images/submissions/...`. Relative paths will break on GitHub Pages where the site is served from a subdirectory (`/third-spaces-gallery/`).

4. **Votes initialize to 0.** Don't copy vote counts from existing submissions — those may have demo data.

5. **Remix feature IDs must be globally unique.** Use the `feat_{slug}_{name}` convention to avoid collisions across submissions.

6. **The `features` array is optional but recommended.** Submissions without it won't show the "Remix These Features" section on their detail page or in the immersive gallery.

7. **Screenshots as comments.** Youth upload screenshots after submitting the issue. Wait for images before creating the submission files.

---

## File Reference

```
_config.yml                              # Site config, feature/vote category definitions
_data/features.yml                       # Feature category reference data
_data/vote_categories.yml                # Vote category reference data
_data/collections.yml                    # Gallery tab/collection definitions
_submissions/{year}/{slug}/index.md      # Submission content files
assets/images/submissions/{year}/{slug}/ # Submission images
scripts/new_submission_from_issue.js     # Parses issue body → generates submission files
.github/ISSUE_TEMPLATE/new-submission.yml # Issue intake form
.github/workflows/pages.yml             # Auto-deploy workflow
.github/workflows/new-submission.yml    # Issue → PR automation workflow
```
