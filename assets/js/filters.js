/**
 * Third Spaces Youth Design Gallery - Filtering & Sorting System
 *
 * Client-side filtering by feature category and sorting by various criteria.
 * Updates URL state for shareable filtered views.
 */

class GalleryFilters {
  constructor() {
    this.grid = document.querySelector('[data-submissions-grid]');
    this.filterChips = document.querySelectorAll('[data-filter]');
    this.sortSelect = document.querySelector('[data-sort]');
    this.resultsCount = document.querySelector('[data-results-count]');
    this.emptyState = document.querySelector('[data-empty-state]');

    this.currentFilter = 'all';
    this.currentSort = 'recent';
  }

  init() {
    if (!this.grid) return;

    // Read initial state from URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('filter')) {
      this.currentFilter = params.get('filter');
    }
    if (params.has('sort')) {
      this.currentSort = params.get('sort');
    }

    this.bindEvents();
    this.updateFilterUI();
    this.updateSortUI();
    this.applyFiltersAndSort();

    console.log('[GalleryFilters] Initialized');
  }

  bindEvents() {
    // Filter chip clicks
    this.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        this.currentFilter = chip.dataset.filter;
        this.updateFilterUI();
        this.applyFiltersAndSort();
        this.updateURL();
      });
    });

    // Sort select change
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', () => {
        this.currentSort = this.sortSelect.value;
        this.applyFiltersAndSort();
        this.updateURL();
      });
    }

    // Handle browser back/forward
    window.addEventListener('popstate', () => {
      const params = new URLSearchParams(window.location.search);
      this.currentFilter = params.get('filter') || 'all';
      this.currentSort = params.get('sort') || 'recent';
      this.updateFilterUI();
      this.updateSortUI();
      this.applyFiltersAndSort();
    });
  }

  updateFilterUI() {
    this.filterChips.forEach(chip => {
      const isActive = chip.dataset.filter === this.currentFilter;
      chip.setAttribute('aria-pressed', isActive.toString());
    });
  }

  updateSortUI() {
    if (this.sortSelect) {
      this.sortSelect.value = this.currentSort;
    }
  }

  applyFiltersAndSort() {
    const cards = Array.from(this.grid.querySelectorAll('[data-submission-id]'));

    // Filter
    let visibleCards = cards;
    if (this.currentFilter !== 'all') {
      visibleCards = cards.filter(card => {
        const features = card.dataset.submissionFeatures?.split(',') || [];
        return features.includes(this.currentFilter);
      });
    }

    // Sort
    visibleCards = this.sortCards(visibleCards);

    // Hide all first
    cards.forEach(card => {
      card.style.display = 'none';
      card.style.order = '0';
    });

    // Show and order filtered cards
    visibleCards.forEach((card, index) => {
      card.style.display = '';
      card.style.order = index.toString();
    });

    // Update results count
    this.updateResultsCount(visibleCards.length);

    // Show/hide empty state
    if (this.emptyState) {
      this.emptyState.classList.toggle('hidden', visibleCards.length > 0);
    }
  }

  sortCards(cards) {
    return [...cards].sort((a, b) => {
      switch (this.currentSort) {
        case 'popular': {
          const aTotal = this.getTotalVotes(a);
          const bTotal = this.getTotalVotes(b);
          return bTotal - aTotal;
        }
        case 'innovative': {
          const aInnovative = parseInt(a.dataset.submissionVotesInnovative, 10) || 0;
          const bInnovative = parseInt(b.dataset.submissionVotesInnovative, 10) || 0;
          return bInnovative - aInnovative;
        }
        case 'inclusive': {
          const aInclusive = parseInt(a.dataset.submissionVotesInclusive, 10) || 0;
          const bInclusive = parseInt(b.dataset.submissionVotesInclusive, 10) || 0;
          return bInclusive - aInclusive;
        }
        case 'recent':
        default: {
          const aDate = new Date(a.dataset.submissionDate || 0);
          const bDate = new Date(b.dataset.submissionDate || 0);
          return bDate - aDate;
        }
      }
    });
  }

  getTotalVotes(card) {
    const favorite = parseInt(card.dataset.submissionVotesFavorite, 10) || 0;
    const innovative = parseInt(card.dataset.submissionVotesInnovative, 10) || 0;
    const inclusive = parseInt(card.dataset.submissionVotesInclusive, 10) || 0;
    return favorite + innovative + inclusive;
  }

  updateResultsCount(count) {
    if (!this.resultsCount) return;

    const countSpan = this.resultsCount.querySelector('.font-semibold');
    if (countSpan) {
      countSpan.textContent = count;
    }

    // Update text based on filter
    let filterText = '';
    if (this.currentFilter !== 'all') {
      const activeChip = document.querySelector(`[data-filter="${this.currentFilter}"]`);
      filterText = activeChip ? ` in ${activeChip.textContent.trim()}` : '';
    }

    this.resultsCount.innerHTML = `Showing <span class="font-semibold text-brand-navy">${count}</span> design${count !== 1 ? 's' : ''}${filterText}`;
  }

  updateURL() {
    const params = new URLSearchParams();

    if (this.currentFilter !== 'all') {
      params.set('filter', this.currentFilter);
    }
    if (this.currentSort !== 'recent') {
      params.set('sort', this.currentSort);
    }

    const newURL = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    history.pushState({ filter: this.currentFilter, sort: this.currentSort }, '', newURL);
  }
}

