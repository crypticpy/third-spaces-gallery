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
    this.navArrows = document.querySelector("[data-nav-arrows]");
    this.onboarding = document.querySelector("[data-onboarding]");

    // Header elements (title and designer)
    this.headerTitle = document.querySelector("[data-header-title]");
    this.headerDesigner = document.querySelector("[data-header-designer]");

    // Footer elements (votes and dots)
    this.globalFooter = document.querySelector("[data-immersive-footer]");
    this.footerVotes = document.querySelector("[data-footer-votes]");
    this.footerDots = document.querySelector("[data-footer-dots]");

    this.submissions = [];
    this.filteredSubmissions = [];
    this.currentDesignIndex = 0;
    this.currentScreenIndexes = {}; // Track per-design screen position

    // Filter state - default to shuffle for fair random order
    this.filters = {
      collection: "all",
      features: [],
      sort: "shuffle",
    };

    // UI state
    this.isActive = false;
    this.isFilterOpen = false;
    this.isInitializing = false; // Prevent clone jumps during init

    // Viewed tracking (persisted in localStorage)
    this.viewedDesigns = this.loadViewedDesigns();

    // For scroll position tracking
    this.designObserver = null;
    this.screenObservers = new Map();

    // Auto-hide timers for nav arrows
    this.navArrowTimer = null;
    this.uiVisible = true;
  }

  /**
   * Load viewed designs from localStorage
   */
  loadViewedDesigns() {
    try {
      const stored = localStorage.getItem("tsg_viewed_designs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  }

  /**
   * Save viewed designs to localStorage
   */
  saveViewedDesigns() {
    try {
      localStorage.setItem(
        "tsg_viewed_designs",
        JSON.stringify([...this.viewedDesigns]),
      );
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Mark a design as viewed
   */
  markAsViewed(designId) {
    if (!this.viewedDesigns.has(designId)) {
      this.viewedDesigns.add(designId);
      this.saveViewedDesigns();
      this.updateNavigation();
    }
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

    // Set initializing flag before observers to prevent clone jumps
    this.isInitializing = true;

    // Set up scroll observers
    this.setupScrollObservers();

    // Check if we should auto-activate
    if (ImmersiveGallery.shouldShowImmersive()) {
      // Check localStorage for user preference
      const pref = localStorage.getItem("tsg_view_mode");
      if (pref !== "grid") {
        this.activate();
        this.checkOnboarding();
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
      // Shuffle for random order on each load - no design gets favoritism
      this.shuffleArray(this.submissions);
    } catch (e) {
      console.error("[ImmersiveGallery] Failed to parse submissions JSON:", e);
    }
  }

  /**
   * Fisher-Yates shuffle for random order
   */
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
    // For shuffle, return copy of pre-shuffled array (shuffled at load time)
    if (this.filters.sort === "shuffle") {
      return [...submissions];
    }

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
   * Render all design slides with clones for infinite loop
   * Clone structure: [clone-last] [real items...] [clone-first]
   * This enables seamless TikTok-style infinite scrolling
   */
  renderDesigns() {
    if (!this.designStack) return;

    const total = this.filteredSubmissions.length;
    if (total === 0) {
      this.designStack.innerHTML = "";
      return;
    }

    // Render real slides
    const realSlides = this.filteredSubmissions
      .map((sub, index) => this.renderDesignSlide(sub, index, false))
      .join("");

    // Clone first slide at end (for looping forward)
    const cloneFirst = this.renderDesignSlide(
      this.filteredSubmissions[0],
      total, // index after last real
      true, // isClone
      0, // cloneOf (index of original)
    );

    // Clone last slide at beginning (for looping backward)
    const cloneLast = this.renderDesignSlide(
      this.filteredSubmissions[total - 1],
      -1, // special index for clone at start
      true, // isClone
      total - 1, // cloneOf
    );

    this.designStack.innerHTML = cloneLast + realSlides + cloneFirst;

    // Update total count (only real designs)
    const totalEl = document.querySelector("[data-total-designs]");
    if (totalEl) {
      totalEl.textContent = total;
    }

    // Initial scroll position is set in activate() when gallery becomes visible
  }

  /**
   * Check if onboarding should be shown
   */
  checkOnboarding() {
    const hasSeenOnboarding = localStorage.getItem("tsg_onboarding_complete");
    if (!hasSeenOnboarding && this.onboarding) {
      this.onboarding.hidden = false;

      // Bind dismiss handler directly (belt and suspenders)
      const dismissHandler = () => {
        this.dismissOnboarding();
        this.onboarding.removeEventListener("click", dismissHandler);
      };
      this.onboarding.addEventListener("click", dismissHandler);
    }
  }

  /**
   * Dismiss onboarding overlay
   */
  dismissOnboarding() {
    if (this.onboarding) {
      this.onboarding.hidden = true;
    }
    localStorage.setItem("tsg_onboarding_complete", "true");
    console.log("[ImmersiveGallery] Onboarding dismissed");
  }

  /**
   * Update navigation state (called when design changes)
   */
  updateNavigation() {
    // Update global footer/header
    this.updateGlobalFooter();

    // Show nav arrows briefly
    this.showUI();
    this.scheduleUIHide();
  }

  /**
   * Update the header and footer with current design info
   */
  updateGlobalFooter() {
    const submission = this.filteredSubmissions[this.currentDesignIndex];
    if (!submission) return;

    // Update header title and designer
    if (this.headerTitle) {
      this.headerTitle.textContent = submission.title || "";
    }
    if (this.headerDesigner) {
      const grade = submission.grade
        ? ` • ${submission.grade.split(" ")[0]}`
        : "";
      this.headerDesigner.textContent = `by ${submission.designer || "Unknown"}${grade}`;
    }

    // Update vote buttons
    if (this.footerVotes) {
      this.footerVotes.innerHTML = `
        <button type="button" class="quick-vote-btn" data-vote="favorite" data-submission-id="${submission.id}" aria-label="Vote I'd use this">
          <span class="vote-emoji">💖</span>
          <span class="vote-label">I'd use this</span>
          <span class="vote-count" data-vote-count="favorite">${submission.votes?.favorite || 0}</span>
        </button>
        <button type="button" class="quick-vote-btn" data-vote="innovative" data-submission-id="${submission.id}" aria-label="Vote Creative">
          <span class="vote-emoji">✨</span>
          <span class="vote-label">Creative</span>
          <span class="vote-count" data-vote-count="innovative">${submission.votes?.innovative || 0}</span>
        </button>
        <button type="button" class="quick-vote-btn" data-vote="inclusive" data-submission-id="${submission.id}" aria-label="Vote For everyone">
          <span class="vote-emoji">🌍</span>
          <span class="vote-label">For everyone</span>
          <span class="vote-count" data-vote-count="inclusive">${submission.votes?.inclusive || 0}</span>
        </button>
      `;
    }

    // Update screen dots
    if (this.footerDots) {
      const screens = submission.screens || [];
      const screenCount = screens.length + 1; // +1 for details slide
      const currentScreen = this.currentScreenIndexes[submission.id] || 0;
      this.footerDots.innerHTML = this.renderScreenDots(screenCount);
      // Update active dot
      const dots = this.footerDots.querySelectorAll(".screen-dot");
      dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === currentScreen);
      });
    }
  }

  /**
   * Update only the global footer dots (for horizontal scroll updates)
   */
  updateGlobalFooterDots(activeIndex) {
    if (!this.footerDots) return;

    const dots = this.footerDots.querySelectorAll(".screen-dot");
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === activeIndex);
    });
  }

  /**
   * Show UI elements (nav arrows)
   */
  showUI() {
    if (this.navArrows) {
      this.navArrows.classList.add("visible");
    }
    this.uiVisible = true;
  }

  /**
   * Hide UI elements (nav arrows)
   */
  hideUI() {
    if (this.navArrows) {
      this.navArrows.classList.remove("visible");
    }
    this.uiVisible = false;
  }

  /**
   * Schedule UI to hide after delay
   */
  scheduleUIHide() {
    if (this.navArrowTimer) {
      clearTimeout(this.navArrowTimer);
    }
    this.navArrowTimer = setTimeout(() => {
      this.hideUI();
    }, 2000); // Hide after 2 seconds
  }

  /**
   * Render a single design slide
   */
  renderDesignSlide(submission, index, isClone = false, cloneOf = null) {
    const screens = submission.screens || [];

    return `
      <article class="design-slide${isClone ? " design-slide-clone" : ""}"
               data-design-slide
               data-design-index="${index}"
               data-design-id="${submission.designId}"
               ${isClone ? `data-clone-of="${cloneOf}"` : ""}>

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
              <span class="vote-label">I'd use this</span>
              <span class="vote-count" data-vote-count="favorite">${submission.votes?.favorite || 0}</span>
            </button>
            <button type="button"
                    class="quick-vote-btn"
                    data-vote="innovative"
                    data-submission-id="${submission.id}"
                    aria-label="Vote Creative">
              <span class="vote-emoji">✨</span>
              <span class="vote-label">Creative</span>
              <span class="vote-count" data-vote-count="innovative">${submission.votes?.innovative || 0}</span>
            </button>
            <button type="button"
                    class="quick-vote-btn"
                    data-vote="inclusive"
                    data-submission-id="${submission.id}"
                    aria-label="Vote For everyone">
              <span class="vote-emoji">🌍</span>
              <span class="vote-label">For everyone</span>
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

          <!-- Quick Feedback Tags -->
          <div class="details-feedback" data-feedback-section data-submission-id="${submission.id}">
            <p class="feedback-label">What do you think?</p>
            <div class="feedback-tags">
              <button type="button" class="feedback-tag" data-feedback-tag="easy-to-use">
                👍 Easy to use
              </button>
              <button type="button" class="feedback-tag" data-feedback-tag="looks-great">
                🎨 Looks great
              </button>
              <button type="button" class="feedback-tag" data-feedback-tag="solves-problem">
                💡 Solves a problem
              </button>
              <button type="button" class="feedback-tag" data-feedback-tag="would-share">
                📤 Would share
              </button>
            </div>
            <p class="feedback-thanks" data-feedback-thanks hidden>Thanks for your feedback! 🎉</p>
          </div>

          <div class="details-actions">
            <button type="button"
                    class="details-btn details-btn-remix"
                    data-add-remix
                    data-submission-id="${submission.id}"
                    data-submission-title="${this.escapeHtml(submission.title)}">
              <span aria-hidden="true">🎨</span>
              Add to Remix
            </button>
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

    // Nav arrow clicks
    document.querySelector("[data-nav-up]")?.addEventListener("click", () => {
      this.navigateDesign(-1);
    });
    document.querySelector("[data-nav-down]")?.addEventListener("click", () => {
      this.navigateDesign(1);
    });

    // Onboarding dismiss - click button OR anywhere on overlay
    this.onboarding?.addEventListener("click", () => {
      this.dismissOnboarding();
    });

    // Feedback tag clicks (delegated)
    this.designStack?.addEventListener("click", (e) => {
      const tag = e.target.closest("[data-feedback-tag]");
      if (tag) {
        this.handleFeedbackTag(tag);
      }

      const remixBtn = e.target.closest("[data-add-remix]");
      if (remixBtn) {
        this.handleAddToRemix(remixBtn);
      }
    });

    // Show UI on any touch/scroll interaction
    this.designStack?.addEventListener(
      "touchstart",
      () => {
        this.showUI();
        this.scheduleUIHide();
      },
      { passive: true },
    );

    this.designStack?.addEventListener(
      "scroll",
      () => {
        this.showUI();
        this.scheduleUIHide();
      },
      { passive: true },
    );

    // Touch event handling for overscroll loop detection
    this.setupTouchLoopDetection();
  }

  /**
   * Handle feedback tag click
   */
  handleFeedbackTag(tag) {
    const section = tag.closest("[data-feedback-section]");
    const submissionId = section?.dataset.submissionId;
    const tagValue = tag.dataset.feedbackTag;

    if (!submissionId || !tagValue) return;

    // Toggle selected state
    tag.classList.toggle("selected");

    // Store feedback in localStorage
    const feedbackKey = `tsg_feedback_${submissionId}`;
    const existing = JSON.parse(localStorage.getItem(feedbackKey) || "[]");

    if (tag.classList.contains("selected")) {
      if (!existing.includes(tagValue)) {
        existing.push(tagValue);
      }
    } else {
      const idx = existing.indexOf(tagValue);
      if (idx > -1) existing.splice(idx, 1);
    }

    localStorage.setItem(feedbackKey, JSON.stringify(existing));

    // Show thanks message briefly if any tags selected
    const thanks = section?.querySelector("[data-feedback-thanks]");
    if (thanks && existing.length > 0) {
      thanks.hidden = false;
      setTimeout(() => {
        thanks.hidden = true;
      }, 2000);
    }

    console.log("[ImmersiveGallery] Feedback:", submissionId, existing);
  }

  /**
   * Handle Add to Remix button click
   */
  handleAddToRemix(btn) {
    const submissionId = btn.dataset.submissionId;
    const submissionTitle = btn.dataset.submissionTitle;

    if (!submissionId) return;

    // Get current remix from localStorage
    const remixKey = "tsg_remix";
    const remix = JSON.parse(localStorage.getItem(remixKey) || "[]");

    // Check if already in remix
    const existingIdx = remix.findIndex((r) => r.id === submissionId);

    if (existingIdx > -1) {
      // Remove from remix
      remix.splice(existingIdx, 1);
      btn.classList.remove("in-remix");
      btn.innerHTML = '<span aria-hidden="true">🎨</span> Add to Remix';
    } else {
      // Add to remix
      remix.push({
        id: submissionId,
        title: submissionTitle,
        addedAt: Date.now(),
      });
      btn.classList.add("in-remix");
      btn.innerHTML = '<span aria-hidden="true">✓</span> In Your Remix';
    }

    localStorage.setItem(remixKey, JSON.stringify(remix));

    // Update remix count in header if visible
    const remixTotal = document.querySelector("[data-remix-total]");
    if (remixTotal) {
      remixTotal.textContent = remix.length;
    }

    console.log("[ImmersiveGallery] Remix:", remix.length, "items");
  }

  /**
   * Go directly to a specific design index
   */
  goToDesign(index) {
    if (index < 0 || index >= this.filteredSubmissions.length) return;

    const slide = this.designStack?.querySelector(
      `[data-design-index="${index}"]:not([data-clone-of])`,
    );
    if (slide) {
      slide.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /**
   * Clean up existing observers and listeners
   */
  cleanupObservers() {
    if (this.designObserver) {
      this.designObserver.disconnect();
      this.designObserver = null;
    }

    this.screenObservers.forEach((observer) => observer.disconnect());
    this.screenObservers.clear();
  }

  /**
   * Set up touch event detection for overscroll looping
   * Detects swipe-up at top and swipe-left at left edge
   */
  setupTouchLoopDetection() {
    if (!this.designStack) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;

    // Vertical overscroll detection on design stack
    this.designStack.addEventListener(
      "touchstart",
      (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      },
      { passive: true },
    );

    this.designStack.addEventListener(
      "touchend",
      (e) => {
        if (!this.isActive) return;

        const touchEndY = e.changedTouches[0].clientY;
        const deltaY = touchStartY - touchEndY;
        const elapsed = Date.now() - touchStartTime;

        // Detect upward swipe at top (delta > 50px, quick swipe < 300ms)
        // Scroll to the clone of the last slide (at index -1)
        if (deltaY < -50 && elapsed < 300 && this.designStack.scrollTop <= 5) {
          const cloneAtStart = this.designStack.querySelector(
            '[data-design-index="-1"]',
          );
          if (cloneAtStart) {
            // Scroll to clone, observer will instantly jump to real last slide
            cloneAtStart.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      },
      { passive: true },
    );

    // Horizontal overscroll detection on each screen track
    this.designStack
      .querySelectorAll("[data-screen-track]")
      .forEach((track) => {
        track.addEventListener(
          "touchstart",
          (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();
          },
          { passive: true },
        );

        track.addEventListener(
          "touchend",
          (e) => {
            if (!this.isActive) return;

            const touchEndX = e.changedTouches[0].clientX;
            const deltaX = touchStartX - touchEndX;
            const elapsed = Date.now() - touchStartTime;

            // Detect leftward swipe at left edge (loop to end)
            // For horizontal, we use instant scroll to prevent rewind effect
            if (deltaX < -50 && elapsed < 300 && track.scrollLeft <= 5) {
              const screens = track.querySelectorAll("[data-screen-slide]");
              const lastScreen = screens[screens.length - 1];
              if (lastScreen) {
                lastScreen.scrollIntoView({
                  behavior: "instant",
                  inline: "start",
                });
              }
            }
          },
          { passive: true },
        );
      });
  }

  /**
   * Set up IntersectionObservers for scroll tracking
   */
  setupScrollObservers() {
    if (!this.designStack) return;

    // Clean up existing observers
    this.cleanupObservers();

    // Observer for vertical design scrolling with clone handling
    this.designObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const slide = entry.target;
            const index = parseInt(slide.dataset.designIndex, 10);
            const cloneOf = slide.dataset.cloneOf;
            const designId = slide.dataset.designId;

            // If this is a clone slide, instantly jump to the real one
            // But not during initialization to prevent unwanted jumps
            if (cloneOf !== undefined && !this.isInitializing) {
              const realIndex = parseInt(cloneOf, 10);
              const realSlide = this.designStack.querySelector(
                `[data-design-index="${realIndex}"]:not([data-clone-of])`,
              );
              if (realSlide) {
                // Instant jump (no animation) to create seamless loop
                realSlide.scrollIntoView({
                  behavior: "instant",
                  block: "start",
                });
                this.currentDesignIndex = realIndex;
                this.updateNavigation();
                // Mark the real slide as viewed
                const realDesignId = realSlide.dataset.designId;
                if (realDesignId) this.markAsViewed(realDesignId);
              }
              return;
            }

            // Regular slide - update tracking and mark as viewed
            this.currentDesignIndex = index;
            this.updateNavigation();
            if (designId) this.markAsViewed(designId);
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

    // Clone-based infinite scrolling is handled by the observer above
    // No need for boundary detection - clones handle the loop seamlessly
  }

  /**
   * Set up observer for horizontal screen scrolling within a slide
   */
  setupScreenObserver(slide) {
    const track = slide.querySelector("[data-screen-track]");
    if (!track) return;

    const designIndex = parseInt(slide.dataset.designIndex, 10);
    const designId = slide.dataset.designId;

    // Get the submission ID from the filtered list
    const submission = this.filteredSubmissions.find(
      (s) => s.designId === designId,
    );
    const submissionId = submission?.id;

    // Store screen index by submission ID for global footer lookup
    if (submissionId) {
      this.currentScreenIndexes[submissionId] = 0;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Get screen index from the slide's data attribute
            const screenIndex = parseInt(
              entry.target.dataset.screenIndex || "0",
              10,
            );

            // Store by submission ID
            if (submissionId) {
              this.currentScreenIndexes[submissionId] = screenIndex;
            }

            // Update per-slide dots (hidden but keeping for consistency)
            this.updateScreenDots(slide, screenIndex);

            // Update global footer dots if this is the current design
            if (
              designIndex === this.currentDesignIndex ||
              slide.dataset.cloneOf === String(this.currentDesignIndex)
            ) {
              this.updateGlobalFooterDots(screenIndex);
            }
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
   * Navigate designs (vertical) with infinite loop via clones
   */
  navigateDesign(direction) {
    const total = this.filteredSubmissions.length;
    if (total === 0) return;

    let targetIndex = this.currentDesignIndex + direction;

    // For looping, navigate to clone which will trigger instant jump
    if (targetIndex >= total) {
      // Going past last - scroll to clone at end (index = total)
      targetIndex = total;
    } else if (targetIndex < 0) {
      // Going before first - scroll to clone at start (index = -1)
      targetIndex = -1;
    }

    const slide = this.designStack.querySelector(
      `[data-design-index="${targetIndex}"]`,
    );
    slide?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /**
   * Navigate screens (horizontal) within current design with infinite loop
   */
  navigateScreen(direction) {
    const currentSlide = this.designStack.querySelector(
      `[data-design-index="${this.currentDesignIndex}"]`,
    );
    if (!currentSlide) return;

    const track = currentSlide.querySelector("[data-screen-track]");
    const screens = track?.querySelectorAll("[data-screen-slide]");
    if (!screens || screens.length === 0) return;

    const currentScreen =
      this.currentScreenIndexes[this.currentDesignIndex] || 0;
    const total = screens.length;

    // Wrap around for infinite looping
    let newScreen = currentScreen + direction;
    if (newScreen >= total) {
      newScreen = 0; // Loop to first screen
    } else if (newScreen < 0) {
      newScreen = total - 1; // Loop to last screen (details)
    }

    screens[newScreen].scrollIntoView({
      behavior: "smooth",
      inline: "start",
    });
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

    const newSort = chip.dataset.sortFilter;

    // Re-shuffle when explicitly selecting shuffle (fresh random order)
    if (newSort === "shuffle") {
      this.shuffleArray(this.submissions);
    }

    this.filters.sort = newSort;
  }

  /**
   * Apply filters from UI state
   */
  applyFiltersFromUI() {
    this.applyFilters();
    this.renderDesigns();
    this.setupScrollObservers();
    this.setupTouchLoopDetection(); // Re-setup touch detection for new DOM
    this.currentDesignIndex = 0;
    this.updateNavigation(); // Update UI for new filtered set

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

    // Scroll to first real slide (skip clone at beginning)
    // Must happen after container is visible for scroll to work
    // Use setTimeout to ensure layout is complete
    setTimeout(() => {
      const firstReal = this.designStack?.querySelector(
        '[data-design-index="0"]',
      );
      if (firstReal) {
        firstReal.scrollIntoView({ behavior: "instant", block: "start" });
        this.currentDesignIndex = 0;
        this.updateNavigation();
      }
      // Clear flag after scroll settles to enable clone jump behavior
      setTimeout(() => {
        this.isInitializing = false;
      }, 100);
    }, 50);

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
