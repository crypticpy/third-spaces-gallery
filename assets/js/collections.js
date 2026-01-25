/**
 * Third Spaces Youth Design Gallery - Collection Strip Controller
 *
 * Controls the horizontal collection tabs for curated views.
 * Features:
 * - Roving tabindex for keyboard navigation
 * - URL param sync (?collection=...)
 * - Dispatches tsg:collection-change event
 * - Scroll fade indicators
 */

(() => {
  const strip = document.querySelector("[data-collection-strip]");
  if (!strip) return;

  const tablist = strip.querySelector("[data-collection-tablist]");
  const tabs = Array.from(strip.querySelectorAll("[data-collection-id]"));
  const desc = document.getElementById("tsg-collection-desc");
  const fadeLeft = strip.querySelector("[data-scroll-fade-left]");
  const fadeRight = strip.querySelector("[data-scroll-fade-right]");

  if (!tabs.length) return;

  /**
   * Read collection ID from URL
   */
  const readUrl = () => {
    const u = new URL(window.location.href);
    return u.searchParams.get("collection") || "all";
  };

  /**
   * Write collection ID to URL
   */
  const writeUrl = (id) => {
    const u = new URL(window.location.href);
    if (id && id !== "all") {
      u.searchParams.set("collection", id);
    } else {
      u.searchParams.delete("collection");
    }
    history.replaceState({}, "", u.toString());
  };

  /**
   * Parse IDs from tab dataset
   */
  const parseIds = (tab) => {
    const raw = tab.dataset.collectionIds || "";
    if (!raw.trim()) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  /**
   * Dispatch collection change event
   */
  const dispatch = (tab) => {
    const detail = {
      id: tab.dataset.collectionId || "all",
      sort: tab.dataset.collectionSort || "",
      ids: parseIds(tab),
    };

    console.log("[Collections] Changed to:", detail.id, detail);
    window.dispatchEvent(new CustomEvent("tsg:collection-change", { detail }));
  };

  /**
   * Set the selected tab
   */
  const setSelected = (tab, { updateUrl = true, emit = true } = {}) => {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute("aria-selected", selected ? "true" : "false");
      t.tabIndex = selected ? 0 : -1;
    });

    // Update description
    if (desc) {
      desc.textContent = tab.dataset.collectionDesc || "";
    }

    // Scroll tab into view
    tab.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });

    const id = tab.dataset.collectionId || "all";
    if (updateUrl) writeUrl(id);
    if (emit) dispatch(tab);
  };

  /**
   * Find tab by ID
   */
  const findTab = (id) =>
    tabs.find((t) => t.dataset.collectionId === id) || tabs[0];

  /**
   * Update scroll fade indicators
   */
  const updateScrollFades = () => {
    if (!tablist || !fadeLeft || !fadeRight) return;

    const { scrollLeft, scrollWidth, clientWidth } = tablist;
    const atStart = scrollLeft <= 5;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 5;

    fadeLeft.style.opacity = atStart ? "0" : "1";
    fadeRight.style.opacity = atEnd ? "0" : "1";
  };

  // Initialize from URL
  const initial = findTab(readUrl());
  setSelected(initial, { updateUrl: false, emit: true });

  // Click selection
  tablist?.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-collection-id]");
    if (!tab) return;
    setSelected(tab, { updateUrl: true, emit: true });
  });

  // Keyboard navigation (ArrowLeft/Right, Home/End)
  tablist?.addEventListener("keydown", (e) => {
    const current = tabs.findIndex(
      (t) => t.getAttribute("aria-selected") === "true",
    );
    if (current < 0) return;

    let next = current;

    if (e.key === "ArrowRight") {
      next = (current + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      next = (current - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const tab = tabs[next];
    tab.focus();
    setSelected(tab, { updateUrl: true, emit: true });
  });

  // Scroll fade updates
  tablist?.addEventListener("scroll", updateScrollFades, { passive: true });
  window.addEventListener("resize", updateScrollFades, { passive: true });

  // Initial fade state
  requestAnimationFrame(updateScrollFades);

  // Handle browser back/forward
  window.addEventListener("popstate", () => {
    const tab = findTab(readUrl());
    setSelected(tab, { updateUrl: false, emit: true });
  });

  // Expose API
  window.TSGCollections = {
    select: (id) => {
      const tab = findTab(id);
      if (tab) setSelected(tab, { updateUrl: true, emit: true });
    },
    getSelected: () => {
      const selected = tabs.find(
        (t) => t.getAttribute("aria-selected") === "true",
      );
      return selected?.dataset.collectionId || "all";
    },
  };

  console.log("[Collections] Strip initialized");
})();
