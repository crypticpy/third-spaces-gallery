/**
 * Third Spaces Youth Design Gallery - Voting System
 *
 * Client-side voting with spam prevention layers:
 * 1. localStorage persistence
 * 2. Cookie backup
 * 3. Browser fingerprinting
 * 4. Rate limiting
 * 5. Honeypot field
 * 6. Time-based validation
 */

const VOTE_CONFIG = {
  categories: [
    { id: 'favorite', label: "I'd use this", emoji: '💖', votedLabel: 'You love this!', votedEmoji: '✓' },
    { id: 'innovative', label: 'Super creative', emoji: '✨', votedLabel: 'You dig it!', votedEmoji: '✓' },
    { id: 'inclusive', label: 'Works for everyone', emoji: '🌍', votedLabel: 'Respect!', votedEmoji: '✓' }
  ],
  storageKey: 'ts:votes:v1',
  cookieKey: 'ts_v',
  rateLimit: { maxVotes: 30, windowMs: 600000 }, // 30 votes per 10 minutes
  minTimingMs: 1500, // Minimum time before vote is valid
  supabaseUrl: null, // Set if using backend
  supabaseKey: null
};

class VotingSystem {
  constructor(config = {}) {
    this.config = { ...VOTE_CONFIG, ...config };
    this.state = this.loadState();
    this.componentLoadTime = Date.now();
    this.fingerprint = null;
  }

  async init() {
    // Generate fingerprint
    this.fingerprint = await this.generateFingerprint();
    this.state.fingerprint = this.fingerprint;
    this.saveState();

    // Bind to all vote buttons on page
    this.bindEvents();

    // Restore vote states in UI
    this.restoreUI();

    console.log('[VotingSystem] Initialized');
  }

  loadState() {
    // Try localStorage first
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[VotingSystem] localStorage read failed:', e);
    }

    // Try cookie fallback
    const cookieState = this.loadFromCookie();
    if (cookieState) {
      return cookieState;
    }