// Feedback System (linked to voting)
class FeedbackSystem {
  constructor() {
    this.votingSystem = null;
  }

  init(votingSystem) {
    this.votingSystem = votingSystem;
    this.bindEvents();
    console.log('[FeedbackSystem] Initialized');
  }

  bindEvents() {
    // Show feedback prompt after successful vote
    document.addEventListener('vote:success', (e) => {
      const { submissionId, category, button } = e.detail;
      this.showPrompt(submissionId, category, button);
    });

    // Tag toggle
    document.addEventListener('click', (e) => {
      const tag = e.target.closest('[data-feedback-tag]');
      if (tag) {
        const pressed = tag.getAttribute('aria-pressed') === 'true';
        tag.setAttribute('aria-pressed', String(!pressed));
        this.updateSubmitState(tag.closest('[data-feedback-prompt]'));
      }
    });

    // Text input
    document.addEventListener('input', (e) => {
      if (e.target.matches('[data-feedback-text]')) {
        const prompt = e.target.closest('[data-feedback-prompt]');
        const charCount = prompt.querySelector('[data-feedback-chars]');
        if (charCount) {
          charCount.textContent = e.target.value.length;
        }
        this.updateSubmitState(prompt);
      }
    });

    // Submit
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-feedback-submit]')) {
        this.submitFeedback(e.target.closest('[data-feedback-prompt]'));
      }
      if (e.target.matches('[data-feedback-skip]')) {
        this.hidePrompt(e.target.closest('[data-feedback-prompt]'));
      }
    });
  }

  showPrompt(submissionId, category, nearElement) {
    const prompt = document.querySelector(
      `[data-feedback-prompt][data-submission-id="${submissionId}"]`
    );
    if (!prompt) return;

    prompt.dataset.voteCategory = category;
    prompt.hidden = false;

    // Focus on text area after a short delay
    setTimeout(() => {
      prompt.querySelector('[data-feedback-text]')?.focus();
    }, 100);
  }

  hidePrompt(prompt) {
    if (!prompt) return;

    prompt.hidden = true;
    // Reset state
    prompt.querySelectorAll('[data-feedback-tag]').forEach(tag => {
      tag.setAttribute('aria-pressed', 'false');
    });
    const textInput = prompt.querySelector('[data-feedback-text]');
    if (textInput) textInput.value = '';
    const charCount = prompt.querySelector('[data-feedback-chars]');
    if (charCount) charCount.textContent = '0';
  }

  updateSubmitState(prompt) {
    if (!prompt) return;

    const textInput = prompt.querySelector('[data-feedback-text]');
    const hasText = textInput && textInput.value.trim().length > 0;
    const hasTags = prompt.querySelectorAll('[data-feedback-tag][aria-pressed="true"]').length > 0;

    const submitBtn = prompt.querySelector('[data-feedback-submit]');
    if (submitBtn) {
      submitBtn.disabled = !(hasText || hasTags);
    }
  }

  async submitFeedback(prompt) {
    if (!prompt) return;

    const submissionId = prompt.dataset.submissionId;
    const category = prompt.dataset.voteCategory;
    const textInput = prompt.querySelector('[data-feedback-text]');
    const text = textInput ? textInput.value.trim() : '';
    const tags = Array.from(
      prompt.querySelectorAll('[data-feedback-tag][aria-pressed="true"]')
    ).map(t => t.dataset.feedbackTag);

    // Basic validation
    if (!text && tags.length === 0) return;

    // Show loading state
    const submitBtn = prompt.querySelector('[data-feedback-submit]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    try {
      // In production, send to Supabase or other backend
      console.log('[FeedbackSystem] Feedback submitted:', {
        submission_id: submissionId,
        type: 'quick_reaction',
        content: text || null,
        quick_tags: tags.length ? tags : null,
        vote_category: category,
        fingerprint_hash: this.votingSystem?.fingerprint
      });

      // Success
      this.hidePrompt(prompt);
      if (this.votingSystem) {
        this.votingSystem.showMessage('Thanks for sharing! 🙌', 'success');
      }
    } catch (e) {
      console.error('[FeedbackSystem] Submit error:', e);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Share 💬';
      }
      if (this.votingSystem) {
        this.votingSystem.showMessage('Oops, try again?', 'error');
      }
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize filters
  const filters = new GalleryFilters();
  filters.init();

  // Initialize feedback (after voting system is ready)
  const feedback = new FeedbackSystem();

  // Wait for voting system to be ready
  const checkVotingSystem = setInterval(() => {
    if (window.votingSystem) {
      feedback.init(window.votingSystem);
      clearInterval(checkVotingSystem);
    }
  }, 100);

  // Timeout after 5 seconds
  setTimeout(() => clearInterval(checkVotingSystem), 5000);
});
