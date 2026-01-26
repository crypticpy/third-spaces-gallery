/**
 * Third Spaces Youth Design Gallery - Feedback Display System
 *
 * Loads and displays approved feedback for design submissions.
 * Handles upvoting with Supabase backend and localStorage tracking.
 * Falls back gracefully when Supabase is not configured.
 */

(function () {
  "use strict";

  var UPVOTE_STORAGE_KEY = "ts:feedback_upvotes:v1";
  var DEVICE_KEY = "tsg_device_id";

  /**
   * Format a timestamp into a human-readable relative string.
   */
  function relativeTime(dateString) {
    var now = Date.now();
    var then = new Date(dateString).getTime();
    var diffMs = now - then;

    if (diffMs < 0) return "just now";

    var seconds = Math.floor(diffMs / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);

    if (seconds < 60) return "just now";
    if (minutes < 60) return minutes + "m ago";
    if (hours < 24) return hours + "h ago";
    return days + "d ago";
  }

  /**
   * Load upvoted feedback IDs from localStorage.
   */
  function loadUpvotedIds() {
    try {
      var stored = localStorage.getItem(UPVOTE_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn("[FeedbackDisplay] Failed to load upvote state:", e);
    }
    return {};
  }

  /**
   * Save upvoted feedback IDs to localStorage.
   */
  function saveUpvotedIds(upvoted) {
    try {
      localStorage.setItem(UPVOTE_STORAGE_KEY, JSON.stringify(upvoted));
    } catch (e) {
      console.warn("[FeedbackDisplay] Failed to save upvote state:", e);
    }
  }

  /**
   * Get the device ID from localStorage.
   */
  function getDeviceId() {
    try {
      var id = localStorage.getItem(DEVICE_KEY);
      if (id) return id;
      // Generate a new stable device ID
      var newId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
              /[xy]/g,
              function (c) {
                var r = (Math.random() * 16) | 0;
                return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
              },
            );
      localStorage.setItem(DEVICE_KEY, newId);
      return newId;
    } catch (e) {
      // localStorage unavailable — return a per-page ephemeral ID
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        },
      );
    }
  }

  /**
   * Render a single feedback card as a DOM element.
   */
  function renderFeedbackCard(item, isUpvoted) {
    var authorName = item.author_name || "Anonymous";
    var feedbackText = item.feedback_text || "";
    var upvoteCount = item.upvote_count || 0;
    var timestamp = relativeTime(item.created_at);

    // Card wrapper
    var card = document.createElement("div");
    card.className =
      "rounded-xl border border-brand-sky/10 bg-white/50 p-4 dark:bg-gray-800/50 dark:border-gray-700";

    // Flex row
    var flexRow = document.createElement("div");
    flexRow.className = "flex items-start justify-between gap-2";

    // Content area
    var contentArea = document.createElement("div");
    contentArea.className = "flex-1 min-w-0";

    // Author name
    var authorSpan = document.createElement("span");
    authorSpan.className =
      "text-sm font-semibold text-brand-navy dark:text-gray-200";
    authorSpan.textContent = authorName;
    contentArea.appendChild(authorSpan);

    // Timestamp
    var timeSpan = document.createElement("span");
    timeSpan.className = "text-xs text-brand-cloud dark:text-gray-500 ml-2";
    timeSpan.textContent = timestamp;
    contentArea.appendChild(timeSpan);

    // Tags
    if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
      var tagsContainer = document.createElement("div");
      tagsContainer.className = "flex flex-wrap gap-1 mt-1";
      item.tags.forEach(function (tag) {
        var tagSpan = document.createElement("span");
        tagSpan.className =
          "inline-flex rounded-full bg-brand-sky/10 px-2 py-0.5 text-xs font-medium text-brand-sky";
        tagSpan.textContent = tag;
        tagsContainer.appendChild(tagSpan);
      });
      contentArea.appendChild(tagsContainer);
    }

    // Feedback text
    if (feedbackText) {
      var textP = document.createElement("p");
      textP.className = "text-sm text-brand-stone dark:text-gray-400 mt-1";
      textP.textContent = feedbackText;
      contentArea.appendChild(textP);
    }

    flexRow.appendChild(contentArea);

    // Upvote button
    var upvoteBtn = document.createElement("button");
    upvoteBtn.setAttribute("data-feedback-upvote", item.id);
    var upvoteBtnClass =
      "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold transition-all";
    if (isUpvoted) {
      upvoteBtnClass +=
        " border-brand-sky bg-brand-sky/10 text-brand-sky is-upvoted";
    } else {
      upvoteBtnClass +=
        " border-brand-sky/15 text-brand-stone hover:border-brand-sky hover:bg-brand-sky/10";
    }
    upvoteBtn.className = upvoteBtnClass;
    upvoteBtn.setAttribute("aria-pressed", isUpvoted ? "true" : "false");
    upvoteBtn.setAttribute("aria-label", "Upvote this feedback");

    // SVG icon (static markup, no user data)
    var svgWrapper = document.createElement("span");
    svgWrapper.innerHTML =
      '<svg class="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 10V2M6 2L2 6M6 2l4 4"/></svg>';
    upvoteBtn.appendChild(svgWrapper.firstChild);

    // Upvote count
    var countSpan = document.createElement("span");
    countSpan.setAttribute("data-upvote-count", "");
    countSpan.textContent = upvoteCount;
    upvoteBtn.appendChild(countSpan);

    flexRow.appendChild(upvoteBtn);
    card.appendChild(flexRow);

    return card;
  }

  /**
   * Render the empty state message as a DOM element.
   */
  function renderEmptyState() {
    var p = document.createElement("p");
    p.className =
      "text-sm text-brand-stone dark:text-gray-400 text-center py-6";
    p.textContent = "No feedback yet. Be the first to share your thoughts!";
    return p;
  }

  /**
   * Initialize feedback display for a single container.
   */
  async function initContainer(container) {
    var submissionId = container.dataset.submissionId;
    if (!submissionId) return;

    var listEl = container.querySelector("[data-feedback-list]");
    if (!listEl) return;

    // Require Supabase
    if (
      !window.ThirdSpacesSupabase ||
      !window.ThirdSpacesSupabase.isConfigured()
    ) {
      console.log("[FeedbackDisplay] Supabase not configured, skipping");
      return;
    }

    var supabase = window.ThirdSpacesSupabase.getClient();
    if (!supabase) return;

    try {
      // Fetch approved feedback and upvote counts in parallel
      var feedbackPromise = supabase
        .from("feedback")
        .select("id, author_name, feedback_text, tags, created_at")
        .eq("submission_id", submissionId)
        .eq("approved", true)
        .order("created_at", { ascending: false });

      var upvotePromise = supabase
        .from("feedback_upvote_counts")
        .select("feedback_id, count");

      var results = await Promise.all([feedbackPromise, upvotePromise]);

      var feedbackResult = results[0];
      var upvoteResult = results[1];

      if (feedbackResult.error) {
        console.error(
          "[FeedbackDisplay] Failed to load feedback:",
          feedbackResult.error,
        );
        return;
      }

      var feedbackItems = feedbackResult.data || [];

      // Build upvote count map
      var upvoteCounts = {};
      if (!upvoteResult.error && upvoteResult.data) {
        upvoteResult.data.forEach(function (row) {
          upvoteCounts[row.feedback_id] = parseInt(row.count, 10) || 0;
        });
      }

      // Merge upvote counts into feedback items
      feedbackItems.forEach(function (item) {
        item.upvote_count = upvoteCounts[item.id] || 0;
      });

      // Sort by upvotes desc, then date desc
      feedbackItems.sort(function (a, b) {
        if (b.upvote_count !== a.upvote_count) {
          return b.upvote_count - a.upvote_count;
        }
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      // Load already-upvoted IDs
      var upvotedIds = loadUpvotedIds();

      // Render
      if (feedbackItems.length === 0) {
        // Only show empty state if the feedback form also exists on the page
        var feedbackForm = document.querySelector("[data-feedback-prompt]");
        if (feedbackForm) {
          while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
          listEl.appendChild(renderEmptyState());
        }
        return;
      }

      while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
      feedbackItems.forEach(function (item) {
        var isUpvoted = upvotedIds[item.id] === true;
        listEl.appendChild(renderFeedbackCard(item, isUpvoted));
      });

      console.log(
        "[FeedbackDisplay] Rendered",
        feedbackItems.length,
        "feedback items for",
        submissionId,
      );
    } catch (e) {
      console.error("[FeedbackDisplay] Error loading feedback:", e);
    }
  }

  /**
   * Handle upvote button clicks via event delegation.
   */
  function bindUpvoteEvents() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-feedback-upvote]");
      if (!btn) return;

      // Prevent double-clicks
      if (btn.classList.contains("is-upvoted")) return;

      var feedbackId = btn.dataset.feedbackUpvote;
      if (!feedbackId) return;

      handleUpvote(feedbackId, btn);
    });
  }

  /**
   * Process an upvote: persist to Supabase, update localStorage, update UI.
   */
  async function handleUpvote(feedbackId, button) {
    var deviceId = getDeviceId();
    if (!deviceId) {
      console.warn("[FeedbackDisplay] No device ID available for upvote");
      return;
    }

    if (
      !window.ThirdSpacesSupabase ||
      !window.ThirdSpacesSupabase.isConfigured()
    ) {
      return;
    }

    var supabase = window.ThirdSpacesSupabase.getClient();
    if (!supabase) return;

    try {
      var result = await supabase
        .from("feedback_upvotes")
        .insert({ feedback_id: feedbackId, voter_fingerprint: deviceId });

      if (result.error) {
        if (result.error.code === "23505") {
          // Duplicate upvote -- silently mark as upvoted in UI
          markUpvoted(feedbackId, button);
          return;
        }
        console.error("[FeedbackDisplay] Upvote failed:", result.error);
        return;
      }

      // Success
      markUpvoted(feedbackId, button);

      // Increment displayed count
      var countEl = button.querySelector("[data-upvote-count]");
      if (countEl) {
        var current = parseInt(countEl.textContent, 10) || 0;
        countEl.textContent = current + 1;
      }
    } catch (e) {
      console.error("[FeedbackDisplay] Upvote error:", e);
    }
  }

  /**
   * Mark a feedback item as upvoted in both UI and localStorage.
   */
  function markUpvoted(feedbackId, button) {
    // Update button state
    button.classList.add("is-upvoted");
    button.classList.remove(
      "border-brand-sky/15",
      "text-brand-stone",
      "hover:border-brand-sky",
      "hover:bg-brand-sky/10",
    );
    button.classList.add(
      "border-brand-sky",
      "bg-brand-sky/10",
      "text-brand-sky",
    );
    button.setAttribute("aria-pressed", "true");

    // Persist to localStorage
    var upvotedIds = loadUpvotedIds();
    upvotedIds[feedbackId] = true;
    saveUpvotedIds(upvotedIds);
  }

  // Initialize on DOM ready
  document.addEventListener("DOMContentLoaded", function () {
    var containers = document.querySelectorAll("[data-feedback-display]");
    if (containers.length === 0) return;

    // Bind upvote click handler once
    bindUpvoteEvents();

    // Initialize each container
    containers.forEach(function (container) {
      initContainer(container);
    });

    console.log(
      "[FeedbackDisplay] Initialized for",
      containers.length,
      "container(s)",
    );
  });
})();
