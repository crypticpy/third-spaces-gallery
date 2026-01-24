# Third Spaces Youth Design Gallery

A microsite showcasing youth-designed features for the City of Austin's Third Spaces app. Part of the Resident Data Impact Project (RIDP).

## 🎨 What is this?

This gallery showcases design submissions from Austin youth through the **Create to Code Challenge**. Visitors can:

- Browse youth-created designs for the Third Spaces app
- Vote for designs in three categories (Favorite, Creative, Inclusive)
- Leave feedback and comments
- Submit their own designs

## 🚀 Quick Start

### Prerequisites

- Ruby 3.2+
- Node.js 18+
- Bundler (`gem install bundler`)

### Installation

```bash
# Clone the repository
git clone https://github.com/crypticpy/third-spaces-gallery.git
cd third-spaces-gallery

# Install Ruby dependencies
bundle install

# Install Node dependencies
npm install

# Start development server
npm run dev
```

The site will be available at `http://localhost:4000/third-spaces-gallery/`

## 📁 Project Structure

```
third-spaces-gallery/
├── _config.yml          # Jekyll configuration
├── _layouts/            # Page layouts
│   ├── default.html     # Base layout
│   ├── gallery.html     # Gallery grid layout
│   └── submission.html  # Individual submission layout
├── _includes/           # Reusable components
│   ├── submission-card.html
│   ├── vote-button.html
│   └── feedback-prompt.html
├── _submissions/        # Youth design submissions (Jekyll collection)
│   └── 2025/
│       └── [slug]/
│           └── index.md
├── assets/
│   ├── css/main.css     # Tailwind source
│   └── js/
│       ├── voting.js    # Voting system
│       └── filters.js   # Gallery filtering
├── designs/             # Gallery page
├── about/               # About page
└── index.html           # Home page
```

## 🗳️ Voting System

The voting system includes multiple spam prevention layers:

1. **localStorage persistence** - Remembers votes locally
2. **Cookie backup** - Fallback if localStorage is cleared
3. **Browser fingerprinting** - Identifies repeat visitors
4. **Rate limiting** - Max 30 votes per 10 minutes
5. **Honeypot field** - Catches bots
6. **Time-based validation** - Rejects votes faster than 1.5 seconds

### Optional: Supabase Backend

For real vote aggregation, set up a Supabase project and add to `_config.yml`:

```yaml
supabase:
  url: "https://your-project.supabase.co"
  anon_key: "your-anon-key"
```

## 📝 Adding Submissions

### Via GitHub Issues

1. Go to Issues > New Issue
2. Select "Add a new design" template
3. Fill out the form
4. Upload screenshots in a comment

### Manually

Create a new directory in `_submissions/[year]/[slug]/` with an `index.md` file:

```yaml
---
layout: submission
title: "My Design"
slug: my-design
year: 2025
designer: "Name L."
school: "School Name"
grade: "Middle School (6-8)"
summary: "Brief description..."
feature_focus:
  - discovery
  - navigation
votes:
  favorite: 0
  innovative: 0
  inclusive: 0
created_at: 2025-01-24
---
Full description of the design...
```

## 🎨 Customization

### Brand Colors

Edit `tailwind.config.js` to customize City of Austin brand colors:

```js
colors: {
  brand: {
    navy: '#22254E',
    sky: '#009CDE',
    // ...
  }
}
```

### Giscus Comments

Update `_config.yml` with your GitHub repo details:

```yaml
giscus:
  repo: "crypticpy/third-spaces-gallery"
  repo_id: "R_xxxxx"
  category: "Design Feedback"
  category_id: "DIC_xxxxx"
```

## 📄 License

This project is part of the City of Austin's open-source initiatives.

## 🙏 Acknowledgments

- City of Austin RIDP Team
- Austin Youth Council
- All the amazing young designers who contributed!
