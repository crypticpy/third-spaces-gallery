/**
 * Remix Dashboard — Build tab, My Builds tab, submit flow, modals, viz card
 * Extracted from remix/index.html inline script.
 * Requires: remix.js (window.TSGRemix), remix-community.js
 */
(function () {
  "use strict";

  // Gate: only run on the remix dashboard page
  if (!document.querySelector("[data-remix-dashboard]")) return;

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    var vizModal = document.querySelector("[data-remix-viz-modal]");
    var confirmModal = document.querySelector("[data-remix-confirm-modal]");
    var clearModal = document.querySelector("[data-remix-clear-modal]");
    var remixAgainModal = document.querySelector("[data-remix-again-modal]");
    var inlineSubmitForm = document.querySelector("[data-remix-inline-submit]");
    var noteInput = document.querySelector("[data-remix-note]");
    var authorInput = document.querySelector("[data-remix-author]");
    var vizConstellation = document.querySelector(
      "[data-remix-viz-constellation]",
    );
    var vizCount = document.querySelector("[data-remix-viz-count]");
    var descriptionTextarea = document.querySelector(
      "[data-remix-user-description]",
    );

    var previousFocus = null;
    var pendingRemixAgainRef = null;
    var descriptionDebounceTimer = null;

    // ── escapeHtml ──────────────────────────────────────────────────
    function escapeHtml(str) {
      if (!str) return "";
      var div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    // ── Focus trap helper ───────────────────────────────────────────
    var activeTrapListener = null;

    function trapFocus(el) {
      releaseFocusTrap();
      activeTrapListener = function (e) {
        if (e.key === "Escape") {
          closeModal(el);
          return;
        }
        if (e.key !== "Tab") return;
        var focusables = el.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };
      el.addEventListener("keydown", activeTrapListener);
    }

    function releaseFocusTrap() {
      if (activeTrapListener) {
        // Remove from all modals that might have it
        [confirmModal, clearModal, vizModal, remixAgainModal].forEach(
          function (m) {
            if (m) m.removeEventListener("keydown", activeTrapListener);
          },
        );
        activeTrapListener = null;
      }
    }

    // ── Modal helpers ───────────────────────────────────────────────
    var closingViaPopstate = false;

    function openModal(el) {
      if (!el) return;
      previousFocus = document.activeElement;
      el.classList.remove("hidden");
      el.classList.add("flex");
      document.body.classList.add("overflow-hidden");
      trapFocus(el);
      var focusable = el.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable) focusable.focus();
      history.pushState({ modal: true, source: "remix-dashboard" }, "");
    }
    function closeModal(el) {
      if (!el) return;
      // Guard: only close if the modal is actually open
      if (el.classList.contains("hidden")) return;
      releaseFocusTrap();
      el.classList.add("hidden");
      el.classList.remove("flex");
      document.body.classList.remove("overflow-hidden");
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
        previousFocus = null;
      }
      if (!closingViaPopstate) {
        history.back();
      }
    }

    // ── Toast helper ────────────────────────────────────────────────
    function showToast(message, type) {
      var bgClass = type === "error" ? "bg-red-500" : "bg-brand-sea";
      var toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-full " +
        bgClass +
        " text-white px-6 py-3 text-sm font-medium shadow-lg";
      toast.setAttribute("role", type === "error" ? "alert" : "status");
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(function () {
        toast.remove();
      }, 4000);
    }

    // ── Tab System ──────────────────────────────────────────────────
    var tabButtons = document.querySelectorAll("[data-remix-tab]");
    var tabPanels = document.querySelectorAll("[data-remix-panel]");

    function switchTab(tabName) {
      tabButtons.forEach(function (btn) {
        var isActive = btn.dataset.remixTab === tabName;
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        if (isActive) {
          btn.className =
            "px-4 py-3 text-sm transition border-b-2 border-brand-sky text-brand-navy font-semibold dark:text-gray-100 dark:border-brand-sky";
        } else {
          btn.className =
            "px-4 py-3 text-sm transition border-b-2 border-transparent text-brand-stone hover:text-brand-navy dark:text-gray-400 dark:hover:text-gray-200";
        }
      });

      tabPanels.forEach(function (panel) {
        if (panel.dataset.remixPanel === tabName) {
          panel.classList.remove("hidden");
        } else {
          panel.classList.add("hidden");
        }
      });

      // Update URL
      var url = new URL(window.location.href);
      if (tabName === "build") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tabName);
      }
      history.replaceState(null, "", url.toString());

      // Re-render My Remixes if switching to that tab
      if (tabName === "my-remixes") {
        renderMyRemixes();
      }
    }

    tabButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.dataset.remixTab);
      });
    });

    // Handle data-switch-tab buttons (from empty states)
    document.addEventListener("click", function (e) {
      var switchBtn = e.target.closest("[data-switch-tab]");
      if (switchBtn) {
        e.preventDefault();
        switchTab(switchBtn.dataset.switchTab);
      }
    });

    // Deep-link: read ?tab= param on load
    function initTabFromURL() {
      try {
        var url = new URL(window.location.href);
        var tab = url.searchParams.get("tab");
        if (
          tab &&
          (tab === "build" || tab === "my-remixes" || tab === "community")
        ) {
          switchTab(tab);
        }
      } catch (e) {}
    }

    // ── Group items by source (delegates to shared TSGRemix utility) ──
    function groupBySource(items) {
      if (window.TSGRemix && window.TSGRemix.groupBySource) {
        return window.TSGRemix.groupBySource(items, "Other Features");
      }
      var groups = {};
      var order = [];
      items.forEach(function (item) {
        var key = item.sourceSubmission || item.sourceTitle || "Other Features";
        if (!groups[key]) {
          groups[key] = {
            sourceTitle: item.sourceTitle || "Other Features",
            sourceSubmission: item.sourceSubmission,
            sourceThumbnail: item.sourceThumbnail,
            sourceDesigner: item.sourceDesigner,
            sourceUrl: item.sourceUrl,
            items: [],
          };
          order.push(key);
        }
        groups[key].items.push(item);
      });
      return order.map(function (k) {
        return groups[k];
      });
    }

    // ── Count unique sources (delegates to shared TSGRemix utility) ──
    function countUniqueSources(items) {
      if (window.TSGRemix && window.TSGRemix.countUniqueSources) {
        return window.TSGRemix.countUniqueSources(items);
      }
      var seen = {};
      items.forEach(function (item) {
        var key = item.sourceSubmission || item.sourceTitle || item.id;
        seen[key] = true;
      });
      return Object.keys(seen).length;
    }

    // ── Generate share URL ──────────────────────────────────────────
    function getShareURL() {
      if (
        window.TSGRemix &&
        typeof window.TSGRemix.getShareURL === "function"
      ) {
        return window.TSGRemix.getShareURL();
      }
      var items = window.TSGRemix ? window.TSGRemix.getAll() : [];
      var ids = items
        .map(function (i) {
          return i.id;
        })
        .join(",");
      return (
        window.location.origin +
        window.location.pathname +
        "?features=" +
        encodeURIComponent(ids)
      );
    }

    // ── Get submitted count ─────────────────────────────────────────
    function getSubmittedCount() {
      if (
        window.TSGRemix &&
        typeof window.TSGRemix.submittedCount === "function"
      ) {
        return window.TSGRemix.submittedCount();
      }
      try {
        return JSON.parse(
          localStorage.getItem("ts:submitted_remixes:v1") || "[]",
        ).length;
      } catch (e) {
        return 0;
      }
    }

    // ── Get submitted remixes ───────────────────────────────────────
    function getSubmittedRemixes() {
      if (
        window.TSGRemix &&
        typeof window.TSGRemix.getSubmitted === "function"
      ) {
        return window.TSGRemix.getSubmitted();
      }
      try {
        return JSON.parse(
          localStorage.getItem("ts:submitted_remixes:v1") || "[]",
        );
      } catch (e) {
        return [];
      }
    }

    // ── Render grouped feature list (Build tab) ─────────────────────
    function renderGroupedList() {
      var container = document.querySelector("[data-remix-list]");
      if (!container || !window.TSGRemix) return;

      var items = window.TSGRemix.getAll();
      container.innerHTML = "";

      if (items.length === 0) return;

      var groups = groupBySource(items);

      groups.forEach(function (group) {
        var section = document.createElement("div");
        section.className =
          "rounded-2xl border border-brand-sky/10 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800";

        // Group header with thumbnail
        var header = document.createElement("div");
        header.className =
          "flex items-center gap-3 border-b border-brand-sky/10 bg-brand-light-blue/20 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50";

        // Thumbnail (or fallback icon)
        if (group.sourceThumbnail) {
          var img = document.createElement("img");
          img.src = group.sourceThumbnail;
          img.alt = "";
          img.className =
            "h-10 w-10 rounded-lg object-cover border border-brand-sky/10 dark:border-gray-600";
          header.appendChild(img);
        } else {
          var iconSpan = document.createElement("span");
          iconSpan.className =
            "flex h-10 w-10 items-center justify-center rounded-lg bg-brand-sky/10 text-lg dark:bg-gray-600";
          iconSpan.textContent = "\uD83D\uDCD0";
          header.appendChild(iconSpan);
        }

        // Title + designer
        var info = document.createElement("div");
        info.className = "min-w-0 flex-1";

        var title = document.createElement("h3");
        title.className =
          "text-sm font-semibold text-brand-navy dark:text-gray-200 truncate";
        title.textContent = group.sourceTitle;
        info.appendChild(title);

        if (group.sourceDesigner) {
          var designer = document.createElement("p");
          designer.className =
            "text-xs text-brand-stone dark:text-gray-400 truncate";
          designer.textContent = "by " + group.sourceDesigner;
          info.appendChild(designer);
        }
        header.appendChild(info);

        // Count badge
        var badge = document.createElement("span");
        badge.className =
          "ml-auto shrink-0 rounded-full bg-brand-sky/10 px-2 py-0.5 text-[11px] font-semibold text-brand-indigo dark:bg-brand-sky/20 dark:text-brand-sky";
        badge.textContent = group.items.length;
        header.appendChild(badge);

        section.appendChild(header);

        // Feature chips container
        var chipsWrap = document.createElement("div");
        chipsWrap.className = "flex flex-wrap gap-2 p-4";

        group.items.forEach(function (item) {
          var chip = document.createElement("div");
          chip.className =
            "inline-flex items-center gap-1.5 rounded-full border border-brand-sky/15 bg-brand-light-blue/30 pl-2.5 pr-1.5 py-1.5 text-sm transition-all hover:border-brand-sky/30 hover:shadow-sm dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500";
          chip.dataset.remixItem = item.id;

          // Feature name (optionally linked)
          var chipLabel;
          if (item.sourceUrl) {
            chipLabel = document.createElement("a");
            chipLabel.href = item.sourceUrl;
            chipLabel.className =
              "inline-flex items-center gap-1.5 hover:underline";
          } else {
            chipLabel = document.createElement("span");
            chipLabel.className = "inline-flex items-center gap-1.5";
          }
          chipLabel.innerHTML =
            '<span class="text-base shrink-0" aria-hidden="true">' +
            escapeHtml(item.icon) +
            "</span>" +
            '<span class="font-medium text-brand-navy dark:text-gray-200 truncate max-w-[150px] sm:max-w-[200px]">' +
            escapeHtml(item.name) +
            "</span>";
          chip.appendChild(chipLabel);

          // Remove button
          var removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className =
            "ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-brand-stone/60 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/40 dark:hover:text-red-400";
          removeBtn.dataset.remixRemove = item.id;
          removeBtn.setAttribute(
            "aria-label",
            "Remove " + escapeHtml(item.name) + " from build",
          );
          removeBtn.innerHTML =
            '<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
          chip.appendChild(removeBtn);

          chipsWrap.appendChild(chip);
        });

        section.appendChild(chipsWrap);
        container.appendChild(section);
      });

      // Render summary
      renderSummary(groups, items);
    }

    // ── Auto-Generated Summary ──────────────────────────────────────
    function renderSummary(groups, items) {
      var summaryEl = document.querySelector("[data-remix-summary]");
      var headingEl = document.querySelector("[data-remix-summary-heading]");
      var listEl = document.querySelector("[data-remix-summary-list]");
      if (!summaryEl || !headingEl || !listEl) return;

      if (!items || items.length === 0) {
        summaryEl.classList.add("hidden");
        return;
      }

      summaryEl.classList.remove("hidden");
      var sourceCount = countUniqueSources(items);
      headingEl.textContent =
        "This build brings together " +
        items.length +
        " feature" +
        (items.length !== 1 ? "s" : "") +
        " from " +
        sourceCount +
        " design" +
        (sourceCount !== 1 ? "s" : "") +
        ":";

      listEl.innerHTML = "";
      groups.forEach(function (group) {
        var li = document.createElement("li");
        var featureNames = group.items
          .map(function (item) {
            return item.name;
          })
          .join(", ");
        var text = "From " + escapeHtml(group.sourceTitle);
        if (group.sourceDesigner) {
          text += " by " + escapeHtml(group.sourceDesigner);
        }
        text += ": " + escapeHtml(featureNames);
        li.innerHTML = "&bull; " + text;
        listEl.appendChild(li);
      });
    }

    // ── User Description Field ──────────────────────────────────────
    function loadDescription() {
      if (!descriptionTextarea) return;
      try {
        var saved = localStorage.getItem("tsg_remix_description");
        if (saved) {
          descriptionTextarea.value = saved;
        }
      } catch (e) {}
    }

    function saveDescription() {
      if (!descriptionTextarea) return;
      try {
        var val = descriptionTextarea.value;
        if (val) {
          localStorage.setItem("tsg_remix_description", val);
        } else {
          localStorage.removeItem("tsg_remix_description");
        }
      } catch (e) {}
    }

    if (descriptionTextarea) {
      descriptionTextarea.addEventListener("input", function () {
        if (descriptionDebounceTimer) clearTimeout(descriptionDebounceTimer);
        descriptionDebounceTimer = setTimeout(saveDescription, 400);
      });
    }

    // ── Update stats line ───────────────────────────────────────────
    function updateStats() {
      var statsEl = document.querySelector("[data-remix-stats]");
      var totalEl = document.querySelector("[data-remix-total]");
      var sourceCountEl = document.querySelector("[data-remix-source-count]");
      var emptyEl = document.querySelector("[data-remix-empty]");
      var actionsEl = document.querySelector("[data-remix-actions]");
      var summaryEl = document.querySelector("[data-remix-summary]");
      var descSection = document.querySelector(
        "[data-remix-description-section]",
      );
      var submittedStatEl = document.querySelector(
        "[data-remix-submitted-stat]",
      );

      var count = window.TSGRemix ? window.TSGRemix.count() : 0;
      var items = window.TSGRemix ? window.TSGRemix.getAll() : [];
      var sourceCount = countUniqueSources(items);
      var submittedCount = getSubmittedCount();

      if (totalEl) totalEl.textContent = count;
      if (sourceCountEl) sourceCountEl.textContent = sourceCount;

      // Submitted stat with color coding
      if (submittedStatEl) {
        submittedStatEl.textContent = submittedCount + "/2 builds submitted";
        submittedStatEl.classList.remove(
          "text-amber-600",
          "text-red-600",
          "dark:text-amber-400",
          "dark:text-red-400",
        );
        if (submittedCount >= 2) {
          submittedStatEl.classList.add("text-red-600", "dark:text-red-400");
        } else if (submittedCount === 1) {
          submittedStatEl.classList.add(
            "text-amber-600",
            "dark:text-amber-400",
          );
        }
      }

      if (statsEl) statsEl.classList.toggle("hidden", count === 0);
      if (emptyEl) emptyEl.classList.toggle("hidden", count > 0);
      if (actionsEl) actionsEl.classList.toggle("hidden", count === 0);
      if (summaryEl && count === 0) summaryEl.classList.add("hidden");
      if (descSection) descSection.classList.toggle("hidden", count === 0);

      // Show/hide inline submit form
      if (inlineSubmitForm) {
        var hasItems = count > 0;
        var hasRemaining = submittedCount < 2;
        inlineSubmitForm.classList.toggle(
          "hidden",
          !(hasItems && hasRemaining),
        );

        // Update remaining count text
        var submitRemainingEl = inlineSubmitForm.querySelector(
          "[data-remix-submit-remaining]",
        );
        if (submitRemainingEl) {
          var remaining = 2 - submittedCount;
          if (remaining <= 0) {
            submitRemainingEl.textContent =
              "You have used all 2 build submissions. Thank you for contributing!";
          } else {
            submitRemainingEl.textContent =
              "You have " +
              remaining +
              "/2 build submission" +
              (remaining !== 1 ? "s" : "") +
              " remaining.";
          }
        }

        // Pre-fill author from localStorage
        if (authorInput && !authorInput.value) {
          try {
            var savedAuthor = localStorage.getItem("tsg_remix_author");
            if (savedAuthor) authorInput.value = savedAuthor;
          } catch (e) {}
        }

        // Pre-fill note from on-page description
        if (noteInput && descriptionTextarea && !noteInput.value.trim()) {
          var desc = descriptionTextarea.value.trim();
          if (desc) noteInput.value = desc;
        }
      }

      // Update tab badge for My Remixes
      updateMyRemixesTabBadge();

      // Update composition guidance progress bar
      var progressEl = document.querySelector("[data-remix-progress]");
      var progressLabel = document.querySelector("[data-remix-progress-label]");
      var progressCount = document.querySelector("[data-remix-progress-count]");
      var progressBar = document.querySelector("[data-remix-progress-bar]");

      if (progressEl && progressLabel && progressCount && progressBar) {
        if (count === 0) {
          progressEl.classList.add("hidden");
        } else {
          progressEl.classList.remove("hidden");
          var sources = countUniqueSources(items);
          progressCount.textContent =
            count +
            " feature" +
            (count !== 1 ? "s" : "") +
            " from " +
            sources +
            " design" +
            (sources !== 1 ? "s" : "");

          var pct, label;
          if (count <= 2) {
            pct = count * 12;
            label = "Getting started";
          } else if (count <= 5) {
            pct = 25 + (count - 2) * 13;
            label = "Nice start";
          } else if (count <= 8) {
            pct = 65 + (count - 5) * 12;
            label = "Looking great";
          } else {
            pct = 100;
            label = "Big build! Submit when ready.";
          }

          progressLabel.textContent = label;
          progressBar.style.width = Math.min(pct, 100) + "%";
        }
      }
    }

    // ── My Remixes tab badge ────────────────────────────────────────
    function updateMyRemixesTabBadge() {
      var tabCountEl = document.querySelector("[data-remix-tab-count]");
      if (!tabCountEl) return;
      var c = getSubmittedCount();
      if (c > 0) {
        tabCountEl.textContent = c;
        tabCountEl.classList.remove("hidden");
      } else {
        tabCountEl.classList.add("hidden");
      }
    }

    // ── Render My Remixes tab ───────────────────────────────────────
    function renderMyRemixes() {
      var listEl = document.querySelector("[data-my-remixes-list]");
      var emptyEl = document.querySelector("[data-my-remixes-empty]");
      var countEl = document.querySelector("[data-my-remixes-count]");
      if (!listEl) return;

      var remixes = getSubmittedRemixes();

      // Count indicator
      if (countEl) {
        var c = remixes.length;
        countEl.textContent = c + "/2 builds submitted";
        countEl.classList.remove(
          "text-amber-600",
          "text-red-600",
          "dark:text-amber-400",
          "dark:text-red-400",
        );
        if (c >= 2) {
          countEl.classList.add("text-red-600", "dark:text-red-400");
        } else if (c === 1) {
          countEl.classList.add("text-amber-600", "dark:text-amber-400");
        }
      }

      listEl.innerHTML = "";

      if (remixes.length === 0) {
        if (emptyEl) emptyEl.classList.remove("hidden");
        return;
      }
      if (emptyEl) emptyEl.classList.add("hidden");

      remixes.forEach(function (remix) {
        var features = Array.isArray(remix.features) ? remix.features : [];
        var sourceCount = countUniqueSources(features);

        var card = document.createElement("div");
        card.className =
          "rounded-2xl border border-brand-sky/10 bg-white shadow-sm overflow-hidden dark:border-gray-700 dark:bg-gray-800";

        // Header
        var header = document.createElement("div");
        header.className =
          "flex items-center justify-between border-b border-brand-sky/10 bg-brand-light-blue/20 px-4 py-3 dark:border-gray-700 dark:bg-gray-700/50";

        var headerLeft = document.createElement("div");
        var h3 = document.createElement("h3");
        h3.className =
          "text-sm font-semibold text-brand-navy dark:text-gray-200";
        h3.innerHTML =
          '<span aria-hidden="true">&#x1F4E6;</span> Build #' +
          escapeHtml(remix.reference || "N/A");
        headerLeft.appendChild(h3);

        var datePara = document.createElement("p");
        datePara.className = "text-xs text-brand-stone dark:text-gray-400";
        datePara.textContent = "Submitted " + formatDate(remix.submittedAt);
        headerLeft.appendChild(datePara);
        header.appendChild(headerLeft);

        var statusBadge = document.createElement("span");
        statusBadge.className =
          "rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
        statusBadge.innerHTML =
          '<span aria-hidden="true">&#9203;</span> Pending Review';
        header.appendChild(statusBadge);

        card.appendChild(header);

        // Body
        var body = document.createElement("div");
        body.className = "p-4 space-y-3";

        // User note
        if (remix.userNote) {
          var notePara = document.createElement("p");
          notePara.className =
            "text-sm italic text-brand-stone dark:text-gray-400";
          notePara.textContent = "\u201C" + remix.userNote + "\u201D";
          body.appendChild(notePara);
        }

        // Auto summary
        var summaryDiv = document.createElement("div");
        summaryDiv.className = "text-sm text-brand-stone dark:text-gray-400";
        summaryDiv.textContent =
          features.length +
          " feature" +
          (features.length !== 1 ? "s" : "") +
          " from " +
          sourceCount +
          " design" +
          (sourceCount !== 1 ? "s" : "");
        body.appendChild(summaryDiv);

        // Feature chips (read-only)
        var chipsWrap = document.createElement("div");
        chipsWrap.className = "flex flex-wrap gap-2";
        features.forEach(function (f) {
          var chip = document.createElement("span");
          chip.className =
            "inline-flex items-center gap-1.5 rounded-full border border-brand-sky/15 bg-brand-light-blue/30 px-2.5 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700";
          chip.innerHTML =
            '<span class="text-base shrink-0" aria-hidden="true">' +
            escapeHtml(f.icon) +
            "</span>" +
            '<span class="font-medium text-brand-navy dark:text-gray-200 truncate max-w-[150px] sm:max-w-[200px]">' +
            escapeHtml(f.name) +
            "</span>";
          chipsWrap.appendChild(chip);
        });
        body.appendChild(chipsWrap);

        // Remix Again button
        var remixAgainBtn = document.createElement("button");
        remixAgainBtn.type = "button";
        remixAgainBtn.className =
          "inline-flex items-center gap-2 rounded-full border border-brand-sky/20 px-4 py-2 text-sm font-medium text-brand-indigo transition-all hover:bg-brand-light-blue/30 hover:border-brand-sky dark:border-gray-600 dark:text-brand-sky dark:hover:border-brand-sky/50 dark:hover:bg-gray-700";
        remixAgainBtn.dataset.remixAgain = remix.reference || "";
        remixAgainBtn.innerHTML =
          '<span aria-hidden="true">&#x1F504;</span> Build Again';
        body.appendChild(remixAgainBtn);

        card.appendChild(body);
        listEl.appendChild(card);
      });
    }

    function formatDate(dateStr) {
      if (!dateStr) return "";
      try {
        var d = new Date(dateStr);
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      } catch (e) {
        return dateStr;
      }
    }

    // ── Remix Again handler ─────────────────────────────────────────
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remix-again]");
      if (!btn) return;
      e.preventDefault();

      var ref = btn.dataset.remixAgain;
      if (!ref) return;

      var cartCount = window.TSGRemix ? window.TSGRemix.count() : 0;
      pendingRemixAgainRef = ref;

      if (cartCount > 0) {
        openModal(remixAgainModal);
      } else {
        loadRemixAgain(ref);
      }
    });

    // Remix Again modal confirm
    var remixAgainConfirmBtn = document.querySelector(
      "[data-remix-again-confirm]",
    );
    if (remixAgainConfirmBtn) {
      remixAgainConfirmBtn.addEventListener("click", function () {
        closeModal(remixAgainModal);
        if (pendingRemixAgainRef !== null) {
          loadRemixAgain(pendingRemixAgainRef);
          pendingRemixAgainRef = null;
        }
      });
    }

    var remixAgainCancelBtn = document.querySelector(
      "[data-remix-again-cancel]",
    );
    if (remixAgainCancelBtn) {
      remixAgainCancelBtn.addEventListener("click", function () {
        closeModal(remixAgainModal);
        pendingRemixAgainRef = null;
      });
    }

    if (remixAgainModal) {
      remixAgainModal.addEventListener("click", function (e) {
        if (e.target === remixAgainModal) {
          closeModal(remixAgainModal);
          pendingRemixAgainRef = null;
        }
      });
    }

    function loadRemixAgain(ref) {
      var remixes = getSubmittedRemixes();
      var remix = null;
      for (var i = 0; i < remixes.length; i++) {
        if (remixes[i].reference === ref) {
          remix = remixes[i];
          break;
        }
      }
      if (!remix || !window.TSGRemix) return;

      var features = Array.isArray(remix.features) ? remix.features : [];

      window.TSGRemix.clear();

      features.forEach(function (f) {
        window.TSGRemix.add(f.id, {
          name: f.name,
          icon: f.icon,
          sourceSubmission: f.sourceSubmission,
          sourceTitle: f.sourceTitle,
          sourceThumbnail: f.sourceThumbnail,
          sourceDesigner: f.sourceDesigner,
          sourceUrl: f.sourceUrl,
        });
      });

      switchTab("build");
      showToast("Features loaded! Edit and submit a new build.", "success");
    }

    // ── Submit remix (inline form) ──────────────────────────────────
    var submitBtn = document.querySelector("[data-remix-submit-btn]");
    if (submitBtn) {
      submitBtn.addEventListener("click", function () {
        var note = noteInput ? noteInput.value.trim() : "";
        var authorName = authorInput ? authorInput.value.trim() : "";
        if (!authorName) authorName = "Anonymous";
        var items = window.TSGRemix ? window.TSGRemix.getAll() : [];
        if (!items.length) {
          showToast("Add some features before submitting.", "error");
          return;
        }
        var featureCount = items.length;
        var sourceCount = countUniqueSources(items);
        var btn = submitBtn;

        // Show loading state
        btn.disabled = true;
        btn.textContent = "Submitting...";

        var submitPromise;
        if (window.TSGRemix) {
          submitPromise = window.TSGRemix.submit(note, authorName);
        } else {
          submitPromise = Promise.resolve({ success: false });
        }

        submitPromise.then(function (result) {
          if (!result.success) {
            btn.disabled = false;
            btn.textContent = "Submit My Build";
            showToast(
              result.error || "Something went wrong. Please try again.",
              "error",
            );
            return;
          }

          // Reset button
          btn.disabled = false;
          btn.textContent = "Submit My Build";

          // Save author name for next time
          try {
            localStorage.setItem("tsg_remix_author", authorName);
          } catch (e) {}

          // Clear description from localStorage after successful submission
          try {
            localStorage.removeItem("tsg_remix_description");
          } catch (e) {}
          if (descriptionTextarea) descriptionTextarea.value = "";

          // Populate confirmation modal
          var summaryEl = document.querySelector(
            "[data-remix-confirm-summary]",
          );
          if (summaryEl) {
            summaryEl.textContent =
              "Your build has been submitted for review! " +
              featureCount +
              " feature" +
              (featureCount !== 1 ? "s" : "") +
              " from " +
              sourceCount +
              " design" +
              (sourceCount !== 1 ? "s" : "") +
              (result.reference ? ". Reference: " + result.reference : "") +
              ".";
          }

          var shareUrlEl = document.querySelector("[data-remix-share-url]");
          if (shareUrlEl) {
            shareUrlEl.textContent = getShareURL();
          }

          // Show confirmation modal
          openModal(confirmModal);

          // Clear inline form fields
          if (noteInput) noteInput.value = "";
          if (authorInput) authorInput.value = "";

          // Update stats and tab badge
          updateStats();
          updateMyRemixesTabBadge();
        });
      });
    }

    // ── Copy share URL (with blurb) ─────────────────────────────────
    /** Feature-detect and copy to clipboard with fallback */
    function safeCopyToClipboard(text, onSuccess, onFail) {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        if (onFail) onFail();
        return;
      }
      navigator.clipboard.writeText(text).then(onSuccess).catch(onFail);
    }

    var copyShareBtn = document.querySelector("[data-remix-copy-share]");
    if (copyShareBtn) {
      copyShareBtn.addEventListener("click", function () {
        var shareUrlEl = document.querySelector("[data-remix-share-url]");
        var url = shareUrlEl ? shareUrlEl.textContent : "";
        if (!url) return;

        var blurb = getRemixBlurb() + "\n" + url;

        var btn = copyShareBtn;
        safeCopyToClipboard(
          blurb,
          function () {
            var originalText = btn.textContent;
            btn.textContent = "Copied!";
            btn.classList.add("bg-brand-sea");
            btn.classList.remove("bg-brand-indigo");
            setTimeout(function () {
              btn.textContent = originalText;
              btn.classList.remove("bg-brand-sea");
              btn.classList.add("bg-brand-indigo");
            }, 2000);
          },
          function () {
            var range = document.createRange();
            var selEl = document.querySelector("[data-remix-share-url]");
            if (selEl) {
              range.selectNodeContents(selEl);
              var sel = window.getSelection();
              sel.removeAllRanges();
              sel.addRange(range);
            }
          },
        );
      });
    }

    /** Build a remix share blurb with feature count */
    function getRemixBlurb() {
      var items = window.TSGRemix ? window.TSGRemix.getAll() : [];
      var n = items.length;
      return (
        "I built my dream Third Spaces app with " +
        n +
        " feature" +
        (n !== 1 ? "s" : "") +
        " from student designs! Check it out:"
      );
    }

    /** Flash feedback on a share button */
    function flashShareBtn(btn, feedbackText, originalHTML) {
      if (!btn) return;
      btn.textContent = feedbackText;
      setTimeout(function () {
        btn.innerHTML = originalHTML;
      }, 2000);
    }

    // ── Share via Web Share API (with clipboard fallback) ─────────
    var shareNativeBtn = confirmModal
      ? confirmModal.querySelector("[data-remix-share-native]")
      : null;
    if (shareNativeBtn) {
      shareNativeBtn.addEventListener("click", function () {
        var blurb = getRemixBlurb();
        var shareUrl = getShareURL();
        var btn = shareNativeBtn;
        var origHTML = btn.innerHTML;
        if (navigator.share) {
          navigator
            .share({
              title: "My Third Spaces Build",
              text: blurb,
              url: shareUrl,
            })
            .catch(function (err) {
              if (err.name !== "AbortError") {
                safeCopyToClipboard(blurb + "\n" + shareUrl, function () {
                  flashShareBtn(btn, "Copied!", origHTML);
                });
              }
            });
        } else {
          safeCopyToClipboard(blurb + "\n" + shareUrl, function () {
            flashShareBtn(btn, "Copied!", origHTML);
          });
        }
      });
    }

    // ── Start Fresh from confirmation modal ─────────────────────────
    var startFreshBtn = document.querySelector("[data-remix-start-fresh]");
    if (startFreshBtn) {
      startFreshBtn.addEventListener("click", function () {
        if (window.TSGRemix) {
          window.TSGRemix.clear();
        }
        closeModal(confirmModal);
        renderGroupedList();
        updateStats();
      });
    }

    // ── Close confirmation modal ────────────────────────────────────
    var confirmCloseBtn = document.querySelector("[data-remix-confirm-close]");
    if (confirmCloseBtn) {
      confirmCloseBtn.addEventListener("click", function () {
        closeModal(confirmModal);
      });
    }

    // ── Close confirmation modal on backdrop click ──────────────────
    if (confirmModal) {
      confirmModal.addEventListener("click", function (e) {
        if (e.target === confirmModal) closeModal(confirmModal);
      });
    }

    // ── Visualize: Radial Constellation ─────────────────────────────
    var constellationColors = [
      "#9F3CC9",
      "#44499C",
      "#009CDE",
      "#009F4D",
      "#FFC600",
      "#E87722",
    ];

    var visualizeBtn = document.querySelector("[data-remix-visualize]");
    if (visualizeBtn) {
      visualizeBtn.addEventListener("click", function () {
        if (!window.TSGRemix) return;

        var items = window.TSGRemix.getAll();
        if (!items.length) return;

        var groups = groupBySource(items);
        var sourceCount = countUniqueSources(items);

        // Build constellation
        if (vizConstellation) {
          vizConstellation.innerHTML = "";

          // Assign colors to sources
          var sourceColorMap = {};
          var colorIdx = 0;
          groups.forEach(function (group) {
            var key = group.sourceSubmission || group.sourceTitle;
            if (!sourceColorMap[key]) {
              sourceColorMap[key] =
                constellationColors[colorIdx % constellationColors.length];
              colorIdx++;
            }
          });

          // Flatten items with their assigned color
          var allBubbles = [];
          items.forEach(function (item) {
            var key = item.sourceSubmission || item.sourceTitle || "Other";
            allBubbles.push({
              item: item,
              color: sourceColorMap[key] || constellationColors[0],
            });
          });

          var total = allBubbles.length;
          var containerSize = 320;
          var center = containerSize / 2;

          // Determine ring layout
          var rings = [];
          if (total <= 6) {
            rings = [{ start: 0, count: total, radius: 100 }];
          } else if (total <= 12) {
            rings = [{ start: 0, count: total, radius: 115 }];
          } else {
            var innerCount = Math.min(8, Math.ceil(total / 2));
            var outerCount = total - innerCount;
            rings = [
              { start: 0, count: innerCount, radius: 80 },
              { start: innerCount, count: outerCount, radius: 125 },
            ];
          }

          // Draw connecting lines and bubbles
          var bubbleIndex = 0;
          rings.forEach(function (ring) {
            for (var i = 0; i < ring.count; i++) {
              var bubble = allBubbles[ring.start + i];
              var angle = (2 * Math.PI * i) / ring.count - Math.PI / 2;
              var bx = center + ring.radius * Math.cos(angle);
              var by = center + ring.radius * Math.sin(angle);

              // Connecting line
              var line = document.createElement("div");
              var lineLen = ring.radius - 32;
              var lineDeg = (angle * 180) / Math.PI + 180;
              line.className = "constellation-line absolute rounded-full";
              line.style.cssText =
                "width: " +
                lineLen +
                "px; height: 2px;" +
                "left: " +
                bx +
                "px; top: " +
                by +
                "px;" +
                "transform-origin: 0% 50%;" +
                "transform: rotate(" +
                lineDeg +
                "deg);" +
                "background: linear-gradient(90deg, " +
                bubble.color +
                "44, transparent);" +
                "--delay: " +
                bubbleIndex * 0.2 +
                "s;";
              vizConstellation.appendChild(line);

              // Bubble
              var bEl = document.createElement("div");
              bEl.className = "constellation-bubble absolute";
              var floatTx = (Math.random() * 4 - 2).toFixed(1) + "px";
              var floatTy = "0px";
              bEl.style.cssText =
                "left: " +
                (bx - 24) +
                "px; top: " +
                (by - 24) +
                "px;" +
                "z-index: 10;" +
                "--tx: " +
                floatTx +
                "; --ty: " +
                floatTy +
                ";" +
                "--delay: " +
                bubbleIndex * 0.25 +
                "s;" +
                "--bubble-color: " +
                bubble.color +
                "66;";

              var inner = document.createElement("div");
              inner.className =
                "constellation-bubble-inner flex items-center justify-center w-12 h-12 rounded-full text-xl cursor-default shadow-lg";
              inner.style.cssText =
                "background: radial-gradient(circle at 30% 30%, " +
                bubble.color +
                "cc, " +
                bubble.color +
                "88);" +
                "border: 2px solid " +
                bubble.color +
                "44;";
              inner.textContent = bubble.item.icon || "\u2726";
              inner.setAttribute("aria-label", bubble.item.name);
              bEl.appendChild(inner);

              // Tooltip
              var tooltip = document.createElement("div");
              tooltip.className =
                "constellation-tooltip absolute left-1/2 top-full mt-1 whitespace-nowrap rounded-lg px-2.5 py-1 text-[11px] font-semibold shadow-lg";
              tooltip.style.cssText =
                "background: " + bubble.color + "; color: #fff;";
              tooltip.textContent = bubble.item.name;
              bEl.appendChild(tooltip);

              vizConstellation.appendChild(bEl);
              bubbleIndex++;
            }
          });

          // Center hub
          var hub = document.createElement("div");
          hub.className =
            "absolute flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-xl z-20";
          hub.style.cssText =
            "left: " +
            (center - 32) +
            "px; top: " +
            (center - 32) +
            "px;" +
            "background: linear-gradient(135deg, #9F3CC9, #44499C, #009CDE);";
          hub.innerHTML =
            '<span class="text-lg font-bold text-white leading-none">' +
            total +
            "</span>" +
            '<span class="text-[9px] font-semibold text-white/80 uppercase tracking-wide">features</span>';
          vizConstellation.appendChild(hub);
        }

        // Count line
        if (vizCount) {
          vizCount.textContent =
            items.length +
            " feature" +
            (items.length !== 1 ? "s" : "") +
            " from " +
            sourceCount +
            " design" +
            (sourceCount !== 1 ? "s" : "");
        }

        openModal(vizModal);
      });
    }

    // ── Close viz modal ─────────────────────────────────────────────
    var vizCloseBtn = document.querySelector("[data-remix-viz-close]");
    if (vizCloseBtn) {
      vizCloseBtn.addEventListener("click", function () {
        closeModal(vizModal);
      });
    }

    if (vizModal) {
      vizModal.addEventListener("click", function (e) {
        if (e.target === vizModal) closeModal(vizModal);
      });
    }

    // ── Clear confirmation modal ────────────────────────────────────
    document.addEventListener("remix:clear-request", function (e) {
      e.preventDefault();
      openModal(clearModal);
    });

    var clearConfirmBtn = document.querySelector("[data-clear-confirm]");
    if (clearConfirmBtn) {
      clearConfirmBtn.addEventListener("click", function () {
        if (window.TSGRemix) window.TSGRemix.clear();
        closeModal(clearModal);
        renderGroupedList();
        updateStats();
      });
    }

    var clearCancelBtn = document.querySelector("[data-clear-cancel]");
    if (clearCancelBtn) {
      clearCancelBtn.addEventListener("click", function () {
        closeModal(clearModal);
      });
    }

    if (clearModal) {
      clearModal.addEventListener("click", function (e) {
        if (e.target === clearModal) closeModal(clearModal);
      });
    }

    // ── Escape key closes all modals ────────────────────────────────
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeModal(vizModal);
        closeModal(confirmModal);
        closeModal(clearModal);
        closeModal(remixAgainModal);
        pendingRemixAgainRef = null;
      }
    });

    // ── History popstate handler for modal back-button support ─────
    window.addEventListener("popstate", function (e) {
      // Only react to our own modal state entries (not TSGModal's)
      if (!e.state || !e.state.modal || e.state.source !== "remix-dashboard")
        return;
      closingViaPopstate = true;
      [confirmModal, clearModal, vizModal, remixAgainModal].forEach(
        function (m) {
          if (m && !m.classList.contains("hidden")) {
            closeModal(m);
          }
        },
      );
      closingViaPopstate = false;
    });

    // ── Initial render ──────────────────────────────────────────────
    function initialRender() {
      renderGroupedList();
      updateStats();
      loadDescription();
      updateMyRemixesTabBadge();
      initTabFromURL();
    }

    setTimeout(initialRender, 100);

    // ── Observe cart changes to re-render ───────────────────────────
    var listContainer = document.querySelector("[data-remix-list]");
    if (listContainer) {
      var observer = new MutationObserver(function () {
        updateStats();
      });
      observer.observe(listContainer, { childList: true });
    }

    // ── Patch TSGRemix.updateUI ─────────────────────────────────────
    if (window.TSGRemix) {
      setTimeout(function () {
        if (!window.TSGRemix) return;
        var origUpdateUI = window.TSGRemix.updateUI;
        window.TSGRemix.updateUI = function () {
          if (origUpdateUI) origUpdateUI();
          renderGroupedList();
          updateStats();
        };
      }, 200);
    }
  }
})();
