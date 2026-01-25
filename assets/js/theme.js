/**
 * Third Spaces Youth Design Gallery - Theme System
 *
 * Implements "Playful Brutalism" with two modes:
 * - Chill: Nature-inspired, light, calming (default)
 * - Hype: Neon/cyber, dark, energetic
 *
 * Persists user preference to localStorage.
 * Respects system preference if no user preference set.
 */

(() => {
  const THEME_KEY = "tsg_theme";
  const root = document.documentElement;

  /**
   * Theme configurations
   * CSS custom properties are defined in main.css
   */
  const THEMES = {
    chill: {
      label: "Chill",
      icon: "🌿",
      isDark: false,
    },
    hype: {
      label: "Hype",
      icon: "⚡",
      isDark: true,
    },
  };

  /**
   * Get the user's preferred theme
   * Priority: localStorage > system preference > default (chill)
   */
  const getPreferredTheme = () => {
    // Check localStorage first
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "chill" || saved === "hype") {
      return saved;
    }

    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "hype";
    }

    // Default to chill (light)
    return "chill";
  };

  /**
   * Apply theme to the document
   */
  const applyTheme = (theme) => {
    const config = THEMES[theme] || THEMES.chill;

    // Set data attribute (used by CSS custom properties)
    root.dataset.theme = theme;

    // Toggle dark class for Tailwind dark mode
    root.classList.toggle("dark", config.isDark);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = config.isDark ? "#0f0f0f" : "#f8faf2";
    }
  };

  /**
   * Save theme preference
   */
  const saveTheme = (theme) => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn("[Theme] Failed to save preference:", e);
    }
  };

  /**
   * Toggle between themes
   */
  const toggleTheme = () => {
    const current = root.dataset.theme || "chill";
    const next = current === "chill" ? "hype" : "chill";
    applyTheme(next);
    saveTheme(next);
    return next;
  };

  /**
   * Update toggle button UI
   */
  const updateToggleButton = (btn) => {
    if (!btn) return;

    const theme = root.dataset.theme || "chill";
    const config = THEMES[theme];
    const nextConfig = THEMES[theme === "chill" ? "hype" : "chill"];

    btn.setAttribute(
      "aria-label",
      `Switch to ${nextConfig.label} mode (currently ${config.label})`,
    );
    btn.setAttribute("aria-pressed", config.isDark ? "true" : "false");

    // Update button content
    const iconEl = btn.querySelector("[data-theme-icon]");
    const labelEl = btn.querySelector("[data-theme-label]");

    if (iconEl) {
      iconEl.textContent = nextConfig.icon;
    }
    if (labelEl) {
      labelEl.textContent = nextConfig.label;
    }

    // If button has simple text content, update it
    if (!iconEl && !labelEl) {
      btn.innerHTML = `<span aria-hidden="true">${nextConfig.icon}</span> ${nextConfig.label}`;
    }
  };

  // Apply theme immediately (before DOM content loaded to prevent flash)
  applyTheme(getPreferredTheme());

  // Bind toggle button once DOM is ready
  window.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.querySelector("[data-theme-toggle]");

    if (toggleBtn) {
      // Initial button state
      updateToggleButton(toggleBtn);

      // Click handler
      toggleBtn.addEventListener("click", () => {
        toggleTheme();
        updateToggleButton(toggleBtn);
      });
    }

    // Listen for system preference changes
    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          // Only auto-switch if user hasn't set a preference
          if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? "hype" : "chill");
            updateToggleButton(toggleBtn);
          }
        });
    }

    console.log("[Theme] Initialized:", root.dataset.theme);
  });

  // Expose for external use
  window.TSGTheme = {
    get: () => root.dataset.theme || "chill",
    set: (theme) => {
      applyTheme(theme);
      saveTheme(theme);
    },
    toggle: toggleTheme,
  };
})();
