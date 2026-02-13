# Implementation Plan: Remix Feature UX Overhaul

Created: 2026-02-12
Status: PENDING APPROVAL

## Summary

Overhaul the remix ("Build") feature across 15 improvements in 4 phases. Phase 1 delivers 4 quick wins (Quick Look remix buttons, inline submit, Web Share API, copy updates). Phase 2 adds cart UX polish (FAB bottom sheet, gallery badges, composition guidance, pushState navigation). Phase 3 renames "Remix" → "Build" across the entire site. Phase 4 addresses architecture debt (script extraction, ModalController, gallery card feature-add).

## Scope

### In Scope

- Tier 1: Items 1-5 (Quick Look buttons, inline submit, reduced-motion check, copy update, Web Share API)
- Tier 2: Items 6-10 (FAB bottom sheet, gallery badges, rename, composition guidance, pushState)
- Tier 3: Items 11-12, 14 (script extraction, gallery card feature-add, ModalController)

### Out of Scope

- Item 13: Compact share URLs (requires Supabase Edge Function changes not in this repo)
- Item 15: JS bundling with esbuild (infrastructure change — separate initiative)
- Backend/database changes (Supabase migrations, Edge Functions)
- Test infrastructure setup (no existing tests; adding tests is a separate initiative)

## Prerequisites

- Working local dev environment: `npm run dev` serves site at localhost:4000
- Git working tree clean (only untracked `docs/third-spaces-app-requirements.md`)

## Parallel Execution Strategy

Work is split into 4 sequential phases. Within each phase, tasks run in parallel via Opus sub-agents with strict file ownership to prevent conflicts.

### File Ownership Matrix (All Phases)

| File                                 | Phase 1 Owner | Phase 2 Owner | Phase 3 Owner | Phase 4 Owner |
| ------------------------------------ | ------------- | ------------- | ------------- | ------------- |
| `_includes/submission-card.html`     | Agent 1A      | Agent 2B      | Agent 3A      | Agent 4B      |
| `_includes/quick-look-modal.html`    | Agent 1A      | —             | Agent 3A      | —             |
| `assets/js/modal.js`                 | Agent 1A      | —             | Agent 3A      | Agent 4C      |
| `remix/index.html`                   | Agent 1B      | Agent 2C      | Agent 3A      | Agent 4A      |
| `_layouts/submission.html`           | Agent 1C      | —             | Agent 3A      | —             |
| `_layouts/default.html`              | —             | Agent 2A      | Agent 3A      | Agent 4A      |
| `assets/js/remix.js`                 | —             | Agent 2B      | Agent 3A      | —             |
| `assets/css/main.css`                | —             | Agent 2A      | Agent 3A      | —             |
| `_includes/home-hero.html`           | —             | —             | Agent 3A      | —             |
| `_layouts/gallery.html`              | —             | —             | Agent 3A      | Agent 4B      |
| `index.html`                         | —             | —             | Agent 3A      | —             |
| `transparency/index.html`            | —             | —             | Agent 3A      | —             |
| `assets/js/immersive.js`             | —             | —             | Agent 3A      | —             |
| `assets/js/remix-community.js`       | —             | —             | Agent 3A      | —             |
| `assets/js/transparency.js`          | —             | —             | Agent 3A      | —             |
| `tailwind.config.js`                 | —             | —             | —             | —             |
| NEW: `assets/js/remix-dashboard.js`  | —             | —             | —             | Agent 4A      |
| NEW: `assets/js/modal-controller.js` | —             | —             | —             | Agent 4C      |

---

## Implementation Phases

### Phase 1: Quick Wins

**Objective**: Deliver the 4 highest-impact, lowest-effort improvements. (Item 3 — reduced motion — is already implemented via global catch-all at `main.css:1035-1043`, confirmed during exploration.)

**Parallel Tasks** (3 Opus sub-agents, no file conflicts):

#### Task 1A: Quick Look Modal Remix Buttons

**Owns**: `_includes/submission-card.html`, `_includes/quick-look-modal.html`, `assets/js/modal.js`

**What to do**:

1. **Extend the JSON payload** in `submission-card.html` (after line 150, before the closing `}`):

   ```liquid
   "features": {{ include.submission.features | jsonify | default: "[]" }},
   "slug": {{ include.submission.slug | jsonify }}
   ```

   This adds the full `features` array (with `id`, `name`, `icon`) and `slug` to every card's embedded JSON.