    // Default state
    return {
      votes: {},
      fingerprint: null,
      rateLimit: { count: 0, windowStart: new Date().toISOString() }
    };
  }

  saveState() {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(this.state));
      this.syncToCookie();
    } catch (e) {
      console.warn('[VotingSystem] Failed to save vote state:', e);
    }
  }

  loadFromCookie() {
    const match = document.cookie.match(new RegExp(`${this.config.cookieKey}=([^;]+)`));
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
      console.warn('[VotingSystem] Cookie sync failed:', e);
    }
  }

  async generateFingerprint() {
    const components = [];

    try {
      // Canvas fingerprint
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fp', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    } catch (e) {
      components.push('no-canvas');
    }

    // Screen + timezone + language
    components.push(`${screen.width}x${screen.height}`);
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
    components.push(navigator.language);
    components.push(navigator.hardwareConcurrency || 0);

    const data = components.join('|');

    // Create hash
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    } catch (e) {
      // Fallback for browsers without crypto.subtle
      return btoa(data).slice(0, 16);
    }
  }

  bindEvents() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-vote-btn]');
      if (!btn) return;

      const container = btn.closest('[data-submission-id]');
      const submissionId = container?.dataset.submissionId;
      const category = btn.dataset.voteCategory;

      if (submissionId && category) {
        this.handleVote(submissionId, category, btn);
      }
    });
  }

  async handleVote(submissionId, category, button) {
    // Validation checks
    if (!this.validateHoneypot()) {
      console.log('[VotingSystem] Honeypot triggered');
      return;
    }

    if (!this.validateTiming()) {
      console.log('[VotingSystem] Timing validation failed');
      return;
    }

    if (!this.checkRateLimit()) {
      this.showMessage('Slow down! Take a breather 😅', 'warning');
      return;
    }

    if (this.hasVoted(submissionId, category)) {
      return; // Already voted, button should be disabled
    }

    // Record vote
    this.recordVote(submissionId, category);

    // Update UI
    this.updateButton(button, category, true);
    this.incrementCount(button);
    this.playSuccessAnimation(button);

    // Dispatch custom event for feedback system
    document.dispatchEvent(new CustomEvent('vote:success', {
      detail: { submissionId, category, button }
    }));

    // Sync to backend (async, non-blocking)
    if (this.config.supabaseUrl) {
      this.syncToBackend(submissionId, category).catch(console.error);
    }
  }

  validateHoneypot() {
    const honeypot = document.getElementById('website');
    return !honeypot || honeypot.value === '';
  }

  validateTiming() {
    return Date.now() - this.componentLoadTime > this.config.minTimingMs;
  }

  checkRateLimit() {
    const now = Date.now();
    const windowStart = new Date(this.state.rateLimit.windowStart).getTime();

    if (now - windowStart > this.config.rateLimit.windowMs) {
      this.state.rateLimit = { count: 0, windowStart: new Date().toISOString() };
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
        timestamp: new Date().toISOString()
      };
    }
    this.state.votes[submissionId].categories[category] = true;
    this.saveState();
  }

  updateButton(button, category, voted) {
    const config = this.config.categories.find(c => c.id === category);
    if (!config) return;

    if (voted) {
      button.classList.add('is-voted');
      button.setAttribute('aria-pressed', 'true');

      const labelEl = button.querySelector('[data-vote-label]');
      const emojiEl = button.querySelector('[data-vote-emoji]');

      if (labelEl) labelEl.textContent = config.votedLabel;
      if (emojiEl) emojiEl.textContent = config.votedEmoji;
    }
  }

  incrementCount(button) {
    const countEl = button.querySelector('[data-vote-count]');
    if (!countEl) return;

    const current = parseInt(countEl.textContent, 10) || 0;
    countEl.textContent = current + 1;
    countEl.classList.add('animate-bump');
    setTimeout(() => countEl.classList.remove('animate-bump'), 300);
  }

  playSuccessAnimation(button) {
    button.classList.add('animate-pop');
    setTimeout(() => button.classList.remove('animate-pop'), 300);
  }

  restoreUI() {
    document.querySelectorAll('[data-submission-id]').forEach(container => {
      const submissionId = container.dataset.submissionId;
      const votes = this.state.votes[submissionId]?.categories || {};

      Object.entries(votes).forEach(([category, voted]) => {
        if (voted) {
          const btn = container.querySelector(`[data-vote-category="${category}"]`);
          if (btn) {
            this.updateButton(btn, category, true);
          }
        }
      });
    });
  }

  async syncToBackend(submissionId, category) {
    if (!this.config.supabaseUrl || !this.config.supabaseKey) return;

    try {
      const response = await fetch(`${this.config.supabaseUrl}/rest/v1/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.supabaseKey,
          'Authorization': `Bearer ${this.config.supabaseKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          submission_id: submissionId,
          category: category,
          fingerprint_hash: this.fingerprint
        })
      });

      if (!response.ok && response.status !== 409) { // 409 = duplicate, OK
        console.error('[VotingSystem] Vote sync failed:', response.status);
      }
    } catch (e) {
      console.error('[VotingSystem] Vote sync error:', e);
    }
  }

  showMessage(text, type = 'info') {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50
                       rounded-full px-6 py-3 text-sm font-medium shadow-lg
                       transform transition-all duration-300
                       ${type === 'warning' ? 'bg-amber-400 text-amber-900' : 'bg-slate-800 text-white'}`;
    toast.textContent = text;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Get vote counts for a submission (from Supabase if enabled)
  async getVoteCounts(submissionId) {
    if (!this.config.supabaseUrl) {
      return null; // No backend, counts come from static data
    }

    try {
      const response = await fetch(
        `${this.config.supabaseUrl}/rest/v1/vote_counts?submission_id=eq.${submissionId}`,
        {
          headers: {
            'apikey': this.config.supabaseKey,
            'Authorization': `Bearer ${this.config.supabaseKey}`
          }
        }
      );
      const data = await response.json();
      return data[0] || null;
    } catch {
      return null;
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.votingSystem = new VotingSystem();
  window.votingSystem.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VotingSystem };
}
