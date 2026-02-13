/**
 * Third Spaces Youth Design Gallery - Quick Look Modal Controller
 *
 * Mobile-native bottom sheet (swipeable preview + vote) that opens from gallery cards.
 * Desktop: centered modal.
 *
 * Uses TSGModal (modal-controller.js) for generic modal lifecycle (open/close,
 * focus trap, Escape, backdrop click, history state). This file handles all
 * Quick Look-specific logic: carousel, voting, remix chips, share, etc.
 *
 * Features:
 * - Zero-latency open (reads JSON from card, no network fetch)
 * - Screen carousel with swipe + arrow key navigation
 * - Integrated voting (uses existing voting system)
 * - Focus trap for accessibility (via TSGModal)
 * - Respects prefers-reduced-motion
 */

(() => {
  const modal = document.getElementById("quicklook-modal");
  if (!modal) return;

  // Element references
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
  const toastEl = modal.querySelector("[data-ql-toast]");
  const closeBtn = modal.querySelector("[data-ql-close]");
  const voteContainer = modal.querySelector("[data-ql-vote-container]");
  const remixSection = modal.querySelector("[data-ql-remix-section]");
  const remixChips = modal.querySelector("[data-ql-remix-chips]");

  // State
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentData = null;
  let currentIndex = 0;
  let arrowKeyHandler = null;
  let scrollHandler = null;

  // --- TSGModal integration ---
  // Create the shared modal controller instance, with an onClose callback
  // for Quick Look-specific cleanup. Falls back to manual handling if
  // TSGModal is not available (e.g., script load failure).

  const modalCtrl =
    typeof window.TSGModal === "function"
      ? new window.TSGModal(modal, {
          onClose: function () {
            cleanupQuickLook();
          },
        })
      : null;

  /**
   * Quick Look-specific cleanup (called on close).
   * Removes carousel listeners, resets state, clears remix chips.
   */
  const cleanupQuickLook = () => {
    // Unbind arrow key navigation
    if (arrowKeyHandler) {
      document.removeEventListener("keydown", arrowKeyHandler);
      arrowKeyHandler = null;
    }

    // Unbind scroll sync
    if (scrollHandler) {
      track.removeEventListener("scroll", scrollHandler);
      scrollHandler = null;
    }

    // Clean up remix chips
    if (remixSection) remixSection.classList.add("hidden");
    if (remixChips) remixChips.innerHTML = "";

    currentData = null;
    currentIndex = 0;
  };

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
   * Escape HTML special characters to prevent XSS
   */
  const escapeHtml = (str) => {
    if (!str) return "";
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
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
   * Open the modal with design data
   */
  const openModal = (data, triggerEl) => {
    currentData = data;

    // Populate content
    titleEl.textContent = data.title || "Quick Look";
    metaEl.textContent = [data.designer, data.grade]
      .filter(Boolean)
      .join(" \u2022 ");
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

    // Render remix (build) feature chips
    if (remixSection && remixChips) {
      remixChips.innerHTML = "";
      if (data.features && data.features.length > 0) {
        remixSection.classList.remove("hidden");
        data.features.forEach((f) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className =
            "tsg-chip transition-all hover:bg-teal-500/15 hover:border-teal-400";
          btn.setAttribute("data-remix-add", f.id);
          btn.setAttribute("data-remix-name", f.name);
          btn.setAttribute("data-remix-icon", f.icon || "\uD83C\uDFAF");
          btn.setAttribute(
            "data-remix-source",
            data.slug || data.voteKey || "",
          );
          btn.setAttribute("data-remix-source-title", data.title || "");
          btn.setAttribute(
            "data-remix-source-thumbnail",
            data.cover_image || "",
          );
          btn.setAttribute("data-remix-source-designer", data.designer || "");
          btn.setAttribute("data-remix-source-url", data.url || "");
          btn.setAttribute("aria-pressed", "false");

          // Check if feature is already in the remix cart
          const alreadyAdded = window.TSGRemix && window.TSGRemix.has(f.id);
          if (alreadyAdded) {
            btn.classList.add("is-added");
            btn.setAttribute("aria-pressed", "true");
          }

          const icon = escapeHtml(f.icon || "\uD83C\uDFAF");
          const name = escapeHtml(f.name);
          const label = alreadyAdded ? "\u2713 Added" : "+ Add";

          btn.innerHTML =
            `<span aria-hidden="true">${icon}</span>` +
            `<span class="font-medium">${name}</span>` +
            `<span data-remix-label class="text-xs opacity-70">${label}</span>`;

          remixChips.appendChild(btn);
        });
      } else {
        remixSection.classList.add("hidden");
      }
    }

    // Open modal via TSGModal (handles: show, body scroll lock, focus trap,
    // Escape key, backdrop click, history state, focus save/restore)
    if (modalCtrl) {
      modalCtrl.open();

      // Override TSGModal's default previousFocus (document.activeElement at
      // time of open) with the actual trigger element, so focus restores to
      // the card button that opened the Quick Look.
      modalCtrl.previousFocus = triggerEl || modalCtrl.previousFocus;

      // Override default focus: focus the close button specifically
      if (closeBtn) closeBtn.focus();
    } else {
      // Fallback: manual open if TSGModal not available
      modal.classList.remove("hidden");
      document.body.classList.add("overflow-hidden");
      if (closeBtn) closeBtn.focus();
    }

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

    // Arrow key navigation for carousel (Quick Look-specific, not in TSGModal)
    arrowKeyHandler = (e) => {
      if (e.key === "ArrowLeft") {
        scrollToIndex(currentIndex - 1);
      }
      if (e.key === "ArrowRight") {
        scrollToIndex(currentIndex + 1);
      }
    };
    document.addEventListener("keydown", arrowKeyHandler);

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
    if (modalCtrl) {
      // TSGModal.close() handles: hide, body scroll unlock, focus trap release,
      // event listener cleanup, focus restore, history.back, and calls onClose
      // callback which runs cleanupQuickLook()
      modalCtrl.close();
    } else {
      // Fallback: manual close if TSGModal not available
      modal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
      cleanupQuickLook();
    }
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
      ? `${title} by ${designer} \u2014 a student-designed feature for the Third Spaces app.`
      : `${title} \u2014 a student-designed feature for the Third Spaces app.`;

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
        setToast("Could not copy \u2014 try manually.");
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

    // Close button
    if (e.target.closest("[data-ql-close]")) {
      closeModal();
      return;
    }

    // Backdrop click (only needed for fallback; TSGModal handles this when available)
    if (!modalCtrl && e.target.closest("[data-ql-backdrop]")) {
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
    isOpen: () =>
      modalCtrl ? modalCtrl.isOpen() : !modal.classList.contains("hidden"),
  };

  console.log(
    "[QuickLook] Modal controller initialized" +
      (modalCtrl ? " (using TSGModal)" : " (standalone fallback)"),
  );
})();