2. **Add remix section to Quick Look modal** in `quick-look-modal.html` — insert between the tags `<ul>` (line 94) and the vote bar `<div>` (line 97). New HTML:

   ```html
   <!-- Remix features -->
   <div class="mt-4 hidden" data-ql-remix-section>
     <p class="text-sm font-semibold text-brand-navy dark:text-gray-100">
       Add to your build
     </p>
     <div class="mt-2 flex flex-wrap gap-2" data-ql-remix-chips>
       <!-- Feature chips injected by JS -->
     </div>
   </div>
   ```

3. **Wire up remix buttons in `modal.js`** — in the `openModal(data, openBtn)` function (around line 310):
   - Read `data.features` and `data.slug` from the parsed JSON
   - For each feature, create a `<button>` with `data-remix-add`, `data-remix-name`, `data-remix-icon`, `data-remix-source`, etc. — using the same attribute pattern as `_layouts/submission.html:123-137`
   - Check `window.TSGRemix.has(feature.id)` to set initial `is-added` state
   - Show/hide `[data-ql-remix-section]` based on whether `data.features` exists and has items
   - The click handler already works via global event delegation in `remix.js` on `[data-remix-add]` — no additional wiring needed

**Verification**:

- [ ] Quick Look modal shows remix chips when a design has `features` in its front matter
- [ ] Chips toggle `is-added` state correctly
- [ ] Fly-to-cart animation works from the modal
- [ ] Designs without `features` array show no remix section (graceful degradation)

---

#### Task 1B: Inline Submit + Copy Update + Remix Page Share

**Owns**: `remix/index.html`

**What to do**:

1. **Replace the submit modal with an inline form** in the Build tab. Currently the submit flow is: click "Submit My Remix" (line 183) → opens modal (`data-remix-modal`, lines 255-302) → fill name + note → click submit → opens confirmation modal (lines 305-397).

   New flow:
   - Remove the submit modal HTML (lines 255-302). Instead, add inline form fields directly into the Build tab, below the feature list and summary. Structure:
     ```html
     <div
       data-remix-inline-submit
       class="mt-6 hidden rounded-2xl border border-brand-purple/20 bg-brand-indigo/5 p-5"
     >
       <h3 class="text-base font-bold text-brand-navy dark:text-gray-100">
         Ready to submit?
       </h3>
       <div class="mt-3 flex items-center gap-2">
         <span class="text-sm text-brand-stone dark:text-gray-400">By</span>
         <input
           type="text"
           data-remix-author
           class="rounded-lg border border-brand-sky/20 bg-white px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-600"
           placeholder="Anonymous"
           maxlength="50"
           autocomplete="given-name"
         />
       </div>
       <textarea
         data-remix-note
         class="mt-3 w-full rounded-lg border border-brand-sky/20 bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600"
         placeholder="Anything to add? (optional)"
         rows="2"
         maxlength="500"
       ></textarea>
       <div class="mt-3 flex items-center justify-between">
         <span
           class="text-xs text-brand-stone dark:text-gray-500"
           data-remix-submit-remaining
         ></span>
         <button
           type="button"
           data-remix-submit-btn
           class="rounded-full bg-brand-sea px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-brand-sea/90 transition-colors"
         >
           Submit
         </button>
       </div>
     </div>
     ```
   - Show `data-remix-inline-submit` when cart has items (toggle in `updateStats()`)
   - Pre-fill author from `localStorage.getItem('tsg_remix_author')`
   - The "Submit My Remix" button at the bottom (line 183) should now scroll to the inline form and focus the submit button, not open a modal

2. **Update confirmation copy** (lines 305-397):
   - Change heading from `"Your Remix is ready to share!"` → `"Your build is live."`
   - Remove 🎉 emoji from the heading
   - Keep the reference number, share URL, and action buttons
   - Change "Start Fresh" button text to "Start a new build"
   - Update the share blurb text (JS around line 1338) from `"I remixed N features..."` → `"I built my dream Third Spaces app with N features from student designs! Check it out:"`

