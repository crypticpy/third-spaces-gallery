/**
 * Third Spaces Youth Design Gallery - Voting System
 *
 * Centralized voting with Supabase + realtime updates
 * Falls back to localStorage if Supabase not configured
 *
 * Spam prevention layers:
 * 1. localStorage persistence (tracks user's own votes)
 * 2. Cookie backup
 * 3. Random device ID (privacy-first, not fingerprinting)
 * 4. Rate limiting
 * 5. Honeypot field
 * 6. Time-based validation
 * 7. Supabase unique constraint (prevents duplicate votes)
 */

const DEVICE_KEY = "tsg_device_id";

const VOTE_CONFIG = {
  categories: [
    {
      id: "favorite",
      label: "I'd use this",
      emoji: "💖",
      votedLabel: "You love this!",
      votedEmoji: "✓",
    },
    {
      id: "innovative",
      label: "Super creative",
      emoji: "✨",
      votedLabel: "You dig it!",
      votedEmoji: "✓",
    },
    {
      id: "inclusive",
      label: "Works for everyone",
      emoji: "🌍",
      votedLabel: "Respect!",
      votedEmoji: "✓",
    },
  ],
  storageKey: "ts:votes:v2",
  cookieKey: "ts_v2",
  rateLimit: { maxVotes: 30, windowMs: 600000 },
  minTimingMs: 1500,
};

class VotingSystem {
  constructor(config = {}) {
    this.config = { ...VOTE_CONFIG, ...config };
    this.state = this.loadState();
    this.componentLoadTime = Date.now();
    this.deviceId = null;
    this.supabase = null;
    this.realtimeChannel = null;
  }

  async init() {
    // Generate or retrieve device ID (privacy-first, no fingerprinting)
    this.deviceId = this.getOrCreateDeviceId();
    this.state.deviceId = this.deviceId;
    this.saveState();

    // Initialize Supabase if configured
    if (window.ThirdSpacesSupabase?.isConfigured()) {
      this.supabase = window.ThirdSpacesSupabase.getClient();
      if (this.supabase) {
        await this.loadCentralizedCounts();
        this.subscribeToRealtime();
      }
    }

    // Bind to all vote buttons on page
    this.bindEvents();

    // Restore vote states in UI
    this.restoreUI();

    console.log(
      "[VotingSystem] Initialized",
      this.supabase ? "(Supabase enabled)" : "(localStorage only)",
    );
  }

  loadState() {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("[VotingSystem] localStorage read failed:", e);
    }

    const cookieState = this.loadFromCookie();
    if (cookieState) return cookieState;

