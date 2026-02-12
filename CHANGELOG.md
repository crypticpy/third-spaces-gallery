# Changelog

All notable changes to the Third Spaces Youth Design Gallery.

## [1.0.0] - 2026-01-25

First production release with full feature set: immersive gallery, remix engine, CMS automation, and staff-only content pipeline.

### CMS Automation

- **Staff-only GitHub Issues pipeline** — fill out an issue form, add the `approved` label, and a PR is auto-generated with the submission files and downloaded images
- Node.js script (`scripts/new_submission_from_issue.js`) parses issue body into Jekyll front matter with feature mapping, slug generation, and YAML escaping
- GitHub Actions workflow with collaborator permission check (admin/write/maintain only)
- Auto-downloads images from issue comments (best-effort)
- PR checklist reminds staff to add Remix features and review content
- Content management guide (`CONTENT-GUIDE.md`)

### Remix Engine

- Shopping cart pattern for collecting individual features from youth designs
- Per-feature add/remove chips on submission detail pages and immersive view
- Floating Action Button (FAB) with live cart count, always visible (muted when empty)
- Dashboard at `/remix/` with grouped feature list by source design
- Radial constellation visualization with animated feature bubbles
- Share via URL (`?features=`), X/Twitter, WhatsApp, or clipboard copy
- Import features from shared URL on page load
- Styled clear confirmation modal (replaces native `confirm()`)
- First-visit onboarding tooltip near FAB
- Remix nav link in header with count badge
- Dismissible Remix CTA banner on gallery page

### Immersive Gallery

- Full-screen TikTok-style swipe viewer for mobile and tablet
- Vertical swipe between designs, horizontal swipe between screens/details
- Infinite loop scrolling with Fisher-Yates shuffle on load
- Quick vote buttons in fixed footer with screen dot indicators
- Filter panel (bottom sheet) with collections, features, and sort options
- First-visit onboarding overlay with swipe instructions and voting preview
- Keyboard navigation (arrow keys, Escape)
- Auto-activates on mobile/tablet, opt-in on desktop

### Living Lab Features (Phase 2)

- **Trust & Privacy** — privacy-respecting random UUID replaces browser fingerprinting; "Clear My Data" button in footer
- **Theme System** — Chill/Hype toggle (light/dark mode) with Tailwind class strategy and CSS custom properties
- **Quick Look Modal** — bottom sheet on mobile, centered modal on desktop; screen carousel with swipe + arrow keys; integrated voting
- **Screen Carousel** — horizontal scroll snap on detail pages with dot indicators
- **Collection Strip** — Netflix-style horizontal curated views (Fresh drops, Most inclusive, Youth picks)
- All 4 submissions updated with cover images, screen metadata, creator notes, and Remix features

### Voting System

- 6-layer spam prevention: localStorage, cookie backup, browser fingerprint, rate limiting, honeypot, time validation
- Supabase integration for centralized vote aggregation and real-time sync
- Moderated feedback system with tag-based quick responses

### Design & Branding

- Youth-friendly design refresh with Geist typeface (official CoA brand)
- City of Austin seal logo and RIDP branding
- Vibrant gradients, rounded corners, playful animations (float, wiggle, sparkle)
- Full dark mode support across all components
- WCAG AA color contrast using CoA brand palette

### Infrastructure

- Jekyll + Tailwind CSS static site
- GitHub Pages auto-deploy on push to main
- Supabase backend (optional) for votes and feedback
- Built CSS committed to repo for GitHub Pages compatibility

---

## [0.1.0] - 2025-01-24

### Added

- Initial Jekyll + Tailwind CSS microsite
- Gallery with filtering and sorting
- 4 youth design submissions (Third Spaces Explorer, Vibe Finder, Community Hub, Access All)
- Voting system with localStorage persistence
- GitHub Issues submission template
- GitHub Pages deployment workflow
- Placeholder SVG mockups for all submissions