3. **Replace social share buttons with Web Share API**:
   - Remove the Instagram, TikTok, and Threads buttons from the confirmation modal (lines 338-377)
   - Replace with a single "Share" button that calls `navigator.share()` with fallback to clipboard copy:
     ```js
     if (navigator.share) {
       navigator.share({ title: 'My Third Spaces Build', text: blurb, url: shareUrl });
     } else {
       safeCopyToClipboard(blurb + '\n' + shareUrl, ...);
     }
     ```
   - Keep the "Copy Link" button as a secondary action

4. **Update the inline script** to wire up the new inline form instead of the modal open/close pattern.

**Verification**:

- [ ] Build tab shows inline submit form when cart has items
- [ ] Author field pre-fills from localStorage
- [ ] Submit button triggers `TSGRemix.submit()` and shows confirmation inline
- [ ] Confirmation shows "Your build is live." without emoji
- [ ] Share button uses Web Share API on mobile, clipboard on desktop
- [ ] No orphaned modal HTML or JS referencing removed elements

---

#### Task 1C: Submission Page Share Update

**Owns**: `_layouts/submission.html`

**What to do**:

1. **Replace social share buttons with Web Share API** in the share widget (lines 380-451):
   - Remove the Instagram (`data-share-instagram`), TikTok (`data-share-tiktok`), and Threads (`data-share-threads`) buttons
   - Keep the native share button (`data-share-native`) — it already uses `navigator.share()` with clipboard fallback (lines 558-576)
   - Keep the copy-link button (`data-share-copy`) as secondary
   - Simplify the share widget to just these two buttons

2. **Update the inline JS** (lines 553-662):
   - Remove the Instagram/TikTok/Threads click handlers (lines 635-660)
   - The `data-share-native` handler is already correct — keep as-is

**Verification**:

- [ ] Share widget shows "Share" + "Copy Link" buttons only
- [ ] Web Share API opens native share sheet on mobile
- [ ] Clipboard fallback works on desktop
- [ ] No broken event listeners for removed social buttons

---

**Phase 1 Verification** (after all 3 agents complete):

- [ ] `npm run build` succeeds
- [ ] `npm run dev` serves site without JS errors
- [ ] Quick Look modal shows remix chips
- [ ] Submit flow works inline without modal
- [ ] Share uses Web Share API

**Phase 1 Review Gate**:

- [ ] Run `final-review-completeness` agent
- [ ] Run `principal-code-reviewer` agent
- [ ] Address all critical/high issues before proceeding

---

### Phase 2: Cart UX & Visual Polish

**Objective**: Improve cart management, add visual indicators, and fix mobile navigation.

**Parallel Tasks** (3 Opus sub-agents, no file conflicts):

#### Task 2A: FAB Bottom Sheet

**Owns**: `_layouts/default.html`, `assets/css/main.css` (append new styles only)

**What to do**:

1. **Convert the FAB from `<a>` to `<button>`** (default.html, lines 265-284):
   - Change `<a href="{{ '/remix/' | relative_url }}"` to `<button type="button"`
   - Add click handler that opens an inline bottom sheet instead of navigating
   - Add `data-remix-fab-trigger` attribute

2. **Add bottom sheet HTML** after the FAB in `default.html` (inside the `{% unless page.url contains '/remix' %}` block):

   ```html
   <div
     data-remix-sheet
     class="fixed inset-x-0 bottom-0 z-50 hidden translate-y-full transition-transform duration-300 ease-out"
     role="dialog"
     aria-modal="true"
     aria-label="Your build"
   >
     <div
       data-remix-sheet-backdrop
       class="fixed inset-0 bg-black/30 backdrop-blur-sm"
     ></div>
     <div
       class="relative mx-auto w-full max-w-lg rounded-t-2xl bg-white shadow-2xl dark:bg-gray-900"
       style="max-height: 60vh; padding-bottom: env(safe-area-inset-bottom, 0px);"
     >
       <!-- Drag handle -->
       <div class="flex justify-center py-2">
         <div class="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600"></div>
       </div>
       <!-- Header -->
       <div class="flex items-center justify-between px-4 pb-2">
         <h3 class="text-base font-bold text-brand-navy dark:text-gray-100">
           Your Build
           <span
             class="text-sm font-normal text-brand-stone"
             data-remix-sheet-count
           ></span>
         </h3>
         <a
           href="{{ '/remix/' | relative_url }}"
           class="text-sm font-medium text-brand-indigo hover:underline dark:text-brand-sky"
         >
           Open full view →
         </a>
       </div>
       <!-- Feature chips (scrollable) -->
       <div
         class="overflow-y-auto px-4 pb-4"
         style="max-height: 40vh;"
         data-remix-sheet-list
       >
         <!-- Dynamically populated -->
       </div>
     </div>
   </div>
   ```

