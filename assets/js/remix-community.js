/**
 * Third Spaces Youth Design Gallery - Community Remixes
 *
 * Loads and displays approved published remixes from the community.
 * Handles upvoting with localStorage deduplication and Supabase persistence.
 */

(() => {
  const UPVOTE_STORAGE_KEY = "ts:remix_upvotes:v1";

  // ── Helpers ────────────────────────────────────────────────────────

  /**
   * Convert an ISO date string to a human-friendly relative timestamp.
   * @param {string} dateStr - ISO 8601 date string
   * @returns {string} e.g. "just now", "3 minutes ago", "2 days ago"
   */
  const relativeTime = (dateStr) => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;

    if (diffMs < 0) return "just now";

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);

    if (seconds < 60) return "just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours === 1) return "1 hour ago";
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return "1 day ago";
    if (days < 7) return `${days} days ago`;
    if (weeks === 1) return "1 week ago";
    if (weeks < 5) return `${weeks} weeks ago`;
    if (months === 1) return "1 month ago";
    if (months < 12) return `${months} months ago`;

    return new Date(dateStr).toLocaleDateString();
  };

  /**
   * Escape HTML to prevent XSS when inserting user-generated content.
   * @param {string} str
   * @returns {string}
   */
  const escapeHtml = (str) => {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  // ── localStorage helpers for upvote tracking ──────────────────────

  const loadUpvoted = () => {
    try {
      const stored = localStorage.getItem(UPVOTE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveUpvoted = (upvoted) => {
    try {
      localStorage.setItem(UPVOTE_STORAGE_KEY, JSON.stringify(upvoted));
    } catch (e) {
      console.warn("[RemixCommunity] Failed to save upvote state:", e);
    }
  };

  // ── Card rendering ────────────────────────────────────────────────

  /**
   * Count unique source submissions in a features array.
   * @param {Array} features
   * @returns {number}
   */
  const countUniqueSources = (features) => {
    const sources = new Set(
      features.map((f) => f.sourceSubmission).filter(Boolean),
    );
    return sources.size;
  };

  /**
   * Build a single remix card element.
   * @param {object} remix - Remix row from Supabase
   * @param {number} upvoteCount - Aggregated upvote count
   * @param {boolean} alreadyUpvoted - Whether current user has upvoted
   * @returns {HTMLElement}
   */
  const buildCard = (remix, upvoteCount, alreadyUpvoted) => {
    const features = Array.isArray(remix.features) ? remix.features : [];
    const sourceCount = countUniqueSources(features);
    const MAX_VISIBLE = 8;
    const visibleFeatures = features.slice(0, MAX_VISIBLE);
    const overflowCount = features.length - MAX_VISIBLE;

    const card = document.createElement("div");
    card.className =
      "rounded-2xl border border-brand-sky/10 bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700";
    card.dataset.communityRemixId = remix.id;

    // Header: author + timestamp
    const header = document.createElement("div");
    header.className = "flex items-center justify-between gap-2 mb-3";
    header.innerHTML = `
      <span class="text-base font-semibold text-brand-navy dark:text-gray-100">${escapeHtml(remix.author_name || "Anonymous")}</span>
      <span class="text-xs text-brand-stone dark:text-gray-500 whitespace-nowrap">${relativeTime(remix.created_at)}</span>
    `;
    card.appendChild(header);

    // Badge: feature count
    if (features.length > 0) {
      const badge = document.createElement("div");
      badge.className = "mb-3";
      badge.innerHTML = `
        <span class="inline-flex items-center rounded-full bg-brand-sky/10 px-2.5 py-0.5 text-xs font-medium text-brand-sky">
          ${features.length} feature${features.length !== 1 ? "s" : ""} from ${sourceCount} design${sourceCount !== 1 ? "s" : ""}
        </span>
      `;
      card.appendChild(badge);
    }

    // Feature chips
    if (visibleFeatures.length > 0) {
      const chipWrap = document.createElement("div");
      chipWrap.className = "flex flex-wrap gap-1.5 mb-3";

      visibleFeatures.forEach((f) => {
        const chip = document.createElement("span");
        chip.className =
          "inline-flex items-center gap-1 rounded-full bg-brand-purple/10 px-2.5 py-1 text-xs font-medium text-brand-purple dark:bg-purple-900/30 dark:text-purple-300";
        chip.innerHTML = `<span aria-hidden="true">${escapeHtml(f.icon || "")}</span>${escapeHtml(f.name || f.id || "")}`;
        chipWrap.appendChild(chip);
      });

      if (overflowCount > 0) {
        const more = document.createElement("span");
        more.className =
          "inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400";
        more.textContent = `+${overflowCount} more`;
        chipWrap.appendChild(more);
      }

      card.appendChild(chipWrap);
    }

    // User note
    if (remix.user_note) {
      const note = document.createElement("p");
      note.className =
        "text-sm italic text-brand-stone dark:text-gray-400 mt-2";
      note.textContent = remix.user_note;
      card.appendChild(note);
    }

    // Upvote button
    const upvoteRow = document.createElement("div");
    upvoteRow.className = "mt-4 flex items-center";

    const upvoteBtn = document.createElement("button");
    upvoteBtn.type = "button";
    upvoteBtn.dataset.upvoteRemix = remix.id;
    upvoteBtn.setAttribute("aria-label", `Upvote this remix (${upvoteCount})`);
    upvoteBtn.className = [
      "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
      "text-sm font-medium transition-all duration-200",
      "border",
      alreadyUpvoted
        ? "is-upvoted bg-brand-sky/15 border-brand-sky text-brand-sky dark:bg-brand-sky/20 dark:border-brand-sky/60 dark:text-sky-300"
        : "bg-white border-gray-200 text-gray-500 hover:border-brand-sky hover:text-brand-sky dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:border-brand-sky dark:hover:text-sky-300",
    ].join(" ");

    upvoteBtn.innerHTML = `
      <svg class="w-4 h-4" fill="${alreadyUpvoted ? "currentColor" : "none"}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/>
      </svg>
      <span data-upvote-count>${upvoteCount}</span>
    `;

    if (alreadyUpvoted) {
      upvoteBtn.setAttribute("aria-pressed", "true");
    }

    upvoteRow.appendChild(upvoteBtn);
    card.appendChild(upvoteRow);

    return card;
  };

  // ── Main initialization ───────────────────────────────────────────

  const init = async () => {
    const container = document.querySelector("[data-community-remixes]");
    if (!container) return;

    if (!window.ThirdSpacesSupabase?.isConfigured()) {
      console.log("[RemixCommunity] Supabase not configured, skipping.");
      return;
    }

    const supabase = window.ThirdSpacesSupabase.getClient();
    if (!supabase) {
      console.warn("[RemixCommunity] Supabase client unavailable.");
      return;
    }

    const list = container.querySelector("[data-community-remix-list]");
    if (!list) return;

    // Show loading state
    list.innerHTML = `
      <div class="text-center py-8 text-brand-stone dark:text-gray-400 text-sm">
        Loading community remixes...
      </div>
    `;

    try {
      // Fetch remixes and upvote counts in parallel
      const [remixResult, countsResult] = await Promise.all([
        supabase
          .from("published_remixes")
          .select("id, author_name, user_note, features, created_at")
          .eq("approved", true)
          .order("created_at", { ascending: false }),
        supabase.from("remix_upvote_counts").select("remix_id, count"),
      ]);

      if (remixResult.error) {
        console.error(
          "[RemixCommunity] Failed to fetch remixes:",
          remixResult.error,
        );
        list.innerHTML = `
          <div class="text-center py-8 text-brand-stone dark:text-gray-400 text-sm">
            Could not load community remixes. Please try again later.
          </div>
        `;
        return;
      }

      const remixes = remixResult.data || [];

      if (remixes.length === 0) {
        list.innerHTML = `
          <div class="text-center py-8 text-brand-stone dark:text-gray-400 text-sm">
            No community remixes yet. Be the first to publish yours!
          </div>
        `;
        return;
      }

      // Build a map of upvote counts: remix_id -> count
      const countMap = {};
      if (!countsResult.error && countsResult.data) {
        countsResult.data.forEach((row) => {
          countMap[row.remix_id] = parseInt(row.count, 10) || 0;
        });
      }

      // Attach counts to remixes and sort: upvotes desc, then date desc
      const enriched = remixes.map((r) => ({
        ...r,
        _upvotes: countMap[r.id] || 0,
        _ts: new Date(r.created_at).getTime(),
      }));

      enriched.sort((a, b) => {
        if (b._upvotes !== a._upvotes) return b._upvotes - a._upvotes;
        return b._ts - a._ts;
      });

      // Load already-upvoted state
      const upvoted = loadUpvoted();

      // Render cards
      list.innerHTML = "";
      enriched.forEach((remix) => {
        const card = buildCard(remix, remix._upvotes, !!upvoted[remix.id]);
        list.appendChild(card);
      });
    } catch (e) {
      console.error("[RemixCommunity] Init error:", e);
      list.innerHTML = `
        <div class="text-center py-8 text-brand-stone dark:text-gray-400 text-sm">
          Could not load community remixes. Please try again later.
        </div>
      `;
    }
  };

  // ── Upvote click handler ──────────────────────────────────────────

  const handleUpvoteClick = async (btn) => {
    const remixId = btn.dataset.upvoteRemix;
    if (!remixId) return;

    // Prevent double-upvoting
    const upvoted = loadUpvoted();
    if (upvoted[remixId]) return;

    if (!window.ThirdSpacesSupabase?.isConfigured()) return;

    const supabase = window.ThirdSpacesSupabase.getClient();
    if (!supabase) return;

    const deviceId = localStorage.getItem("tsg_device_id") || "anonymous";

    // Optimistic UI update
    upvoted[remixId] = true;
    saveUpvoted(upvoted);

    const countEl = btn.querySelector("[data-upvote-count]");
    const currentCount = parseInt(countEl?.textContent, 10) || 0;
    if (countEl) {
      countEl.textContent = currentCount + 1;
    }

    // Update button styles to upvoted state
    btn.classList.add("is-upvoted");
    btn.classList.remove(
      "bg-white",
      "border-gray-200",
      "text-gray-500",
      "hover:border-brand-sky",
      "hover:text-brand-sky",
      "dark:bg-gray-800",
      "dark:border-gray-600",
      "dark:text-gray-400",
      "dark:hover:border-brand-sky",
      "dark:hover:text-sky-300",
    );
    btn.classList.add(
      "bg-brand-sky/15",
      "border-brand-sky",
      "text-brand-sky",
      "dark:bg-brand-sky/20",
      "dark:border-brand-sky/60",
      "dark:text-sky-300",
    );
    btn.setAttribute("aria-pressed", "true");

    // Fill the SVG icon
    const svg = btn.querySelector("svg");
    if (svg) {
      svg.setAttribute("fill", "currentColor");
    }

    // Pop animation
    btn.classList.add("animate-pop");
    setTimeout(() => btn.classList.remove("animate-pop"), 300);

    // Persist to Supabase
    try {
      const { error } = await supabase.from("remix_upvotes").insert({
        remix_id: remixId,
        voter_fingerprint: deviceId,
      });

      if (error) {
        if (error.code === "23505") {
          // Duplicate upvote (unique constraint) -- already recorded, no action needed
          console.log("[RemixCommunity] Upvote already recorded for", remixId);
          return;
        }

        console.error("[RemixCommunity] Upvote insert failed:", error);

        // Revert optimistic update on non-duplicate errors
        delete upvoted[remixId];
        saveUpvoted(upvoted);
        if (countEl) {
          countEl.textContent = currentCount;
        }
        btn.classList.remove("is-upvoted");
        return;
      }

      console.log("[RemixCommunity] Upvote recorded for", remixId);
    } catch (e) {
      console.error("[RemixCommunity] Upvote error:", e);

      // Revert optimistic update
      delete upvoted[remixId];
      saveUpvoted(upvoted);
      if (countEl) {
        countEl.textContent = currentCount;
      }
      btn.classList.remove("is-upvoted");
    }
  };

  // ── Event delegation ──────────────────────────────────────────────

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-upvote-remix]");
    if (btn) {
      e.preventDefault();
      handleUpvoteClick(btn);
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────

  document.addEventListener("DOMContentLoaded", init);
})();
