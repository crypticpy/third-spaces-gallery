/**
 * Third Spaces Youth Design Gallery - Quick Look Modal Controller
 *
 * Mobile-native bottom sheet (swipeable preview + vote) that opens from gallery cards.
 * Desktop: centered modal.
 *
 * Features:
 * - Zero-latency open (reads JSON from card, no network fetch)
 * - Screen carousel with swipe + arrow key navigation
 * - Integrated voting (uses existing voting system)
 * - Focus trap for accessibility
 * - Respects prefers-reduced-motion
 */

(() => {
  const modal = document.getElementById("quicklook-modal");
  if (!modal) return;

  // Element references
  const panel = modal.querySelector("[data-ql-panel]");
  const titleEl = modal.querySelector("[data-ql-title]");
  const metaEl = modal.querySelector("[data-ql-meta]");
  const summaryEl = modal.querySelector("[data-ql-summary]");
  const tagsEl = modal.querySelector("[data-ql-tags]");
  const track = modal.querySelector("[data-ql-track]");
  const dots = modal.querySelector("[data-ql-dots]");
  const prevBtn = modal.querySelector("[data-ql-prev]");
  const nextBtn = modal.querySelector("[data-ql-next]");
  const openLink = modal.querySelector("[data-ql-open]");
  const demoLink = modal.querySelector("[data-ql-demo]");
  const shareBtn = modal.querySelector("[data-ql-share]");
  const toastEl = modal.querySelector("[data-ql-toast]");
  const closeBtn = modal.querySelector("[data-ql-close]");
  const backdrop = modal.querySelector("[data-ql-backdrop]");
  const voteContainer = modal.querySelector("[data-ql-vote-container]");

  // State
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focusableSelector =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  let lastActive = null;
  let currentData = null;
  let currentIndex = 0;
  let unbindKeydown = null;
  let scrollHandler = null;

  /**
   * Show a toast message
   */
  const setToast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg || "";
    if (msg) {
      setTimeout(() => {
        toastEl.textContent = "";
      }, 2500);
    }
  };

  /**
   * Clear all children from an element
   */
  const clearChildren = (el) => {
    while (el && el.firstChild) {
      el.removeChild(el.firstChild);
    }
  };

  /**
   * Set the vote key on all vote buttons in the modal
   */
  const setVoteKey = (voteKey) => {
    if (voteContainer) {
      voteContainer.dataset.submissionId = voteKey || "";
    }
  };

  /**
   * Set vote counts in the modal
   */
  const setVoteCounts = (votes) => {
    const safe = votes || {};
    const map = {
      favorite: safe.favorite ?? 0,
      innovative: safe.innovative ?? 0,
      inclusive: safe.inclusive ?? 0,
    };

    Object.entries(map).forEach(([category, count]) => {
      const btn = modal.querySelector(`[data-vote-category="${category}"]`);
      if (btn) {
        const countEl = btn.querySelector("[data-vote-count]");
        if (countEl) {
          countEl.textContent = String(count);
        }
      }
    });
  };

  /**
   * Render feature tags
   */
  const renderTags = (tags) => {
    clearChildren(tagsEl);
    (tags || []).slice(0, 6).forEach((tag) => {
      const li = document.createElement("li");
      li.className =
        "inline-flex items-center rounded-full bg-brand-sky/10 dark:bg-brand-sky/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-indigo dark:text-brand-sky";
      li.textContent = String(tag);
      tagsEl.appendChild(li);
    });
  };

  /**
   * Render screen carousel
   */
  const renderScreens = (screens) => {
    clearChildren(track);
    clearChildren(dots);

    const list = (screens || []).filter(Boolean);
    const used = list.slice(0, 5); // Max 5 screens in Quick Look

    used.forEach((screen, idx) => {
      const fig = document.createElement("figure");
      fig.className = "snap-start shrink-0 w-full";

      // Frame container
      const frame = document.createElement("div");
      frame.className =
        "overflow-hidden rounded-2xl border border-brand-sky/10 dark:border-gray-700 bg-brand-light-blue/30 dark:bg-gray-800";

      // Image
      const img = document.createElement("img");
      img.src = screen.src || screen;
      img.alt = screen.alt || "";
      img.decoding = "async";
      img.loading = idx === 0 ? "eager" : "lazy";
      img.className = "w-full h-auto object-contain";
      img.style.maxHeight = "50vh";

      // Handle image load errors gracefully
      img.addEventListener("error", () => {
        fig.style.display = "none";
        // Also hide corresponding dot
        const dotEl = dots.children[idx];
        if (dotEl) dotEl.style.display = "none";
      });

      frame.appendChild(img);
      fig.appendChild(frame);

      // Caption
      if (screen.caption) {
        const cap = document.createElement("figcaption");
        cap.className = "mt-2 text-sm text-brand-stone dark:text-gray-400";
        cap.textContent = screen.caption;
        fig.appendChild(cap);
      }

      track.appendChild(fig);

      // Dot button
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className =
        "h-2.5 w-2.5 rounded-full transition-colors bg-brand-cloud dark:bg-gray-600";
      dot.setAttribute("aria-label", `Go to screen ${idx + 1}`);
      dot.addEventListener("click", () => scrollToIndex(idx));
      dots.appendChild(dot);
    });

    currentIndex = 0;
    updateDots(0);
    updateArrows(0);

    // Start at beginning
    track.scrollLeft = 0;
  };

  /**
   * Update arrow button visibility based on current position
   */
  const updateArrows = (idx) => {
    const count = track.children.length;
    if (count <= 1) {
      if (prevBtn) {
        prevBtn.classList.add("hidden");
        prevBtn.classList.remove("sm:inline-flex");
      }
      if (nextBtn) {
        nextBtn.classList.add("hidden");
        nextBtn.classList.remove("sm:inline-flex");
      }
      return;
    }

    const atFirst = idx === 0;
    const atLast = idx === count - 1;

    if (prevBtn) {
      prevBtn.classList.toggle("hidden", atFirst);
      prevBtn.classList.toggle("sm:inline-flex", !atFirst);
    }
    if (nextBtn) {
      nextBtn.classList.toggle("hidden", atLast);
      nextBtn.classList.toggle("sm:inline-flex", !atLast);
    }
  };

  /**
   * Update dot indicators
   */
  const updateDots = (idx) => {
    const children = Array.from(dots.children);
    children.forEach((dot, i) => {
      dot.style.background =
        i === idx
          ? "rgb(var(--accent, 0 156 222))"
          : "rgb(var(--border, 198 197 196))";
      dot.setAttribute("aria-current", i === idx ? "true" : "false");
    });
  };

  /**
   * Get nearest screen index from scroll position
   */
  const nearestIndexFromScroll = () => {
    const items = Array.from(track.children);
    if (!items.length) return 0;

    let best = 0;
    let bestDist = Infinity;
    const left = track.scrollLeft;

    items.forEach((el, i) => {
      const dist = Math.abs(el.offsetLeft - left);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });

    return best;
  };

  /**
   * Scroll carousel to index
   */
  const scrollToIndex = (idx) => {
    const items = Array.from(track.children);
    if (!items.length) return;

    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    const target = items[clamped];
    if (!target) return;

    currentIndex = clamped;
    updateDots(currentIndex);
    updateArrows(currentIndex);

    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  /**
   * Trap focus within the modal
   */
  const trapFocus = (e) => {
    if (e.key !== "Tab") return;

    const focusables = Array.from(
      panel.querySelectorAll(focusableSelector),
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex !== -1);

    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  /**
   * Open the modal with design data
   */
  const openModal = (data, triggerEl) => {
    currentData = data;
    lastActive = triggerEl || document.activeElement;

    // Populate content
    titleEl.textContent = data.title || "Quick Look";
    metaEl.textContent = [data.designer, data.grade]
      .filter(Boolean)
      .join(" • ");
    summaryEl.textContent = data.summary || "";

    renderTags(data.feature_focus || []);
    renderScreens(data.screens || []);

    // Set vote key
    const voteKey = data.voteKey || data.slug || "";
    setVoteKey(voteKey);
    setVoteCounts(data.votes);

    // Set action links
    if (openLink) {
      openLink.href = data.url || "#";
    }

    if (demoLink) {
      if (data.demo_url) {
        demoLink.href = data.demo_url;
        demoLink.classList.remove("hidden");
      } else {
        demoLink.classList.add("hidden");
        demoLink.href = "#";
      }
    }

    // Show modal + lock scroll
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");

    // Ensure carousel starts at first screen now that modal is visible
    requestAnimationFrame(function () {
      track.scrollLeft = 0;
    });

    // Reset vote button states before hydrating new design
    modal.querySelectorAll("[data-vote-btn]").forEach(function (btn) {
      btn.classList.remove("is-voted");
      btn.setAttribute("aria-pressed", "false");
    });

    // Hydrate voting buttons if voting system is available
    if (window.TSGVoting && typeof window.TSGVoting.hydrate === "function") {
      window.TSGVoting.hydrate(modal);
    }

    // Focus management
    closeBtn?.focus();

    // Keydown bindings
    const onKeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
        return;
      }

      // Arrow key navigation for carousel
      if (e.key === "ArrowLeft") {
        scrollToIndex(currentIndex - 1);
      }
      if (e.key === "ArrowRight") {
        scrollToIndex(currentIndex + 1);
      }

      trapFocus(e);
    };

    document.addEventListener("keydown", onKeydown);
    unbindKeydown = () => document.removeEventListener("keydown", onKeydown);

    // Keep dots in sync with scroll
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const idx = nearestIndexFromScroll();
        if (idx !== currentIndex) {
          currentIndex = idx;
          updateDots(currentIndex);
          updateArrows(currentIndex);
        }
      });
    };

    track.addEventListener("scroll", onScroll, { passive: true });
    scrollHandler = onScroll;

    setToast("");
  };

  /**
   * Close the modal
   */
  const closeModal = () => {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");

    if (unbindKeydown) {
      unbindKeydown();
      unbindKeydown = null;
    }

    if (scrollHandler) {
      track.removeEventListener("scroll", scrollHandler);
      scrollHandler = null;
    }

    // Restore focus
    if (lastActive && typeof lastActive.focus === "function") {
      lastActive.focus();
    }

    lastActive = null;
    currentData = null;
    currentIndex = 0;
  };

  /**
   * Handle share action.
   * Uses Web Share API on mobile; falls back to clipboard with blurb + URL.
   */
  const handleShare = async () => {
    if (!currentData) return;

    const title = currentData.title || "Third Spaces design";
    const designer = currentData.designer || "";
    const url = new URL(
      currentData.url || window.location.href,
      window.location.origin,
    ).toString();

    const blurb = designer
      ? `${title} by ${designer} — a student-designed feature for the Third Spaces app.`
      : `${title} — a student-designed feature for the Third Spaces app.`;

    const payload = {
      title,
      text: blurb,
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(payload);
        setToast("Shared!");
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(blurb + "\n" + url);
        setToast("Copied! Ready to paste.");
      } else {
        setToast("Copy not supported in this browser.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setToast("Could not copy — try manually.");
      }
    }
  };

  // Event delegation for click handlers
  document.addEventListener("click", (e) => {
    // Open Quick Look
    const openBtn = e.target.closest("[data-quicklook]");
    if (openBtn) {
      const card =
        openBtn.closest("[data-design-card]") ||
        openBtn.closest("article") ||
        openBtn.parentElement;
      const jsonEl = card?.querySelector?.("[data-design-json]");

      if (!jsonEl) {
        setToast("Could not open quick look.");
        return;
      }

      try {
        const data = JSON.parse(jsonEl.textContent);
        openModal(data, openBtn);
      } catch (err) {
        console.error("[QuickLook] Failed to parse JSON:", err);
        setToast("Could not open quick look (bad data).");
      }
      return;
    }

    // Close handlers
    if (e.target.closest("[data-ql-close]")) {
      closeModal();
      return;
    }

    if (e.target.closest("[data-ql-backdrop]")) {
      closeModal();
      return;
    }

    // Carousel navigation
    if (e.target.closest("[data-ql-prev]")) {
      scrollToIndex(currentIndex - 1);
      return;
    }

    if (e.target.closest("[data-ql-next]")) {
      scrollToIndex(currentIndex + 1);
      return;
    }

    // Share
    if (e.target.closest("[data-ql-share]")) {
      handleShare();
    }
  });

  // Expose API for external use
  window.TSGQuickLook = {
    open: openModal,
    close: closeModal,
    isOpen: () => !modal.classList.contains("hidden"),
  };

  console.log("[QuickLook] Modal controller initialized");
})();