3. **Add inline `<script>` or extend existing inline scripts** in `default.html` to handle:
   - FAB click → open sheet (remove `translate-y-full`, add sheet to DOM flow)
   - Backdrop click or swipe down → close sheet
   - Populate `data-remix-sheet-list` with current cart features as removable chips (using `window.TSGRemix.getAll()`)
   - Each chip has a remove `×` button that calls `window.TSGRemix.remove(id)` and re-renders
   - Empty state: "No features yet. Browse designs to start building."

4. **Add CSS** to `main.css` (append at end):

   ```css
   /* Build sheet */
   [data-remix-sheet].is-open {
     transform: translateY(0);
   }
   [data-remix-sheet-backdrop] {
     opacity: 0;
     transition: opacity 0.3s;
   }
   [data-remix-sheet].is-open [data-remix-sheet-backdrop] {
     opacity: 1;
   }
   ```

5. **Keep the existing nav link** (`🧩 Remix` in the header) as a standard `<a>` to `/remix/` — the FAB becomes the sheet trigger, while the nav link still navigates to the full page.

**Verification**:

- [ ] FAB tap opens bottom sheet (not navigates to /remix/)
- [ ] Sheet shows current cart features with remove buttons
- [ ] Removing a feature updates the sheet and FAB count
- [ ] Backdrop click / escape closes the sheet
- [ ] "Open full view" link navigates to /remix/
- [ ] Empty state shows when cart is empty
- [ ] Safe area insets respected on notched phones

---

#### Task 2B: Gallery Card Badges + remix.js updateUI Extension

**Owns**: `_includes/submission-card.html`, `assets/js/remix.js`

**What to do**:

1. **Add a badge container to submission cards** (`submission-card.html`):
   - Insert a hidden badge element inside the card's cover image area (after line 52, before the designer badge div):
     ```html
     <!-- Build status badge -->
     <div
       class="absolute top-3 right-3 hidden items-center gap-1 rounded-full
                 bg-brand-sea/90 backdrop-blur-sm px-2.5 py-1
                 text-[11px] font-bold text-white shadow-sm"
       data-remix-card-badge
       data-remix-card-source="{{ include.submission.slug }}"
     >
       <span aria-hidden="true">🧩</span>
       <span data-remix-card-badge-count>0</span>
       <span>added</span>
     </div>
     ```

2. **Extend `updateUI()` in `remix.js`** to scan gallery cards:
   - After the existing FAB/nav count updates (around line 207), add a new section:
     ```js
     // Update gallery card badges
     document.querySelectorAll("[data-remix-card-badge]").forEach((badge) => {
       const source = badge.dataset.remixCardSource;
       const count = cart.filter(
         (item) => item.sourceSubmission === source,
       ).length;
       const countEl = badge.querySelector("[data-remix-card-badge-count]");
       if (count > 0) {
         badge.classList.remove("hidden");
         badge.classList.add("flex");
         countEl.textContent = count;
       } else {
         badge.classList.add("hidden");
         badge.classList.remove("flex");
       }
     });
     ```

**Verification**:

- [ ] Cards with features in the cart show a green badge with count (e.g., "🧩 3 added")
- [ ] Badge disappears when all features from that source are removed
- [ ] Badge updates in real-time when features are added/removed from any page
- [ ] No badge visible on cards with zero features in cart

---

#### Task 2C: Composition Guidance + history.pushState

**Owns**: `remix/index.html`

**What to do**:

1. **Add a progress/guidance indicator** to the Build tab, above the grouped feature list:

   ```html
   <div data-remix-progress class="mb-4 hidden">
     <div
       class="flex items-center justify-between text-xs text-brand-stone dark:text-gray-400"
     >
       <span data-remix-progress-label></span>
       <span data-remix-progress-count></span>
     </div>
     <div class="mt-1 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
       <div
         data-remix-progress-bar
         class="h-full rounded-full bg-brand-sea transition-all duration-300"
         style="width: 0%"
       ></div>
     </div>
   </div>
   ```

