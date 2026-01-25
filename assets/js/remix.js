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
    // Update FAB
    const fab = document.querySelector("[data-remix-fab]");
    if (fab) {
      const countEl = fab.querySelector("[data-remix-count]");
      if (countEl) {
        countEl.textContent = cart.length;
      }
      fab.classList.toggle("hidden", cart.length === 0);

      // Add pulse animation when items change
      if (cart.length > 0) {
        fab.classList.add("animate-pulse-once");
        setTimeout(() => fab.classList.remove("animate-pulse-once"), 600);
      }
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
        labelEl.textContent = inCart ? "Added" : "Add to Remix";
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
    const submitBtn = document.querySelector("[data-remix-submit]");

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
   * Generate remix payload for submission
   */
  const generatePayload = () => {
    return {
      features: cart.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        sourceSubmission: item.sourceSubmission,
      })),
      createdAt: new Date().toISOString(),
      deviceId: localStorage.getItem("tsg_device_id") || null,
    };
  };

  /**
   * Submit remix (placeholder - can be connected to backend)
   */
  const submit = async (userNote) => {
    const payload = generatePayload();
    payload.userNote = userNote || "";

    console.log("[Remix] Submitting remix:", payload);

    // For now, just log it. Could POST to Supabase or Google Form
    // Example:
    // const response = await fetch('/api/remix', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(payload)
    // });

    return payload;
  };

  // Initialize
  loadCart();

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
      if (confirm("Remove all features from your remix?")) {
        clear();
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
    remove,
    has,
    getAll,
    count,
    clear,
    submit,
    generatePayload,
    updateUI,
  };

  console.log("[Remix] Engine initialized, cart has", cart.length, "items");
})();
