/**
 * Third Spaces Youth Design Gallery - Remix Engine
 *
 * A "shopping cart" for collecting features from designs.
 * Users can collect features they like, then view their remix
 * on the dashboard and optionally submit it.
 *
 * Features:
 * - localStorage persistence
 * - Fly-to-cart animation on add
 * - FAB with count badge
 * - Integration with submission cards
 */

(() => {
  const STORAGE_KEY = "tsg_remix_cart";
  const MAX_ITEMS = 20; // Reasonable limit

  // State
  let cart = [];

  /**
   * Load cart from localStorage
   */
  const loadCart = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          cart = parsed.slice(0, MAX_ITEMS);
        }
      }
    } catch (e) {
      console.warn("[Remix] Failed to load cart:", e);
      cart = [];
    }
  };

  /**
   * Save cart to localStorage
   */
  const saveCart = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.warn("[Remix] Failed to save cart:", e);
    }
  };

  /**
   * Add feature to cart
   * @param {string} featureId - Unique feature identifier
   * @param {object} meta - Feature metadata (name, icon, sourceSubmission, etc.)
   * @param {HTMLElement} [triggerEl] - Optional element for fly animation
   */
  const add = (featureId, meta, triggerEl) => {
    if (has(featureId)) {
      console.log("[Remix] Feature already in cart:", featureId);
      return false;
    }

    if (cart.length >= MAX_ITEMS) {
      console.warn("[Remix] Cart is full");
      return false;
    }

    const item = {
      id: featureId,
      name: meta?.name || featureId,
      icon: meta?.icon || "🎯",
      sourceSubmission: meta?.sourceSubmission || null,
      sourceTitle: meta?.sourceTitle || null,
      addedAt: new Date().toISOString(),
    };

    cart.push(item);
    saveCart();
    updateUI();

    // Fly animation
    if (triggerEl) {
      animateFlyToCart(triggerEl);
    }

    console.log("[Remix] Added feature:", featureId);
    return true;
  };

  /**
   * Remove feature from cart
   * @param {string} featureId
   */
  const remove = (featureId) => {
    const idx = cart.findIndex((item) => item.id === featureId);
    if (idx === -1) return false;

    cart.splice(idx, 1);
    saveCart();
    updateUI();

    console.log("[Remix] Removed feature:", featureId);
    return true;
  };

  /**
   * Check if feature is in cart
   * @param {string} featureId
   */
  const has = (featureId) => {
    return cart.some((item) => item.id === featureId);
  };

  /**
   * Get all cart items
   */
  const getAll = () => {
    return [...cart];
  };

  /**
   * Get cart count
   */
  const count = () => {
    return cart.length;
  };

  /**
   * Clear entire cart
   */
  const clear = () => {
    cart = [];
    saveCart();
    updateUI();
    console.log("[Remix] Cart cleared");
  };

  /**
   * Update all UI elements
   */
  const updateUI = () => {
    // Update FAB - always visible, muted when empty
    const fab = document.querySelector("[data-remix-fab]");
    if (fab) {
      const countEl = fab.querySelector("[data-remix-count]");
      if (countEl) {
        countEl.textContent = cart.length;
      }
      fab.classList.toggle("remix-fab-empty", cart.length === 0);

      // Add pulse animation when items change
      if (cart.length > 0) {
        fab.classList.add("animate-pulse-once");
        setTimeout(() => fab.classList.remove("animate-pulse-once"), 600);
      }
    }

    // Update nav count badge
    const navBadge = document.querySelector("[data-remix-nav-count]");
    if (navBadge) {
      navBadge.textContent = cart.length;
      navBadge.classList.toggle("hidden", cart.length === 0);
    }

    // Update Add to Remix buttons (toggle state)
    document.querySelectorAll("[data-remix-add]").forEach((btn) => {
      const featureId = btn.dataset.remixAdd;
      const inCart = has(featureId);

      btn.setAttribute("aria-pressed", inCart ? "true" : "false");
      btn.classList.toggle("is-added", inCart);

      // Update button text if has label element
      const labelEl = btn.querySelector("[data-remix-label]");
      if (labelEl) {
        labelEl.textContent = inCart ? "\u2713 Added" : "+ Add";
      }
    });

    // Update dashboard if on that page
    updateDashboard();
  };

  /**
   * Update dashboard page content
   */
  const updateDashboard = () => {
    const container = document.querySelector("[data-remix-list]");
    if (!container) return;

    const emptyState = document.querySelector("[data-remix-empty]");
    const submitBtn = document.querySelector("[data-remix-actions]");

    // Show/hide empty state
    if (emptyState) {
      emptyState.classList.toggle("hidden", cart.length > 0);
    }

    if (submitBtn) {
      submitBtn.classList.toggle("hidden", cart.length === 0);
    }

    // Clear and rebuild list
    container.innerHTML = "";

    cart.forEach((item) => {
      const card = document.createElement("div");
      card.className =
        "flex items-center justify-between gap-4 rounded-xl border border-brand-sky/10 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800";
      card.dataset.remixItem = item.id;

      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
          <span class="text-2xl shrink-0" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <div class="min-w-0">
            <p class="font-semibold text-brand-navy dark:text-gray-100 truncate">${escapeHtml(item.name)}</p>
            ${item.sourceTitle ? `<p class="text-sm text-brand-stone dark:text-gray-400 truncate">from ${escapeHtml(item.sourceTitle)}</p>` : ""}
          </div>
        </div>
        <button type="button"
                class="tsg-chip hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                data-remix-remove="${escapeHtml(item.id)}"
                aria-label="Remove ${escapeHtml(item.name)} from remix">
          <span aria-hidden="true">✕</span>
          <span class="hidden sm:inline">Remove</span>
        </button>
      `;

      container.appendChild(card);
    });

    // Update count display
    const countDisplay = document.querySelector("[data-remix-total]");
    if (countDisplay) {
      countDisplay.textContent = cart.length;
    }
  };

  /**
   * Animate element flying to FAB
   */
  const animateFlyToCart = (triggerEl) => {
    const fab = document.querySelector("[data-remix-fab]");
    if (!fab || !triggerEl) return;

    // Check for reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Get positions
    const triggerRect = triggerEl.getBoundingClientRect();
    const fabRect = fab.getBoundingClientRect();

    // Create flying element
    const flyer = document.createElement("div");
    flyer.className =
      "fixed z-[100] pointer-events-none text-2xl transition-all duration-500 ease-out";
    flyer.textContent = triggerEl.dataset.remixIcon || "🎯";
    flyer.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
    flyer.style.top = `${triggerRect.top + triggerRect.height / 2}px`;
    flyer.style.transform = "translate(-50%, -50%) scale(1)";
    flyer.style.opacity = "1";

    document.body.appendChild(flyer);

    // Animate to FAB
    requestAnimationFrame(() => {
      flyer.style.left = `${fabRect.left + fabRect.width / 2}px`;
      flyer.style.top = `${fabRect.top + fabRect.height / 2}px`;
      flyer.style.transform = "translate(-50%, -50%) scale(0.5)";
      flyer.style.opacity = "0";
    });

    // Remove after animation
    setTimeout(() => {
      flyer.remove();
    }, 550);
  };

  /**
   * Escape HTML for safe insertion
   */
  const escapeHtml = (str) => {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  /**
   * Add a feature by ID only (graceful degradation with generic metadata)
   * Used when importing from shared URLs where full metadata isn't available.
   * @param {string} featureId - Unique feature identifier
   */
  const addById = (featureId) => {
    if (!featureId || has(featureId)) return false;
    return add(featureId, { name: featureId, icon: "🎯" });
  };

  /**
   * Generate a shareable URL encoding the current cart's feature IDs
   * @returns {string} Full URL with ?features= query param
   */
  const getShareURL = () => {
    const baseurl =
      document.querySelector('meta[name="baseurl"]')?.content || "";
    const base = window.location.origin + baseurl + "/remix/";
    if (cart.length === 0) return base;

    const url = new URL(base);
    url.searchParams.set("features", cart.map((item) => item.id).join(","));
    return url.toString();
  };

  /**
   * Load features from a shared URL's ?features= query param
   * Parses comma-separated feature IDs and adds any missing ones to cart.
   * Cleans the URL afterwards via history.replaceState.
   */
  const loadFromShareURL = () => {
    try {
      const url = new URL(window.location.href);
      const featuresParam = url.searchParams.get("features");
      if (!featuresParam) return;

      const ids = featuresParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length === 0) return;

      let imported = 0;
      ids.forEach((id) => {
        if (addById(id)) {
          imported++;
        }
      });

      // Clean the URL (remove query params)
      url.searchParams.delete("features");
      const cleanURL =
        url.pathname +
        (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") +
        url.hash;
      history.replaceState(null, "", cleanURL);

      if (imported > 0) {
        console.log(`[Remix] Imported ${imported} features from shared URL`);
      }
    } catch (e) {
      console.warn("[Remix] Failed to load from share URL:", e);
    }
  };

  /**
   * Get the count of unique source submissions in the cart
   * @returns {number} Number of unique sourceSubmission values
   */
  const uniqueSources = () => {
    const sources = new Set(
      cart.map((item) => item.sourceSubmission).filter(Boolean),
    );
    return sources.size;
  };

  /**
   * Generate remix payload for submission
   */
  const generatePayload = () => {
    return {
      features: cart.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        sourceSubmission: item.sourceSubmission,
        sourceTitle: item.sourceTitle,
      })),
      createdAt: new Date().toISOString(),
    };
  };

  /**
   * Submit remix to the Edge Function for moderation.
   * @param {string} [userNote] - Optional note from the author
   * @param {string} [authorName] - Optional author name
   * @returns {{ success: boolean, error?: string, reference?: string }}
   */
  const submit = async (userNote, authorName) => {
    const payload = generatePayload();

    // Get device_id for rate limiting
    let deviceId = null;
    try {
      deviceId = localStorage.getItem("tsg_device_id");
    } catch (e) {}

    if (!deviceId) {
      return {
        success: false,
        error: "Device ID not found. Please refresh and try again.",
      };
    }

    const supabaseUrl = window.ThirdSpacesSupabase?.url;
    if (!supabaseUrl) {
      console.warn("[Remix] Supabase not configured");
      return { success: false, error: "Server not configured." };
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/submit-remix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          author_name: authorName || "Anonymous",
          user_note: userNote || "",
          features: payload.features,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("[Remix] Server error:", data);
        return { success: false, error: data.error || "Server error" };
      }

      console.log("[Remix] Published, reference:", data.reference);

      // Track locally for transparency page
      try {
        const stored = JSON.parse(
          localStorage.getItem("ts:published_remixes:v1") || "{}",
        );
        stored[data.reference] = { timestamp: new Date().toISOString() };
        localStorage.setItem("ts:published_remixes:v1", JSON.stringify(stored));
      } catch (e) {}

      return {
        success: true,
        reference: data.reference,
        message: data.message,
      };
    } catch (e) {
      console.error("[Remix] Network error:", e);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  // Initialize
  loadCart();
  loadFromShareURL();

  // Event delegation for click handlers
  document.addEventListener("click", (e) => {
    // Add to Remix
    const addBtn = e.target.closest("[data-remix-add]");
    if (addBtn) {
      e.preventDefault();
      const featureId = addBtn.dataset.remixAdd;
      const meta = {
        name: addBtn.dataset.remixName || featureId,
        icon: addBtn.dataset.remixIcon || "🎯",
        sourceSubmission: addBtn.dataset.remixSource || null,
        sourceTitle: addBtn.dataset.remixSourceTitle || null,
      };

      if (has(featureId)) {
        remove(featureId);
      } else {
        add(featureId, meta, addBtn);
      }
      return;
    }

    // Remove from cart
    const removeBtn = e.target.closest("[data-remix-remove]");
    if (removeBtn) {
      e.preventDefault();
      const featureId = removeBtn.dataset.remixRemove;
      remove(featureId);
      return;
    }

    // Clear all
    const clearBtn = e.target.closest("[data-remix-clear]");
    if (clearBtn) {
      e.preventDefault();
      // Dispatch event so dashboard can show a styled modal instead
      const event = new CustomEvent("remix:clear-request", {
        cancelable: true,
      });
      const handled = !document.dispatchEvent(event);
      if (!handled) {
        // Fallback for pages without a custom handler
        if (confirm("Remove all features from your remix?")) {
          clear();
        }
      }
    }
  });

  // Update UI after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", updateUI);
  } else {
    updateUI();
  }

  // Expose API
  window.TSGRemix = {
    add,
    addById,
    remove,
    has,
    getAll,
    count,
    clear,
    submit,
    generatePayload,
    getShareURL,
    uniqueSources,
    updateUI,
  };

  console.log("[Remix] Engine initialized, cart has", cart.length, "items");

  // --- Remix Onboarding Tooltip ---
  const initOnboardingTooltip = () => {
    try {
      // Skip if we're already on the remix page
      if (window.location.pathname.replace(/\/$/, "").endsWith("/remix"))
        return;

      // Skip if user has already seen the tooltip
      if (localStorage.getItem("tsg_remix_onboarding_seen")) return;
    } catch (e) {
      // Private browsing or localStorage unavailable — skip silently
      return;
    }

    const tooltip = document.querySelector("[data-remix-tooltip]");
    if (!tooltip) return;

    let dismissed = false;
    let autoTimer = null;

    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;

      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }

      // Fade out
      tooltip.classList.remove(
        "opacity-100",
        "translate-y-0",
        "pointer-events-auto",
      );
      tooltip.classList.add(
        "opacity-0",
        "translate-y-2",
        "pointer-events-none",
      );

      // Hide after transition completes
      setTimeout(() => {
        tooltip.setAttribute("hidden", "");
      }, 350);

      // Record dismissal
      try {
        localStorage.setItem("tsg_remix_onboarding_seen", "1");
      } catch (_) {
        // Ignore storage errors
      }
    };

    // Show after a 1.5-second delay to let the page settle
    setTimeout(() => {
      if (dismissed) return;

      tooltip.removeAttribute("hidden");

      // Trigger reflow then animate in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tooltip.classList.remove(
            "opacity-0",
            "translate-y-2",
            "pointer-events-none",
          );
          tooltip.classList.add(
            "opacity-100",
            "translate-y-0",
            "pointer-events-auto",
          );
        });
      });

      // Auto-dismiss after 8 seconds
      autoTimer = setTimeout(dismiss, 8000);
    }, 1500);

    // Dismiss on button click
    const dismissBtn = tooltip.querySelector("[data-remix-tooltip-dismiss]");
    if (dismissBtn) {
      dismissBtn.addEventListener("click", (e) => {
        e.preventDefault();
        dismiss();
      });
    }
  };

  // Run onboarding after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOnboardingTooltip);
  } else {
    initOnboardingTooltip();
  }
})();