2. **Update `updateStats()` in the inline script** to populate the progress indicator:
   - Sweet spot is 3-8 features. Map count to percentage:
     - 0 features: hidden
     - 1-2: bar at 15-25%, label "Getting started"
     - 3-5: bar at 40-65%, label "Nice start" (bar turns green)
     - 6-8: bar at 75-100%, label "Looking great"
     - 9+: bar at 100%, label "Big build! Submit when ready."
   - Show the raw count: "N features from M designs"

3. **Add `history.pushState` for modals**:
   - When opening the submit confirmation, viz modal, or clear modal, push a state: `history.pushState({ modal: 'confirm' }, '')`
   - Listen for `popstate` event: if state has no `modal`, close any open modal
   - This makes the browser back button/gesture close modals instead of leaving the page

**Verification**:

- [ ] Progress bar appears when cart has 1+ items
- [ ] Labels update at 3, 6, 9 feature thresholds
- [ ] Bar fills proportionally to feature count
- [ ] Browser back button closes open modals
- [ ] Back button from no-modal state navigates normally
- [ ] Direct URL navigation with `?tab=` still works

---

**Phase 2 Verification**:

- [ ] `npm run build` succeeds
- [ ] FAB bottom sheet opens/closes smoothly
- [ ] Gallery cards show badges correctly
- [ ] Progress bar guides composition
- [ ] Back button closes modals

**Phase 2 Review Gate**:

- [ ] Run `final-review-completeness` agent
- [ ] Run `principal-code-reviewer` agent
- [ ] Address all critical/high issues before proceeding

---

### Phase 3: Rename "Remix" → "Build"

**Objective**: Rename all user-facing "remix" text to "build" across the entire site. This is a single-agent phase because it touches nearly every file and must be internally consistent.

**Single Agent (Agent 3A)**
**Owns**: ALL files listed in the File Ownership Matrix for Phase 3

**What to do**:

