/**
 * Third Spaces Gallery - Immersive View Controller
 *
 * Full-screen swipe-based design viewer for mobile/tablet devices.
 * Desktop users can opt-in via "Immersive View" button.
 *
 * Navigation:
 * - Vertical swipe: Navigate between designs
 * - Horizontal swipe: Navigate screens within each design
 */

class ImmersiveGallery {
  constructor() {
    this.container = document.querySelector("[data-immersive-gallery]");
    this.designStack = document.querySelector("[data-design-stack]");
    this.filterPanel = document.querySelector("[data-filter-panel]");
    this.swipeHint = document.querySelector("[data-swipe-hint]");

    this.submissions = [];
    this.filteredSubmissions = [];
    this.currentDesignIndex = 0;
    this.currentScreenIndexes = {}; // Track per-design screen position

    // Filter state
    this.filters = {
      collection: "all",
      features: [],
      sort: "recent",
    };

    // UI state
    this.isActive = false;
    this.isFilterOpen = false;

    // For scroll position tracking
    this.designObserver = null;
    this.screenObservers = new Map();
  }

  /**
   * Detect if we should show immersive mode by default
   */
  static shouldShowImmersive() {
    // Check for touch capability
    const isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Check user agent for mobile/tablet
    const ua = navigator.userAgent;
    const mobileUA =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
        ua,
      );

    // Check if it's a touch device with reasonable screen size
    const touchWithSmallScreen = isTouchDevice && window.innerWidth <= 1024;

