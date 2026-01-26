# Third Spaces Youth Design Gallery

A Jekyll + Tailwind CSS microsite showcasing youth-designed features for the City of Austin's Third Spaces app. Part of the Resident Data Impact Project (RIDP).

## What is this?

This gallery showcases design submissions from Austin youth through the **Create to Code Challenge**. Visitors can:

- Browse youth-created designs for the Third Spaces app
- Experience designs in an immersive TikTok-style swipe viewer (mobile/tablet)
- Vote for designs in three positive-only categories (Favorite, Creative, Inclusive)
- Collect features from different designs with the Remix Engine
- Share custom remixes via URL

## Quick Start

### Prerequisites

- Ruby 3.2+
- Node.js 18+
- Bundler (`gem install bundler`)

### Installation

```bash
git clone https://github.com/crypticpy/third-spaces-gallery.git
cd third-spaces-gallery

bundle install
npm install

npm run dev
```

The site will be available at `http://localhost:4000/third-spaces-gallery/`

### Build Commands

```bash
npm run dev        # Dev server with live reload
npm run build      # Production build
npm run build:css  # Rebuild Tailwind CSS only
npm run watch:css  # Watch CSS changes
```

## Project Structure

```
third-spaces-gallery/
├── _config.yml              # Jekyll config, feature/vote categories
├── _layouts/
│   ├── default.html         # Base layout (header, footer, scripts, FAB)
│   ├── gallery.html         # Grid view with filters + Remix CTA
│   └── submission.html      # Individual design pages
├── _includes/
│   ├── immersive-gallery.html  # Full-screen swipe viewer
│   ├── submission-card.html
│   ├── vote-button.html
│   ├── quick-look-modal.html
│   └── feedback-prompt.html
├── _data/
│   ├── features.yml         # Feature category definitions
│   ├── vote_categories.yml  # Vote category definitions
│   └── collections.yml      # Gallery collection tabs
├── _submissions/             # Youth design content (Jekyll collection)
│   └── {year}/{slug}/index.md
├── assets/
│   ├── css/
│   │   ├── main.css         # Tailwind source + custom CSS
│   │   └── output.css       # Built CSS (committed for GH Pages)
│   ├── js/
│   │   ├── voting.js        # 6-layer spam-protected voting
│   │   ├── feedback.js      # Moderated feedback system
│   │   ├── filters.js       # Gallery filtering + search
│   │   ├── collections.js   # Netflix-style collection strips
│   │   ├── modal.js         # Quick Look bottom sheet
│   │   ├── remix.js         # Remix Engine (feature cart + sharing)
│   │   ├── immersive.js     # TikTok-style swipe gallery
│   │   ├── theme.js         # Chill/Hype theme toggle
│   │   └── supabase-config.js
│   └── images/
│       └── submissions/{year}/{slug}/  # Per-submission images
├── scripts/
│   └── new_submission_from_issue.js    # Issue → submission parser
├── remix/                   # Remix Dashboard page
├── designs/                 # Gallery page
├── about/                   # About page
├── privacy/                 # Privacy policy
└── .github/
    ├── ISSUE_TEMPLATE/new-submission.yml  # Staff intake form
    └── workflows/
        ├── pages.yml         # Auto-deploy on push to main
        └── new-submission.yml # Issue → PR automation
```

## Key Features

### Immersive Gallery

A full-screen, TikTok-style swipe viewer optimized for mobile and tablet:

- **Vertical swipe** navigates between designs (infinite loop with shuffle)
- **Horizontal swipe** navigates screens and details within each design
- Quick vote buttons in the footer, filter panel as a bottom sheet
- Auto-activates on mobile/tablet; opt-in on desktop via "Immersive View" button

### Remix Engine

A "shopping cart" for design features. Visitors collect individual features from different youth designs and build a custom remix:

- Per-feature add/remove chips on submission pages and immersive view
- Floating Action Button (FAB) with cart count
- Dashboard at `/remix/` with grouped feature list and radial constellation visualization
- Share via URL (`?features=feat_id1,feat_id2`), X/Twitter, or WhatsApp
- First-visit onboarding tooltip

### Voting System

Three positive-only vote categories with 6 layers of spam prevention:

1. **localStorage** — primary vote persistence
2. **Cookie backup** — fallback if localStorage clears
3. **Browser fingerprint** — privacy-respecting random UUID
4. **Rate limiting** — max 30 votes per 10 minutes
5. **Honeypot field** — hidden field catches bots
6. **Time validation** — rejects votes faster than 1.5s

Optional Supabase backend for centralized vote aggregation.

### Theme System

Toggle between Chill (light) and Hype (dark) modes. Uses Tailwind's class-based dark mode with CSS custom properties.

## Adding Submissions (Staff Only)

Submissions are managed exclusively by RIDP staff through an automated GitHub Issues pipeline.

### Automated Flow

1. Staff fills out the [Issue form](../../issues/new?template=new-submission.yml) with design details
2. Staff uploads screenshots as issue comments
3. Staff adds the **`approved`** label
4. Workflow auto-generates submission files + downloads images
5. PR is created for review
6. Staff reviews PR, authors Remix features, and merges
7. Auto-deploy publishes to GitHub Pages

### Manual Flow

See [CONTENT-GUIDE.md](CONTENT-GUIDE.md) for the full content management guide including manual submission creation, content modification, and edge cases.

### Submission Front Matter

```yaml
---
layout: submission
title: "Design Name"
slug: design-name
year: 2025
designer: "First L."
school: "School Name"
grade: "Middle School (6-8)"
summary: "Brief description"
feature_focus:
  - discovery
  - navigation
thumbnail: /assets/images/submissions/2025/design-name/thumb.png
screens:
  - src: /assets/images/submissions/2025/design-name/screen1.png
    alt: "Screen description"
    caption: "What this screen shows"
features:
  - id: feat_design_name_feature1
    name: "Feature Name"
    icon: "🎯"
votes:
  favorite: 0
  innovative: 0
  inclusive: 0
created_at: 2025-01-25
github_issue: 5
---
Full description in Markdown...
```

### Feature Focus IDs

| ID              | Description           |
| --------------- | --------------------- |
| `discovery`     | Finding places        |
| `navigation`    | Getting directions    |
| `feedback`      | Ratings & reviews     |
| `ai`            | Smart recommendations |
| `accessibility` | Inclusive design      |
| `communication` | Social features       |

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
  }
}
```

### Supabase Backend (Optional)

For centralized vote aggregation:

```yaml
# _config.yml
supabase:
  url: "https://your-project.supabase.co"
  anon_key: "your-anon-key"
```

## Deployment

Push to `main` triggers the `pages.yml` workflow which builds Jekyll + Tailwind and deploys to GitHub Pages automatically.

```bash
npm run build    # Manual build → output in _site/
```

## License

This project is part of the City of Austin's open-source initiatives.

## Acknowledgments

- City of Austin RIDP Team
- Austin Youth Council
- All the amazing young designers who contributed