    return {
      votes: {},
      deviceId: null,
      rateLimit: { count: 0, windowStart: new Date().toISOString() },
    };
  }

  saveState() {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.state));
      this.syncToCookie();
    } catch (e) {
      console.warn("[VotingSystem] Failed to save vote state:", e);
    }
  }

  loadFromCookie() {
    const match = document.cookie.match(
      new RegExp(`${this.config.cookieKey}=([^;]+)`),
    );
    if (!match) return null;
    try {
      return JSON.parse(atob(match[1]));
    } catch {
      return null;
    }
  }

  syncToCookie() {
    try {
      const encoded = btoa(JSON.stringify(this.state));
      document.cookie = `${this.config.cookieKey}=${encoded}; max-age=15552000; path=/; SameSite=Lax`;
    } catch (e) {
      console.warn("[VotingSystem] Cookie sync failed:", e);
    }
  }

  /**
   * Get or create a random device ID (privacy-first approach)
   * This replaces browser fingerprinting with a random UUID stored locally.
   * Users can clear this anytime via "Clear My Data" in the footer.
   */
  getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      // Generate a random UUID
      id =
        crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  }

  /**
   * Clear all user data (votes, device ID, cookies)
   * Called from "Clear My Data" button in footer
   */
  clearAllData() {
    // Clear localStorage
    localStorage.removeItem(this.config.storageKey);
    localStorage.removeItem(DEVICE_KEY);

    // Clear cookie
    document.cookie = `${this.config.cookieKey}=; max-age=0; path=/`;

    // Reset state
    this.state = {
      votes: {},
      deviceId: null,
      rateLimit: { count: 0, windowStart: new Date().toISOString() },
    };

    this.showMessage("Your vote data has been cleared", "success");

    // Reload after a brief delay
    setTimeout(() => location.reload(), 1500);
  }

  // Load centralized vote counts from Supabase
  async loadCentralizedCounts() {
    if (!this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from("vote_counts")
        .select("*");

      if (error) {
        console.error("[VotingSystem] Failed to load counts:", error);
        return;
      }

      // Update all count displays on the page
      data.forEach(({ submission_id, category, count }) => {
        this.updateCountDisplay(submission_id, category, count);
      });
    } catch (e) {
      console.error("[VotingSystem] Error loading counts:", e);
    }
  }

  // Subscribe to realtime vote updates
  subscribeToRealtime() {
    if (!this.supabase) return;

    this.realtimeChannel = this.supabase
      .channel("votes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        (payload) => {
          const { submission_id, category } = payload.new;
          // Increment the displayed count
          this.incrementCountDisplay(submission_id, category);
        },
      )
      .subscribe();

    console.log("[VotingSystem] Subscribed to realtime updates");
  }

  // Update count display for a specific submission/category
  updateCountDisplay(submissionId, category, count) {
    document
      .querySelectorAll(`[data-submission-id="${submissionId}"]`)
      .forEach((container) => {
        const btn = container.querySelector(
          `[data-vote-category="${category}"]`,
        );
        if (btn) {
          const countEl = btn.querySelector("[data-vote-count]");
          if (countEl) {
            countEl.textContent = count;
          }
        }
      });
  }

  // Increment count display (for realtime updates)
  incrementCountDisplay(submissionId, category) {
    document
      .querySelectorAll(`[data-submission-id="${submissionId}"]`)
      .forEach((container) => {
        const btn = container.querySelector(
          `[data-vote-category="${category}"]`,
        );
        if (btn) {
          const countEl = btn.querySelector("[data-vote-count]");
          if (countEl) {
            const current = parseInt(countEl.textContent, 10) || 0;
            countEl.textContent = current + 1;
            countEl.classList.add("animate-bump");
            setTimeout(() => countEl.classList.remove("animate-bump"), 300);
          }
        }
      });
  }

  bindEvents() {
    // Vote button clicks
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-vote-btn]");
      if (!btn) return;

      const container = btn.closest("[data-submission-id]");
      const submissionId = container?.dataset.submissionId;
      const category = btn.dataset.voteCategory;

      if (submissionId && category) {
        this.handleVote(submissionId, category, btn);
      }
    });

    // "Clear My Data" button
    const clearBtn = document.querySelector("[data-clear-vote-data]");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (
          confirm(
            "This will clear all your votes and data. Are you sure you want to continue?",
          )
        ) {
          this.clearAllData();
        }
      });
    }
  }

  async handleVote(submissionId, category, button) {
    if (!this.validateHoneypot()) {
      console.log("[VotingSystem] Honeypot triggered");
      return;
    }

    if (!this.validateTiming()) {
      console.log("[VotingSystem] Timing validation failed");
      return;
    }

    if (!this.checkRateLimit()) {
      this.showMessage("Slow down! Take a breather 😅", "warning");
      return;
    }

    if (this.hasVoted(submissionId, category)) {
      return;
    }

    // Record locally first (optimistic update)
    this.recordVote(submissionId, category);
    this.updateButton(button, category, true);

    // If Supabase is enabled, sync to backend
    if (this.supabase) {
      const success = await this.syncVoteToSupabase(submissionId, category);
      if (!success) {
        // If sync failed and it's not a duplicate, increment locally
        this.incrementCount(button);
      }
      // Realtime subscription will handle the count update for successful votes
    } else {
      // No Supabase, just increment locally
      this.incrementCount(button);
    }

    this.playSuccessAnimation(button);

    document.dispatchEvent(
      new CustomEvent("vote:success", {
        detail: { submissionId, category, button },
      }),
    );
  }

  async syncVoteToSupabase(submissionId, category) {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase.from("votes").insert({
        submission_id: submissionId,
        category: category,
        voter_fingerprint: this.deviceId,
      });

      if (error) {
        if (error.code === "23505") {
          // Duplicate vote (unique constraint), this is OK
          console.log("[VotingSystem] Vote already recorded");
          return true;
        }
        console.error("[VotingSystem] Vote sync failed:", error);
        return false;
      }

      return true;
    } catch (e) {
      console.error("[VotingSystem] Vote sync error:", e);
      return false;
    }
  }

  validateHoneypot() {
    // Check both old and new honeypot field names for compatibility
    const honeypot =
      document.getElementById("hp_website") ||
      document.getElementById("website");
    return !honeypot || honeypot.value === "";
  }

  validateTiming() {
    return Date.now() - this.componentLoadTime > this.config.minTimingMs;
  }

  checkRateLimit() {
    const now = Date.now();
    const windowStart = new Date(this.state.rateLimit.windowStart).getTime();

    if (now - windowStart > this.config.rateLimit.windowMs) {
      this.state.rateLimit = {
        count: 0,
        windowStart: new Date().toISOString(),
      };
    }

    if (this.state.rateLimit.count >= this.config.rateLimit.maxVotes) {
      return false;
    }

    this.state.rateLimit.count++;
    this.saveState();
    return true;
  }

  hasVoted(submissionId, category) {
    return this.state.votes[submissionId]?.categories?.[category] === true;
  }

  recordVote(submissionId, category) {
    if (!this.state.votes[submissionId]) {
      this.state.votes[submissionId] = {
        categories: {},
        timestamp: new Date().toISOString(),
      };
    }
    this.state.votes[submissionId].categories[category] = true;
    this.saveState();
  }

  updateButton(button, category, voted) {
    const config = this.config.categories.find((c) => c.id === category);
    if (!config) return;

    if (voted) {
      button.classList.add("is-voted");
      button.setAttribute("aria-pressed", "true");

      const labelEl = button.querySelector("[data-vote-label]");
      const emojiEl = button.querySelector("[data-vote-emoji]");

      if (labelEl) labelEl.textContent = config.votedLabel;
      if (emojiEl) emojiEl.textContent = config.votedEmoji;
    }
  }

  incrementCount(button) {
    const countEl = button.querySelector("[data-vote-count]");
    if (!countEl) return;

    const current = parseInt(countEl.textContent, 10) || 0;
    countEl.textContent = current + 1;
    countEl.classList.add("animate-bump");
    setTimeout(() => countEl.classList.remove("animate-bump"), 300);
  }

  playSuccessAnimation(button) {
    button.classList.add("animate-pop");
    setTimeout(() => button.classList.remove("animate-pop"), 300);
  }

  restoreUI() {
    document.querySelectorAll("[data-submission-id]").forEach((container) => {
      const submissionId = container.dataset.submissionId;
      const votes = this.state.votes[submissionId]?.categories || {};

      Object.entries(votes).forEach(([category, voted]) => {
        if (voted) {
          const btn = container.querySelector(
            `[data-vote-category="${category}"]`,
          );
          if (btn) {
            this.updateButton(btn, category, true);
          }
        }
      });
    });
  }

  showMessage(text, type = "info") {
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50
                       rounded-full px-6 py-3 text-sm font-medium shadow-lg
                       transform transition-all duration-300
                       ${type === "warning" ? "bg-amber-400 text-amber-900" : "bg-slate-800 text-white"}`;
    toast.textContent = text;
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(20px)";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Hydrate vote buttons in a container (e.g., Quick Look modal)
   * Call this after dynamically adding vote buttons to the DOM
   */
  hydrate(container = document) {
    container.querySelectorAll("[data-submission-id]").forEach((el) => {
      const submissionId = el.dataset.submissionId;
      const votes = this.state.votes[submissionId]?.categories || {};

      Object.entries(votes).forEach(([category, voted]) => {
        if (voted) {
          const btn = el.querySelector(`[data-vote-category="${category}"]`);
          if (btn) {
            this.updateButton(btn, category, true);
          }
        }
      });
    });
  }

  destroy() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }
}

// Expose for external use (e.g., Quick Look modal)
window.TSGVoting = window.TSGVoting || {};
window.TSGVoting.hydrate = (container) => {
  if (window.votingSystem) {
    window.votingSystem.hydrate(container);
  }
};
window.TSGVoting.clearAllData = () => {
  if (window.votingSystem) {
    window.votingSystem.clearAllData();
  }
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.votingSystem = new VotingSystem();
  window.votingSystem.init();
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = { VotingSystem };
}
