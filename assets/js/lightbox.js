/**
 * Image Lightbox for Design Screens (Desktop only)
 *
 * Opens images in a modal overlay instead of a new tab.
 * Only active on desktop viewports (1024px+).
 *
 * Features:
 * - Click outside to close
 * - X button to close
 * - Escape key to close
 * - Body scroll lock while open
 * - Focus trap for accessibility
 * - Respects reduced motion preference
 */

(function () {
  "use strict";

  // Minimum viewport width for lightbox behavior (desktop only)
  const DESKTOP_MIN_WIDTH = 1024;

  // DOM elements
  let lightbox = null;
  let imageEl = null;
  let captionEl = null;
  let closeBtn = null;

  // State
  let isOpen = false;
  let triggerElement = null; // Element that opened the lightbox (for focus return)

  /**
   * Check if we're on a desktop viewport
   */
  function isDesktop() {
    return window.innerWidth >= DESKTOP_MIN_WIDTH;
  }

  /**
   * Initialize the lightbox
   */
  function init() {
    lightbox = document.getElementById("image-lightbox");
    if (!lightbox) return;

    imageEl = lightbox.querySelector("[data-lightbox-image]");
    captionEl = lightbox.querySelector("[data-lightbox-caption]");
    closeBtn = lightbox.querySelector(".image-lightbox__close");

    // Set up event listeners
    setupEventListeners();

    // Intercept image link clicks in the screen carousel
    setupImageInterception();
  }

  /**
   * Set up lightbox event listeners
   */
  function setupEventListeners() {
    // Close button and backdrop clicks
    lightbox.addEventListener("click", function (e) {
      if (e.target.closest("[data-lightbox-close]")) {
        close();
      }
    });

    // Escape key to close
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    });

    // Prevent scroll events from propagating when lightbox is open
    lightbox.addEventListener(
      "wheel",
      function (e) {
        if (isOpen) {
          e.preventDefault();
        }
      },
      { passive: false },
    );

    // Focus trap: keep focus within the lightbox
    lightbox.addEventListener("keydown", function (e) {
      if (e.key === "Tab" && isOpen) {
        trapFocus(e);
      }
    });
  }

  /**
   * Intercept clicks on screen carousel image links
   */
  function setupImageInterception() {
    // Use event delegation on the document to catch dynamically added content too
    document.addEventListener(
      "click",
      function (e) {
        // Only proceed on desktop
        if (!isDesktop()) return;

        // Check if the click is on an image link within the screen carousel
        const link = e.target.closest('[data-screen-track] a[target="_blank"]');
        if (!link) return;

        // Allow default new-tab behavior for modifier or middle-clicks
        if (e.button === 1 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
          return;

        // Get the image URL from the link href
        const imageUrl = link.getAttribute("href");
        if (!imageUrl) return;

        // Get the image element inside the link for alt text
        const img = link.querySelector("img");
        const altText = img ? img.getAttribute("alt") : "";

        // Get caption from figcaption if present
        const figure = link.closest("figure");
        const figcaption = figure ? figure.querySelector("figcaption") : null;
        const caption = figcaption ? figcaption.textContent.trim() : "";

        // Prevent default link behavior
        e.preventDefault();

        // Open lightbox
        open(imageUrl, altText, caption, link);
      },
      true,
    ); // Use capture phase to intercept before other handlers
  }

  /**
   * Open the lightbox with an image
   */
  function open(imageUrl, altText, caption, trigger) {
    if (!lightbox || !imageEl) return;

    // Store trigger for focus return
    triggerElement = trigger || document.activeElement;

    // Set image source and alt
    imageEl.src = imageUrl;
    imageEl.alt = altText || "Design screen preview";

    // Set caption if provided
    if (captionEl) {
      if (caption) {
        captionEl.textContent = caption;
        captionEl.hidden = false;
      } else {
        captionEl.hidden = true;
      }
    }

    // Show the lightbox
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");

    // Lock body scroll
    document.body.classList.add("lightbox-open");

    // Set state
    isOpen = true;

    // Move focus to close button after a brief delay (for transition)
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setTimeout(
      function () {
        if (closeBtn) closeBtn.focus();
      },
      prefersReducedMotion ? 0 : 100,
    );
  }

  /**
   * Close the lightbox
   */
  function close() {
    if (!lightbox || !isOpen) return;

    // Hide the lightbox
    lightbox.setAttribute("aria-hidden", "true");

    // Unlock body scroll
    document.body.classList.remove("lightbox-open");

    // Set state
    isOpen = false;

    // Return focus to trigger element
    if (triggerElement && typeof triggerElement.focus === "function") {
      triggerElement.focus();
    }

    // Clear image after transition to prevent flash on next open
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setTimeout(
      function () {
        if (!isOpen) {
          lightbox.hidden = true;
          if (imageEl) imageEl.src = "";
        }
      },
      prefersReducedMotion ? 0 : 300,
    );

    triggerElement = null;
  }

  /**
   * Trap focus within the lightbox for accessibility
   */
  function trapFocus(e) {
    // Get all focusable elements in the lightbox
    const focusableElements = lightbox.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return;

    const firstEl = focusableElements[0];
    const lastEl = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      // Shift + Tab: if on first element, wrap to last
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      // Tab: if on last element, wrap to first
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose API for external use if needed
  window.TSGLightbox = {
    open: open,
    close: close,
    isOpen: function () {
      return isOpen;
    },
  };
})();