1. **User-facing text replacements** (primary changes):

   | Location                                         | Old Text                                              | New Text                                                          |
   | ------------------------------------------------ | ----------------------------------------------------- | ----------------------------------------------------------------- |
   | Nav links (default.html)                         | `Remix`                                               | `Build`                                                           |
   | FAB label (default.html)                         | `My Remix`                                            | `My Build`                                                        |
   | FAB tooltip (default.html)                       | `Collect features you love...`                        | `Pick features you love from any design and build your dream app` |
   | FAB aria-label (default.html)                    | `View your remix`                                     | `View your build`                                                 |
   | Hero CTA (home-hero.html)                        | `Build a Remix`                                       | `Start Building`                                                  |
   | Homepage section (index.html)                    | `Remix It` / `Start Remixing`                         | `Build It` / `Start Building`                                     |
   | Gallery CTA (gallery.html)                       | `Mix & match features...`                             | Keep as-is (doesn't say "remix")                                  |
   | Gallery banner aria-label                        | `Dismiss remix banner`                                | `Dismiss build banner`                                            |
   | Submission page heading (submission.html)        | `Remix These Features`                                | `Build With These Features`                                       |
   | Submission page explainer                        | `What is Remix?` / `Your Remix is like a wishlist...` | `What is Build?` / `Your Build is like a wishlist...`             |
   | Remix page title (remix/index.html front matter) | `My Remix`                                            | `My Build`                                                        |
   | Remix page breadcrumb                            | `My Remix`                                            | `My Build`                                                        |
   | Remix page heading                               | `Your Remix`                                          | `Your Build`                                                      |
   | Remix page explainer                             | `What's a Remix?`                                     | `What's a Build?`                                                 |
   | Tabs: My Remixes → My Builds                     | `My Remixes`                                          | `My Builds`                                                       |
   | Tabs: Community → Community Builds               | `Community Remixes`                                   | `Community Builds`                                                |
   | Submit form                                      | `Submit My Remix`                                     | `Submit My Build`                                                 |
   | Confirmation                                     | `Your build is live.`                                 | (already updated in Phase 1)                                      |
   | Viz card heading                                 | `My Third Spaces Remix`                               | `My Third Spaces Build`                                           |
   | Transparency page                                | `Remix Cart` → `Build Cart`, etc.                     | Update all 6 occurrences                                          |
   | Immersive panel                                  | `Remix` label, `View Your Remix`                      | `Build` label, `View Your Build`                                  |

2. **JS string replacements**:
   - `remix.js`: Update aria-labels, error messages, toast text
   - `remix-community.js`: Update aria-labels, status messages ("No community remixes yet" → "No community builds yet")
   - `immersive.js`: Update panel title, labels, aria-labels
   - `transparency.js`: Update category names and descriptions
   - `remix/index.html` inline script: Update all user-facing strings

3. **Data attribute renaming** — DO NOT rename these in this phase:
   - `data-remix-*` attributes: Keep as-is (these are internal API, not user-facing)
   - `window.TSGRemix`: Keep as-is (renaming the global would break all consumers)
   - CSS class names: Keep as-is (`.remix-*`, `.immersive-remix-*`)
   - localStorage keys: Keep as-is (renaming would lose existing user data)
   - File names: Keep `remix.js`, `remix-community.js`, `remix/index.html` as-is

   **Rationale**: Renaming internal identifiers adds risk without user-facing benefit. The user sees "Build" everywhere; the code can still use `remix` internally.

4. **URL path**: The `/remix/` URL path stays as-is. Changing it would break bookmarks and shared URLs. The page title and heading will say "Build" but the URL remains `/remix/`.

**Verification**:

- [ ] No user-facing occurrence of "remix" (case-insensitive) remains in the rendered HTML — search the built `_site/` output
- [ ] All internal `data-remix-*` attributes, JS globals, and CSS classes still work
- [ ] Existing localStorage data (carts, submissions) is not lost
- [ ] `npm run build` succeeds
- [ ] All buttons, links, headings, and aria-labels use "build" terminology

**Phase 3 Review Gate**:

- [ ] Run `final-review-completeness` agent
- [ ] Run `principal-code-reviewer` agent
- [ ] Address all critical/high issues before proceeding

---

### Phase 4: Architecture Improvements

**Objective**: Reduce technical debt by extracting the inline script, creating a shared modal utility, and adding feature-add to gallery cards.

**Parallel Tasks** (3 Opus sub-agents):

#### Task 4A: Extract Inline Script to `remix-dashboard.js`

**Owns**: `remix/index.html` (lines 539-1613 inline script), NEW `assets/js/remix-dashboard.js`, `_layouts/default.html` (add script tag)

**What to do**:

1. **Extract the 1,074-line inline `<script>` block** from `remix/index.html` (lines 539-1613) into a new file `assets/js/remix-dashboard.js`.

2. **Wrap in an IIFE** to match the project's pattern:

   ```js
   (() => {
     "use strict";
     // ... extracted code ...
   })();
   ```

3. **Gate execution** so the script is safe to load on non-remix pages:

   ```js
   if (!document.querySelector("[data-remix-dashboard]")) return;
   ```

   Add `data-remix-dashboard` attribute to the main content div in `remix/index.html`.

4. **Add `<script defer>` tag** in `default.html` (after `remix-community.js`, before `lightbox.js`):

   ```html
   <script
     defer
     src="{{ '/assets/js/remix-dashboard.js' | relative_url }}"
   ></script>
   ```

5. **Replace the inline script block** in `remix/index.html` with just a `DOMContentLoaded` guard if needed, or nothing (since the external script with `defer` runs after parsing).

6. **Verify all `window.TSGRemix` monkey-patching** (the `updateUI` wrapper) still works with the new load order.

**Verification**:

- [ ] Build tab, My Builds tab, Community tab all render correctly
- [ ] Tab switching, modal open/close, submission flow all work
- [ ] `window.TSGRemix.updateUI` monkey-patch still triggers `renderGroupedList()` and `updateStats()`
- [ ] No inline `<script>` blocks remain in `remix/index.html` (only `<script type="application/json">` for data is OK)

---

#### Task 4B: Gallery Card Feature-Add

**Owns**: `_includes/submission-card.html`, `_layouts/gallery.html`

**What to do**:

1. **Add feature-add chips to submission cards** — insert in the card actions area (after line 129 in `submission-card.html`), only if the submission has a `features` array:

   ```html
   {% if include.submission.features %}
   <div class="border-t border-brand-sky/10 px-3 pb-3 dark:border-gray-700">
     <p class="text-xs font-medium text-brand-stone dark:text-gray-500 mb-1.5">
       Add to your build
     </p>
     <div class="flex flex-wrap gap-1.5">
       {% for feature in include.submission.features limit:4 %}
       <button
         type="button"
         class="tsg-chip text-xs py-1 px-2 hover:bg-teal-500/15 hover:border-teal-400"
         data-remix-add="{{ feature.id }}"
         data-remix-name="{{ feature.name }}"
         data-remix-icon="{{ feature.icon | default: '🎯' }}"
         data-remix-source="{{ include.submission.slug }}"
         data-remix-source-title="{{ include.submission.title }}"
         data-remix-source-thumbnail="{{ include.submission.cover_image | default: include.submission.thumbnail | relative_url }}"
         data-remix-source-designer="{{ include.submission.designer }}"
         data-remix-source-url="{{ include.submission.url | relative_url }}"
         aria-pressed="false"
       >
         <span aria-hidden="true">{{ feature.icon | default: '🎯' }}</span>
         <span>{{ feature.name }}</span>
         <span data-remix-label class="text-[10px] opacity-60">+</span>
       </button>
       {% endfor %} {% if include.submission.features.size > 4 %}
       <a
         href="{{ include.submission.url | relative_url }}"
         class="tsg-chip text-xs py-1 px-2 text-brand-indigo"
       >
         +{{ include.submission.features.size | minus: 4 }} more
       </a>
       {% endif %}
     </div>
   </div>
   {% endif %}
   ```

2. **No JS changes needed** — the existing global event delegation in `remix.js` on `[data-remix-add]` buttons already handles clicks anywhere on the page.

3. **Limit to 4 features** on the card to prevent card height explosion. Show "+N more" link to full design page.

**Verification**:

- [ ] Gallery cards show feature-add chips below the Quick Look button
- [ ] Chips toggle `is-added` state when clicked
- [ ] Fly-to-cart animation works from gallery cards
- [ ] Cards without `features` array show no extra section
- [ ] "+N more" link navigates to full design page

---

#### Task 4C: Shared ModalController

**Owns**: NEW `assets/js/modal-controller.js`, `assets/js/modal.js` (refactor)

**What to do**:

1. **Create `assets/js/modal-controller.js`** — a shared utility for modal lifecycle:

   ```js
   (() => {
     "use strict";
     class ModalController {
       constructor(el, options = {}) {
         this.el = el;
         this.panel = el.querySelector("[data-modal-panel]") || el.children[0];
         this.onClose = options.onClose || null;
         this.previousFocus = null;
         this._boundEscape = this._handleEscape.bind(this);
         this._boundBackdrop = this._handleBackdrop.bind(this);
       }
       open() {
         /* remove hidden, add flex, trap focus, push history state */
       }
       close() {
         /* add hidden, remove flex, release trap, restore focus */
       }
       isOpen() {
         /* check hidden class */
       }
       _trapFocus() {
         /* tab cycling logic */
       }
       _handleEscape(e) {
         /* close on Escape */
       }
       _handleBackdrop(e) {
         /* close on backdrop click */
       }
       destroy() {
         /* cleanup listeners */
       }
     }
     window.TSGModal = ModalController;
   })();
   ```

2. **Refactor `modal.js`** (Quick Look) to use `TSGModal` internally instead of its own open/close/trapFocus implementation. The public API `window.TSGQuickLook` stays the same.

3. **Add script tag** in `default.html` — must load BEFORE `modal.js`:

   ```html
   <script
     defer
     src="{{ '/assets/js/modal-controller.js' | relative_url }}"
   ></script>
   ```

4. **Do NOT refactor** the remix page modals in this phase (they'll be handled when `remix-dashboard.js` is mature). Just create the utility and prove it works with Quick Look.

**Verification**:

- [ ] Quick Look modal still opens/closes/traps focus correctly
- [ ] Escape key closes the modal
- [ ] Backdrop click closes the modal
- [ ] Focus returns to trigger element on close
- [ ] `window.TSGQuickLook` API unchanged
- [ ] `window.TSGModal` constructor available for future consumers

---

**Phase 4 Verification**:

- [ ] `npm run build` succeeds
- [ ] No inline script in remix/index.html
- [ ] Gallery cards have feature-add chips
- [ ] ModalController works with Quick Look
- [ ] All existing functionality preserved

**Phase 4 Review Gate**:

- [ ] Run `final-review-completeness` agent
- [ ] Run `principal-code-reviewer` agent
- [ ] Address all critical/high issues before proceeding

---

## Final Deliverable Review

**MANDATORY**: After all phases complete, run both review agents on the ENTIRE deliverable:

1. `final-review-completeness` — Full codebase scan for incomplete items, TODOs, placeholders
2. `principal-code-reviewer` — Comprehensive quality assessment against project standards

## Testing Strategy

**No automated tests exist in this project.** All verification is manual.

### Manual Testing Checklist (per phase):

1. `npm run build` completes without errors
2. `npm run dev` serves at localhost:4000 without console errors
3. Test on mobile viewport (375px width) in Chrome DevTools
4. Test the full journey: browse gallery → add features from Quick Look/gallery card/submission page → manage cart via FAB sheet → submit inline → share via Web Share API
5. Test edge cases: empty cart, full cart (20 items), 2-submission limit reached
6. Test reduced motion: enable `prefers-reduced-motion: reduce` in DevTools and verify no jarring animations
7. Test dark mode: toggle theme and verify all new elements respect dark mode
8. Verify keyboard navigation: Tab through new buttons, Enter to activate, Escape to close sheets/modals

### Accessibility Spot-Checks:

- All new interactive elements have `aria-label` or visible text
- `aria-pressed` toggles on feature-add buttons
- Focus trap works in bottom sheet
- Color contrast meets WCAG AA on all new text

## Rollback Plan

Each phase will be committed separately with a descriptive commit message. To roll back:

- `git revert <phase-commit-hash>` for any individual phase
- Phases are designed to be independently revertable (no cross-phase dependencies except the rename in Phase 3 which depends on Phase 1-2 copy being finalized)

## Risks and Mitigations

| Risk                                                               | Likelihood | Impact | Mitigation                                                                                    |
| ------------------------------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------------- |
| Quick Look JSON payload size increase from adding `features` array | Low        | Low    | Each submission has 3-6 features; adds ~200 bytes per card. Negligible on modern connections. |
| FAB bottom sheet conflicting with existing FAB CSS/animations      | Medium     | Medium | Test thoroughly on mobile. The sheet is a sibling element, not nested.                        |
| Rename phase missing an occurrence of "remix"                      | Medium     | Low    | Post-rename, grep the built `_site/` directory for any remaining "remix" in rendered HTML.    |
| `remix-dashboard.js` load order issues after extraction            | Medium     | High   | Gate execution on `[data-remix-dashboard]` presence. Test monkey-patching of `updateUI`.      |
| File conflicts if phases overlap                                   | Low        | High   | Strict sequential phases with review gates. No phase starts until previous passes review.     |
| Breaking existing localStorage cart data                           | Low        | High   | DO NOT rename localStorage keys. Existing carts continue working.                             |
| Gallery card height increase from feature-add chips                | Medium     | Medium | Limit to 4 chips with "+N more" overflow. Test grid layout with varying chip counts.          |

## Open Questions

1. **Rename scope for non-user-facing code**: The plan keeps internal identifiers (`data-remix-*`, `window.TSGRemix`, CSS classes, file names) as "remix." Should these be renamed too for consistency, or is the user-facing rename sufficient?

2. **FAB bottom sheet vs. popover**: The plan uses a bottom sheet. An alternative is a small popover/tooltip anchored to the FAB showing a compact chip list. Which interaction pattern does the team prefer?

3. **Submission limit messaging**: Currently "2 remix submissions" — should the limit change alongside the rename, or should submissions be unlimited?

4. **Phase 3 timing**: The rename touches nearly every file. Should it happen as Phase 3 (after UX changes stabilize) or be deferred to a separate PR to reduce diff noise?

---

**USER: Please review this plan. Edit any section directly, then confirm to proceed.**