    // Return true for mobile/tablet devices
    return mobileUA || touchWithSmallScreen;
  }

  /**
   * Initialize the immersive gallery
   */
  init() {
    if (!this.container) {
      console.warn("[ImmersiveGallery] Container not found");
      return;
    }

    // Load submission data from embedded JSON
    this.loadSubmissions();

    if (this.submissions.length === 0) {
      console.warn("[ImmersiveGallery] No submissions found");
      return;
    }

    // Apply initial filters
    this.applyFilters();

    // Render the design stack
    this.renderDesigns();

    // Bind events
    this.bindEvents();

    // Set up scroll observers
    this.setupScrollObservers();

    // Check if we should auto-activate
    if (ImmersiveGallery.shouldShowImmersive()) {
      // Check localStorage for user preference
      const pref = localStorage.getItem("tsg_view_mode");
      if (pref !== "grid") {
        this.activate();
        this.showSwipeHint();
      }
    }

    console.log(
      "[ImmersiveGallery] Initialized with",
      this.submissions.length,
      "submissions",
    );
  }

  /**
   * Load submissions from embedded JSON
   */
  loadSubmissions() {
    const jsonScript = document.querySelector("[data-submissions-json]");
    if (!jsonScript) return;

    try {
      this.submissions = JSON.parse(jsonScript.textContent);
    } catch (e) {
      console.error("[ImmersiveGallery] Failed to parse submissions JSON:", e);
    }
  }

  /**
   * Apply current filters to submissions
   */
  applyFilters() {
    let filtered = [...this.submissions];

    // Filter by features
    if (this.filters.features.length > 0) {
      filtered = filtered.filter((sub) => {
        if (!sub.featureFocus) return false;
        return this.filters.features.some((f) => sub.featureFocus.includes(f));
      });
    }

    // Sort
    filtered = this.sortSubmissions(filtered);

    this.filteredSubmissions = filtered;
  }

  /**
   * Sort submissions based on current sort setting
   */
  sortSubmissions(submissions) {
    return [...submissions].sort((a, b) => {
      switch (this.filters.sort) {
        case "popular": {
          const aTotal =
            (a.votes?.favorite || 0) +
            (a.votes?.innovative || 0) +
            (a.votes?.inclusive || 0);
          const bTotal =
            (b.votes?.favorite || 0) +
            (b.votes?.innovative || 0) +
            (b.votes?.inclusive || 0);
          return bTotal - aTotal;
        }
        case "innovative":
          return (b.votes?.innovative || 0) - (a.votes?.innovative || 0);
        case "recent":
        default:
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });
  }

  /**
   * Render all design slides
   */
  renderDesigns() {
    if (!this.designStack) return;

    this.designStack.innerHTML = this.filteredSubmissions
      .map((sub, index) => this.renderDesignSlide(sub, index))
      .join("");

    // Update total count
    const totalEl = document.querySelector("[data-total-designs]");
    if (totalEl) {
      totalEl.textContent = this.filteredSubmissions.length;
    }
  }

  /**
   * Render a single design slide
   */
  renderDesignSlide(submission, index) {
    const screens = submission.screens || [];

    return `
      <article class="design-slide"
               data-design-slide
               data-design-index="${index}"
               data-design-id="${submission.designId}">

        <!-- Horizontal screen track -->
        <div class="screen-track" data-screen-track>
          ${screens.map((screen, si) => this.renderScreenSlide(screen, si)).join("")}
          ${this.renderDetailsSlide(submission)}
        </div>

        <!-- Persistent footer -->
        <footer class="slide-footer">
          <div class="slide-meta">
            <h2 class="slide-title">${this.escapeHtml(submission.title)}</h2>
            <p class="slide-designer">by ${this.escapeHtml(submission.designer)}${submission.grade ? ` • ${submission.grade.split(" ")[0]}` : ""}</p>
          </div>

          <div class="quick-votes" data-quick-votes>
            <button type="button"
                    class="quick-vote-btn"
                    data-vote="favorite"
                    data-submission-id="${submission.id}"
                    aria-label="Vote I'd use this">
              <span class="vote-emoji">💖</span>
              <span class="vote-count" data-vote-count="favorite">${submission.votes?.favorite || 0}</span>
            </button>
            <button type="button"
                    class="quick-vote-btn"
                    data-vote="innovative"
                    data-submission-id="${submission.id}"
                    aria-label="Vote Creative">
              <span class="vote-emoji">✨</span>
              <span class="vote-count" data-vote-count="innovative">${submission.votes?.innovative || 0}</span>
            </button>
            <button type="button"
                    class="quick-vote-btn"
                    data-vote="inclusive"
                    data-submission-id="${submission.id}"
                    aria-label="Vote For everyone">
              <span class="vote-emoji">🌍</span>
              <span class="vote-count" data-vote-count="inclusive">${submission.votes?.inclusive || 0}</span>
            </button>
          </div>

          <div class="screen-dots" data-screen-dots>
            ${this.renderScreenDots(screens.length + 1)}
          </div>
        </footer>
      </article>
    `;
  }

  /**
   * Render a screen slide
   */
  renderScreenSlide(screen, index) {
    return `
      <div class="screen-slide" data-screen-slide data-screen-index="${index}">
        <div class="screen-image-container">
          <img class="screen-image"
               src="${screen.src}"
               alt="${this.escapeHtml(screen.alt || "Design screen")}"
               loading="lazy"
               decoding="async">
        </div>
        ${screen.caption ? `<p class="screen-caption">${this.escapeHtml(screen.caption)}</p>` : ""}
      </div>
    `;
  }

  /**
   * Render the details slide (last in horizontal track)
   */
  renderDetailsSlide(submission) {
    const features = submission.featureFocus || [];

    return `
      <div class="screen-slide details-slide" data-screen-slide data-details-slide>
        <div class="details-content">
          <h3 class="details-title">About this design</h3>

          ${submission.summary ? `<p class="details-summary">${this.escapeHtml(submission.summary)}</p>` : ""}

          ${
            submission.creatorNote
              ? `
            <blockquote class="details-quote">
              <p>"${this.escapeHtml(submission.creatorNote)}"</p>
              <cite>— ${this.escapeHtml(submission.designer)}</cite>
            </blockquote>
          `
              : ""
          }

          ${
            features.length > 0
              ? `
            <div class="details-tags">
              ${features.map((f) => `<span class="detail-tag">${this.escapeHtml(f)}</span>`).join("")}
            </div>
          `
              : ""
          }

          <div class="details-actions">
            <a href="${submission.url}" class="details-btn details-btn-primary">
              View Full Page
              <span aria-hidden="true">→</span>
            </a>
            ${
              submission.demoUrl
                ? `
              <a href="${submission.demoUrl}"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="details-btn details-btn-secondary">
                Try Demo
                <span aria-hidden="true">↗</span>
              </a>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render screen navigation dots
   */
  renderScreenDots(count) {
    return Array.from(
      { length: count },
      (_, i) =>
        `<span class="screen-dot${i === 0 ? " active" : ""}" data-dot-index="${i}"></span>`,
    ).join("");
  }

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Filter toggle
    document
      .querySelector("[data-filter-toggle]")
      ?.addEventListener("click", () => {
        this.toggleFilterPanel();
      });

    // Click outside filter panel to close (on the design stack area)
    this.designStack?.addEventListener("click", (e) => {
      if (this.isFilterOpen && !e.target.closest("[data-filter-panel]")) {
        this.closeFilterPanel();
      }
    });

    // Exit immersive (desktop)
    document
      .querySelector("[data-exit-immersive]")
      ?.addEventListener("click", () => {
        this.deactivate();
      });

    // Enter immersive (desktop button)
    document
      .querySelector("[data-enter-immersive]")
      ?.addEventListener("click", () => {
        this.activate();
      });

    // Filter panel clicks (delegated for all interactions)
    this.filterPanel?.addEventListener("click", (e) => {
      // Close button - check first!
      if (e.target.closest("[data-close-filter]")) {
        e.stopPropagation();
        this.closeFilterPanel();
        return;
      }

      // Apply button
      if (e.target.closest("[data-apply-filter]")) {
        e.stopPropagation();
        this.applyFiltersFromUI();
        this.closeFilterPanel();
        return;
      }

      // Filter chips
      const chip = e.target.closest(
        "[data-collection-filter], [data-feature-filter], [data-sort-filter]",
      );
      if (!chip) return;

      if (chip.dataset.collectionFilter) {
        this.selectCollectionFilter(chip);
      } else if (chip.dataset.featureFilter) {
        this.toggleFeatureFilter(chip);
      } else if (chip.dataset.sortFilter) {
        this.selectSortFilter(chip);
      }
    });

    // Vote button clicks (delegated)
    this.designStack?.addEventListener("click", (e) => {
      const voteBtn = e.target.closest("[data-vote]");
      if (voteBtn) {
        this.handleVote(voteBtn);
      }
    });

    // Screen dot clicks (delegated)
    this.designStack?.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-dot-index]");
      if (dot) {
        const slide = dot.closest("[data-design-slide]");
        const track = slide?.querySelector("[data-screen-track]");
        const index = parseInt(dot.dataset.dotIndex, 10);
        if (track) {
          this.scrollToScreen(track, index);
        }
      }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (!this.isActive) return;

      switch (e.key) {
        case "Escape":
          if (this.isFilterOpen) {
            this.closeFilterPanel();
          } else {
            this.deactivate();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          this.navigateDesign(-1);
          break;
        case "ArrowDown":
          e.preventDefault();
          this.navigateDesign(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          this.navigateScreen(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          this.navigateScreen(1);
          break;
      }
    });
  }

  /**
   * Set up IntersectionObservers for scroll tracking
   */
  setupScrollObservers() {
    if (!this.designStack) return;

    // Observer for vertical design scrolling
    this.designObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = parseInt(entry.target.dataset.designIndex, 10);
            this.currentDesignIndex = index;
            this.updateCounter();
          }
        });
      },
      { threshold: 0.5 },
    );

    // Observe design slides and set up horizontal observers
    this.designStack
      .querySelectorAll("[data-design-slide]")
      .forEach((slide) => {
        this.designObserver.observe(slide);
        this.setupScreenObserver(slide);
      });
  }

  /**
   * Set up observer for horizontal screen scrolling within a slide
   */
  setupScreenObserver(slide) {
    const track = slide.querySelector("[data-screen-track]");
    if (!track) return;

    const designIndex = parseInt(slide.dataset.designIndex, 10);
    this.currentScreenIndexes[designIndex] = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const screenIndex = parseInt(
              (entry.target.dataset.screenIndex ??
                entry.target.dataset.detailsSlide)
                ? this.getScreenCount(slide)
                : 0,
              10,
            );
            this.currentScreenIndexes[designIndex] = screenIndex;
            this.updateScreenDots(slide, screenIndex);
          }
        });
      },
      { threshold: 0.5, root: track },
    );

    track.querySelectorAll("[data-screen-slide]").forEach((screenSlide, i) => {
      screenSlide.dataset.screenIndex = i;
      observer.observe(screenSlide);
    });

    this.screenObservers.set(designIndex, observer);
  }

  /**
   * Get count of screens in a slide
   */
  getScreenCount(slide) {
    return slide.querySelectorAll("[data-screen-slide]").length;
  }

  /**
   * Update the design counter
   */
  updateCounter() {
    const currentEl = document.querySelector("[data-current-design]");
    if (currentEl) {
      currentEl.textContent = this.currentDesignIndex + 1;
    }
  }

  /**
   * Update screen dots for a slide
   */
  updateScreenDots(slide, activeIndex) {
    const dots = slide.querySelectorAll("[data-dot-index]");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === activeIndex);
    });
  }

  /**
   * Navigate to a specific screen
   */
  scrollToScreen(track, index) {
    const screens = track.querySelectorAll("[data-screen-slide]");
    if (screens[index]) {
      screens[index].scrollIntoView({ behavior: "smooth", inline: "start" });
    }
  }

  /**
   * Navigate designs (vertical)
   */
  navigateDesign(direction) {
    const newIndex = Math.max(
      0,
      Math.min(
        this.filteredSubmissions.length - 1,
        this.currentDesignIndex + direction,
      ),
    );

    if (newIndex !== this.currentDesignIndex) {
      const slide = this.designStack.querySelector(
        `[data-design-index="${newIndex}"]`,
      );
      slide?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /**
   * Navigate screens (horizontal) within current design
   */
  navigateScreen(direction) {
    const currentSlide = this.designStack.querySelector(
      `[data-design-index="${this.currentDesignIndex}"]`,
    );
    if (!currentSlide) return;

    const track = currentSlide.querySelector("[data-screen-track]");
    const screens = track?.querySelectorAll("[data-screen-slide]");
    if (!screens) return;

    const currentScreen =
      this.currentScreenIndexes[this.currentDesignIndex] || 0;
    const newScreen = Math.max(
      0,
      Math.min(screens.length - 1, currentScreen + direction),
    );

    if (newScreen !== currentScreen) {
      screens[newScreen].scrollIntoView({
        behavior: "smooth",
        inline: "start",
      });
    }
  }

  /**
   * Handle vote button click
   */
  handleVote(button) {
    const category = button.dataset.vote;
    const submissionId = button.dataset.submissionId;

    // Delegate to the voting system if available
    if (window.votingSystem) {
      window.votingSystem.handleVote(submissionId, category, button);
    } else {
      // Fallback: trigger custom event
      document.dispatchEvent(
        new CustomEvent("immersive:vote", {
          detail: { submissionId, category, button },
        }),
      );
    }
  }

  /**
   * Toggle filter panel
   */
  toggleFilterPanel() {
    if (this.isFilterOpen) {
      this.closeFilterPanel();
    } else {
      this.openFilterPanel();
    }
  }

  /**
   * Open filter panel
   */
  openFilterPanel() {
    if (!this.filterPanel) return;
    this.filterPanel.hidden = false;
    this.isFilterOpen = true;

    const toggle = document.querySelector("[data-filter-toggle]");
    toggle?.setAttribute("aria-expanded", "true");

    // Trap focus
    this.filterPanel.querySelector("button")?.focus();
  }

  /**
   * Close filter panel
   */
  closeFilterPanel() {
    if (!this.filterPanel) return;
    this.filterPanel.hidden = true;
    this.isFilterOpen = false;

    const toggle = document.querySelector("[data-filter-toggle]");
    toggle?.setAttribute("aria-expanded", "false");
    toggle?.focus();
  }

  /**
   * Select collection filter
   */
  selectCollectionFilter(chip) {
    const chips = this.filterPanel.querySelectorAll("[data-collection-filter]");
    chips.forEach((c) => {
      c.classList.remove("active");
      c.setAttribute("aria-checked", "false");
    });
    chip.classList.add("active");
    chip.setAttribute("aria-checked", "true");
    this.filters.collection = chip.dataset.collectionFilter;
  }

  /**
   * Toggle feature filter
   */
  toggleFeatureFilter(chip) {
    const feature = chip.dataset.featureFilter;
    const isActive = chip.classList.contains("active");

    chip.classList.toggle("active", !isActive);
    chip.setAttribute("aria-pressed", (!isActive).toString());

    if (isActive) {
      this.filters.features = this.filters.features.filter(
        (f) => f !== feature,
      );
    } else {
      this.filters.features.push(feature);
    }
  }

  /**
   * Select sort filter
   */
  selectSortFilter(chip) {
    const chips = this.filterPanel.querySelectorAll("[data-sort-filter]");
    chips.forEach((c) => {
      c.classList.remove("active");
      c.setAttribute("aria-checked", "false");
    });
    chip.classList.add("active");
    chip.setAttribute("aria-checked", "true");
    this.filters.sort = chip.dataset.sortFilter;
  }

  /**
   * Apply filters from UI state
   */
  applyFiltersFromUI() {
    this.applyFilters();
    this.renderDesigns();
    this.setupScrollObservers();
    this.currentDesignIndex = 0;
    this.updateCounter();

    // Scroll to top
    this.designStack?.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Activate immersive mode
   */
  activate() {
    if (!this.container) return;

    this.container.hidden = false;
    this.isActive = true;
    document.body.style.overflow = "hidden";

    // Hide grid view
    const gridView = document.querySelector("[data-grid-view]");
    if (gridView) gridView.hidden = true;

    // Save preference
    localStorage.setItem("tsg_view_mode", "immersive");

    console.log("[ImmersiveGallery] Activated");
  }

  /**
   * Deactivate immersive mode
   */
  deactivate() {
    if (!this.container) return;

    this.container.hidden = true;
    this.isActive = false;
    document.body.style.overflow = "";

    // Show grid view
    const gridView = document.querySelector("[data-grid-view]");
    if (gridView) gridView.hidden = false;

    // Save preference
    localStorage.setItem("tsg_view_mode", "grid");

    console.log("[ImmersiveGallery] Deactivated");
  }

  /**
   * Show swipe hint briefly
   */
  showSwipeHint() {
    if (!this.swipeHint) return;

    // Only show once per session
    if (sessionStorage.getItem("tsg_swipe_hint_shown")) return;

    this.swipeHint.hidden = false;
    sessionStorage.setItem("tsg_swipe_hint_shown", "true");

    setTimeout(() => {
      this.swipeHint.hidden = true;
    }, 3000);
  }

  /**
   * Escape HTML for safe insertion
   */
  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

// Export for external access
window.ImmersiveGallery = ImmersiveGallery;

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const gallery = new ImmersiveGallery();
  gallery.init();
  window.immersiveGallery = gallery;
});
