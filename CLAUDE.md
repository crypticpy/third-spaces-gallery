# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Jekyll + Tailwind CSS microsite showcasing youth-designed features for the City of Austin's Third Spaces app. Part of the Resident Data Impact Project (RIDP).

## Quick Reference

### Development Commands

```bash
# Install dependencies
bundle install && npm install

# Start development server (with live reload)
npm run dev

# Build for production
npm run build

# Build CSS only
npm run build:css

# Watch CSS only
npm run watch:css
```

### Key Directories

```
├── _layouts/          # Page templates
│   ├── default.html   # Base layout with header/footer
│   ├── gallery.html   # Grid view with filters
│   └── submission.html # Individual design pages
├── _includes/         # Reusable components
│   ├── submission-card.html
│   ├── vote-button.html
│   └── feedback-prompt.html
├── _data/             # Site data
│   ├── features.yml   # Feature categories
│   └── vote_categories.yml
├── assets/
│   ├── css/main.css   # Tailwind source
│   └── js/
│       ├── voting.js  # Voting system
│       └── filters.js # Gallery filters + feedback
├── _submissions/      # Youth design content (Jekyll collection)
│   └── [year]/[slug]/index.md
└── .github/
    ├── workflows/pages.yml        # Deploy workflow
    └── ISSUE_TEMPLATE/new-submission.yml
```

## Architecture

### Voting System

The voting system (`assets/js/voting.js`) has 6 layers of spam prevention:

1. **localStorage** - Primary vote storage
2. **Cookie backup** - Fallback persistence
3. **Browser fingerprint** - Identifies repeat visitors (hashed, not PII)
4. **Rate limiting** - Max 30 votes per 10 minutes
5. **Honeypot field** - Hidden field that catches bots
6. **Time validation** - Rejects votes faster than 1.5 seconds

### Vote Categories

Three positive-only categories (configured in `_data/vote_categories.yml`):

- **Favorite** (💖) - "I'd use this"
- **Innovative** (✨) - "Super creative"
- **Inclusive** (🌍) - "Works for everyone"

### Data Flow

```
User clicks vote → Validation checks → Record locally →
Update UI (optimistic) → Sync to backend (if configured)
```

## Adding New Submissions

### Via GitHub Issues

1. User fills out issue template at `/issues/new?template=new-submission.yml`
2. RIDP team reviews and adds screenshots
3. GitHub Action (optional) auto-generates submission files
4. PR is created for review and merge

### Manually

Create `_submissions/[year]/[slug]/index.md`:

```yaml
---
layout: submission
title: "Design Name"
slug: design-name
year: 2025

designer: "First L."
school: "School Name"
grade: "Middle School (6-8)"

summary: "One-sentence description"
feature_focus:
  - discovery
  - navigation

thumbnail: thumb.svg
thumbnail_alt: "Description"

links:
  demo_url: "https://figma.com/..."

votes:
  favorite: 0
  innovative: 0
  inclusive: 0

created_at: 2025-01-24
---
Full description in Markdown...
```

### Feature IDs

Use these in `feature_focus`:

- `discovery` - Finding places
- `navigation` - Getting directions
- `feedback` - Ratings/reviews
- `ai` - Smart recommendations
- `accessibility` - Inclusive design
- `communication` - Social features

## Customization

### Brand Colors

Edit `tailwind.config.js`:

```js
colors: {
  brand: {
    navy: '#22254E',
    indigo: '#44499C',
    sky: '#009CDE',
    sea: '#009F4D',
    gold: '#FFC600',
    // ...
  }
}
```

### Giscus Comments

1. Enable GitHub Discussions on your repo
2. Create a "Design Feedback" category
3. Install Giscus app: https://github.com/apps/giscus
4. Get config from https://giscus.app
5. Update `_config.yml`:

```yaml
giscus:
  repo: "crypticpy/third-spaces-gallery"
  repo_id: "R_xxxxx"
  category: "Design Feedback"
  category_id: "DIC_xxxxx"
```

### Optional: Supabase Backend

For real vote aggregation:

1. Create Supabase project
2. Run SQL from Technical Specs doc to create tables
3. Add to `_config.yml`:

```yaml
supabase:
  url: "https://xxx.supabase.co"
  anon_key: "your-anon-key"
```

4. Update `voting.js` to read config

## Common Tasks

### Adding a new feature category

1. Add to `_data/features.yml`
2. Add filter chip in `_layouts/gallery.html`
3. Use ID in submission front matter

### Modifying vote button appearance

Edit `_includes/vote-button.html` - uses Liquid conditionals for category-specific colors.

### Changing animations

Edit `tailwind.config.js` keyframes and animation definitions. Also update `assets/css/main.css` for any non-Tailwind animations.

### Adding new pages

Create `[page-name]/index.html` with front matter:

```yaml
---
layout: default
title: Page Title
---
```

## Deployment

### GitHub Pages (Recommended)

1. Push to `main` branch
2. GitHub Actions workflow builds and deploys automatically
3. Site available at `https://[org].github.io/third-spaces-gallery/`

### Manual Build

```bash
npm run build
# Output in _site/ directory
```

## Testing

### Local Testing

```bash
npm run dev
# Visit http://localhost:4000/third-spaces-gallery/
```

### Vote System Testing

1. Open browser dev tools
2. Check `localStorage.getItem('ts:votes:v1')` for vote state
3. Clear with `localStorage.removeItem('ts:votes:v1')`
4. Also clear cookie `ts_v` for full reset

## Troubleshooting

### Styles not updating

```bash
npm run build:css
```

### Jekyll build errors

Check Ruby version (3.2+ required) and run:

```bash
bundle install
```

### Vote counts not showing

Ensure submission front matter has:

```yaml
votes:
  favorite: 0
  innovative: 0
  inclusive: 0
```

## Contact

RIDP Team: ridp@austintexas.gov
