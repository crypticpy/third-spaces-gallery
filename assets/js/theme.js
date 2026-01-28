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
   * Update toggle UI (slider style)
   */
  const updateToggleUI = (toggle) => {
    if (!toggle) return;

    const theme = root.dataset.theme || "chill";
    const config = THEMES[theme];

    // Update aria attributes
    toggle.setAttribute("aria-checked", config.isDark ? "true" : "false");
    toggle.setAttribute(
      "aria-label",
      `Theme mode: ${config.label}. Press to switch.`,
    );

    // Update active states on options
    const options = toggle.querySelectorAll("[data-theme-option]");
    options.forEach((option) => {
      const isActive = option.dataset.themeOption === theme;
      option.dataset.active = isActive ? "true" : "false";
    });
  };

  // Apply theme immediately (before DOM content loaded to prevent flash)
  applyTheme(getPreferredTheme());

  /**
   * Update all toggle UIs on the page
   */
  const updateAllToggles = () => {
    document.querySelectorAll("[data-theme-toggle]").forEach(updateToggleUI);
  };

  // Bind toggle buttons once DOM is ready
  window.addEventListener("DOMContentLoaded", () => {
    const toggles = document.querySelectorAll("[data-theme-toggle]");

    toggles.forEach((toggle) => {
      // Initial state
      updateToggleUI(toggle);

      // Click handler - check if click was on a specific option
      toggle.addEventListener("click", (e) => {
        const option = e.target.closest("[data-theme-option]");
        if (option) {
          // Clicked a specific option - switch to that theme
          const targetTheme = option.dataset.themeOption;
          if (targetTheme && targetTheme !== root.dataset.theme) {
            applyTheme(targetTheme);
            saveTheme(targetTheme);
            updateAllToggles();
          }
        } else {
          // Clicked the toggle itself - toggle between themes
          toggleTheme();
          updateAllToggles();
        }
      });

      // Keyboard support (Enter/Space)
      toggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleTheme();
          updateAllToggles();
        }
      });
    });

    // Listen for system preference changes
    if (window.matchMedia) {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", (e) => {
          // Only auto-switch if user hasn't set a preference
          if (!localStorage.getItem(THEME_KEY)) {
            applyTheme(e.matches ? "hype" : "chill");
            updateAllToggles();
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
