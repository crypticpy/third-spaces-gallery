/**
 * Third Spaces Youth Design Gallery - Feedback System
 *
 * Collects moderated feedback/comments from visitors
 * Comments are stored in Supabase and require moderation before display
 */

class FeedbackSystem {
  constructor() {
    this.supabase = null;
    this.submittedFeedback = this.loadSubmittedFeedback();
  }

  async init() {
    // Initialize Supabase if configured
    if (window.ThirdSpacesSupabase?.isConfigured()) {
      this.supabase = window.ThirdSpacesSupabase.getClient();
    }

    this.bindEvents();
    this.restoreFormStates();

    console.log(
      "[FeedbackSystem] Initialized",
      this.supabase ? "(Supabase enabled)" : "(disabled)",
    );
  }

  loadSubmittedFeedback() {
    try {
      const stored = localStorage.getItem("ts:feedback:v1");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  saveSubmittedFeedback() {
    try {
      localStorage.setItem(
        "ts:feedback:v1",
        JSON.stringify(this.submittedFeedback),
      );
    } catch (e) {
      console.warn("[FeedbackSystem] Failed to save feedback state:", e);
    }
  }

  bindEvents() {
    // Handle feedback form submissions
    document.addEventListener("submit", (e) => {
      const form = e.target.closest("[data-feedback-form]");
      if (!form) return;

      e.preventDefault();
      this.handleSubmit(form);
    });

    // Handle tag selection
    document.addEventListener("click", (e) => {
      const tag = e.target.closest("[data-feedback-tag]");
      if (!tag) return;

      tag.classList.toggle("is-selected");
      tag.setAttribute("aria-pressed", tag.classList.contains("is-selected"));
    });
  }

  async handleSubmit(form) {
    const submissionId = form.dataset.submissionId;
    if (!submissionId) return;

    // Check if already submitted for this submission
    if (this.submittedFeedback[submissionId]) {
      this.showMessage("You already shared feedback for this design!", "info");
      return;
    }

    // Gather form data
    const authorName =
      form.querySelector("[data-feedback-name]")?.value.trim() || "Anonymous";
    const feedbackText = form
      .querySelector("[data-feedback-text]")
      ?.value.trim();
    const selectedTags = Array.from(
      form.querySelectorAll("[data-feedback-tag].is-selected"),
    ).map((tag) => tag.dataset.feedbackTag);

    // Validate
    if (!feedbackText && selectedTags.length === 0) {
      this.showMessage(
        "Please add a comment or select at least one tag",
        "warning",
      );
      return;
    }

    // Check honeypot
    const honeypot = form.querySelector("[data-feedback-honeypot]");
    if (honeypot && honeypot.value !== "") {
      console.log("[FeedbackSystem] Honeypot triggered");
      // Fake success to not alert bots
      this.showSuccess(form, submissionId);
      return;
    }

    // Submit to Supabase
    if (this.supabase) {
      try {
        const { error } = await this.supabase.from("feedback").insert({
          submission_id: submissionId,
          author_name: authorName,
          feedback_text: feedbackText || null,
          tags: selectedTags,
          approved: false, // Requires moderation
        });

        if (error) {
          console.error("[FeedbackSystem] Submit failed:", error);
          this.showMessage("Something went wrong. Please try again.", "error");
          return;
        }
      } catch (e) {
        console.error("[FeedbackSystem] Submit error:", e);
        this.showMessage("Something went wrong. Please try again.", "error");
        return;
      }
    }

    // Record submission locally
    this.submittedFeedback[submissionId] = {
      timestamp: new Date().toISOString(),
      tags: selectedTags,
    };
    this.saveSubmittedFeedback();

    // Show success
    this.showSuccess(form, submissionId);
  }

  showSuccess(form, submissionId) {
    // Hide form, show thank you message
    form.innerHTML = `
      <div class="text-center py-6">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-sea/20 mb-4">
          <svg class="w-6 h-6 text-brand-sea" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <p class="text-lg font-semibold text-brand-navy">Thanks for your feedback!</p>
        <p class="text-sm text-brand-stone mt-1">Your input helps improve these designs.</p>
      </div>
    `;
  }

  restoreFormStates() {
    // Disable forms for already-submitted feedback
    document.querySelectorAll("[data-feedback-form]").forEach((form) => {
      const submissionId = form.dataset.submissionId;
      if (this.submittedFeedback[submissionId]) {
        this.showSuccess(form, submissionId);
      }
    });
  }

  showMessage(text, type = "info") {
    const colors = {
      info: "bg-brand-sky text-white",
      warning: "bg-amber-400 text-amber-900",
      error: "bg-red-500 text-white",
      success: "bg-brand-sea text-white",
    };

    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50
                       rounded-full px-6 py-3 text-sm font-medium shadow-lg
                       transform transition-all duration-300 ${colors[type] || colors.info}`;
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
}

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.feedbackSystem = new FeedbackSystem();
  window.feedbackSystem.init();
});
