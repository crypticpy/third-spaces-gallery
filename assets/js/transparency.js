/**
 * Third Spaces Gallery — Data Transparency Manager
 *
 * Comprehensive inventory, summarization, and deletion of all user data.
 * Covers: localStorage (10+ keys), cookies (1), and Supabase server-side data.
 *
 * Server-side deletion is handled by the `delete_my_data(p_device_id TEXT)` RPC
 * function (SECURITY DEFINER) which deletes from: votes, feedback,
 * feedback_upvotes, published_remixes, and remix_upvotes.
 * See: supabase/migrations/20260127400000_update_delete_my_data.sql
 */

(function () {
  "use strict";

  var DATA_CATEGORIES = {
    votes: {
      label: "Your Votes",
      icon: "\uD83D\uDC96",
      description: "Which designs you voted on and in which categories",
      keys: ["ts:votes:v2"],
      cookie: "ts_v2",
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it (cookie backup lasts 180 days)",
    },
    identity: {
      label: "Device ID",
      icon: "\uD83D\uDD11",
      description:
        "A random ID used to prevent duplicate votes — not linked to your name or identity",
      keys: ["tsg_device_id"],
      cookie: null,
      storage: "Your browser + our server (as a random code)",
      duration: "Until you delete it",
    },
    feedback: {
      label: "Feedback & Tags",
      icon: "\uD83D\uDCAC",
      description: "Quick feedback tags you selected on designs",
      keys: ["ts:feedback:v1"],
      dynamicPrefix: "tsg_feedback_",
      cookie: null,
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it",
    },
    remix: {
      label: "Remix Cart",
      icon: "\uD83C\uDFA8",
      description: "Features you collected for your remix",
      keys: ["tsg_remix_cart", "tsg_remix_onboarding_seen"],
      cookie: null,
      storage: "Your browser only",
      duration: "Until you delete it",
    },
    preferences: {
      label: "Preferences",
      icon: "\u2699\uFE0F",
      description: "Your theme choice (Chill or Hype) and gallery view mode",
      keys: ["tsg_theme", "tsg_view_mode"],
      cookie: null,
      storage: "Your browser only",
      duration: "Until you delete it",
    },
    history: {
      label: "Viewing History",
      icon: "\uD83D\uDC41\uFE0F",
      description: "Which designs you viewed in immersive mode",
      keys: ["tsg_viewed_designs", "tsg_onboarding_complete"],
      cookie: null,
      storage: "Your browser only",
      duration: "Until you delete it",
    },
    feedback_upvotes: {
      label: "Feedback Upvotes",
      icon: "\uD83D\uDC4D",
      description: "Which community feedback comments you upvoted",
      keys: ["ts:feedback_upvotes:v1"],
      cookie: null,
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it",
    },
    published_remixes: {
      label: "Published Remixes",
      icon: "\uD83D\uDCE4",
      description: "Remixes you submitted for community display",
      keys: ["ts:published_remixes:v1"],
      cookie: null,
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it",
    },
    remix_upvotes: {
      label: "Remix Upvotes",
      icon: "\u2B50",
      description: "Which community remixes you upvoted",
      keys: ["ts:remix_upvotes:v1"],
      cookie: null,
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it",
    },
  };

  /**
   * Scan all localStorage keys and cookie for a given category.
   * Returns { label, icon, description, items[], hasData }.
   */
  function inventoryCategory(catId) {
    var cat = DATA_CATEGORIES[catId];
    if (!cat) return null;

    var items = [];

    // Static keys
    cat.keys.forEach(function (key) {
      var val;
      try {
        val = localStorage.getItem(key);
      } catch (e) {
        val = null;
      }
      if (val !== null) {
        items.push({ key: key, value: val, size: val.length, type: "local" });
      }
    });

    // Dynamic prefix keys (tsg_feedback_*)
    if (cat.dynamicPrefix) {
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf(cat.dynamicPrefix) === 0) {
            var val = localStorage.getItem(key);
            if (val !== null) {
              items.push({
                key: key,
                value: val,
                size: val.length,
                type: "local",
              });
            }
          }
        }
      } catch (e) {
        /* localStorage not available */
      }
    }

    // Cookie
    if (cat.cookie) {
      var match = document.cookie.match(
        new RegExp("(?:^|; )" + cat.cookie + "=([^;]*)"),
      );
      if (match) {
        items.push({
          key: "cookie:" + cat.cookie,
          value: match[1],
          size: match[1].length,
          type: "cookie",
        });
      }
    }

    return {
      id: catId,
      label: cat.label,
      icon: cat.icon,
      description: cat.description,
      storage: cat.storage,
      duration: cat.duration,
      items: items,
      hasData: items.length > 0,
    };
  }

  /**
   * Full inventory of all categories.
   */
  function inventory() {
    var result = {};
    var ids = Object.keys(DATA_CATEGORIES);
    for (var i = 0; i < ids.length; i++) {
      result[ids[i]] = inventoryCategory(ids[i]);
    }
    return result;
  }

  /**
   * Human-readable summary per category.
   */
  function summarize() {
    var inv = inventory();
    var summaries = {};

    // Votes
    if (inv.votes.hasData) {
      var voteItem = inv.votes.items.find(function (it) {
        return it.key === "ts:votes:v2";
      });
      if (voteItem) {
        try {
          var parsed = JSON.parse(voteItem.value);
          var count = Object.keys(parsed.votes || {}).length;
          summaries.votes =
            count + " design" + (count !== 1 ? "s" : "") + " voted on";
        } catch (e) {
          summaries.votes = "Vote data stored";
        }
      } else {
        summaries.votes = "Vote backup cookie stored";
      }
    } else {
      summaries.votes = "No data";
    }

    // Identity
    if (inv.identity.hasData) {
      var idItem = inv.identity.items[0];
      var shortId = idItem ? idItem.value.substring(0, 8) + "..." : "";
      summaries.identity = "Random ID: " + shortId;
    } else {
      summaries.identity = "No data";
    }

    // Feedback
    if (inv.feedback.hasData) {
      var fbCount = inv.feedback.items.length;
      summaries.feedback =
        fbCount + " feedback entr" + (fbCount !== 1 ? "ies" : "y") + " stored";
    } else {
      summaries.feedback = "No data";
    }

    // Remix
    if (inv.remix.hasData) {
      var cartItem = inv.remix.items.find(function (it) {
        return it.key === "tsg_remix_cart";
      });
      if (cartItem) {
        try {
          var cart = JSON.parse(cartItem.value);
          summaries.remix =
            cart.length +
            " feature" +
            (cart.length !== 1 ? "s" : "") +
            " saved";
        } catch (e) {
          summaries.remix = "Remix data stored";
        }
      } else {
        summaries.remix = "Onboarding flag only";
      }
    } else {
      summaries.remix = "No data";
    }

    // Preferences
    if (inv.preferences.hasData) {
      var themeItem = inv.preferences.items.find(function (it) {
        return it.key === "tsg_theme";
      });
      var viewItem = inv.preferences.items.find(function (it) {
        return it.key === "tsg_view_mode";
      });
      var parts = [];
      if (themeItem) {
        parts.push(
          themeItem.value === "hype"
            ? "Hype mode (dark)"
            : "Chill mode (light)",
        );
      }
      if (viewItem) {
        parts.push(
          viewItem.value === "immersive" ? "Immersive view" : "Grid view",
        );
      }
      summaries.preferences = parts.join(", ") || "Preference data stored";
    } else {
      summaries.preferences = "No data";
    }

    // History
    if (inv.history.hasData) {
      var viewedItem = inv.history.items.find(function (it) {
        return it.key === "tsg_viewed_designs";
      });
      if (viewedItem) {
        try {
          var viewed = JSON.parse(viewedItem.value);
          summaries.history =
            viewed.length +
            " design" +
            (viewed.length !== 1 ? "s" : "") +
            " viewed";
        } catch (e) {
          summaries.history = "Viewing data stored";
        }
      } else {
        summaries.history = "Onboarding flag only";
      }
    } else {
      summaries.history = "No data";
    }

    // Feedback Upvotes
    if (inv.feedback_upvotes && inv.feedback_upvotes.hasData) {
      var fuItem = inv.feedback_upvotes.items.find(function (it) {
        return it.key === "ts:feedback_upvotes:v1";
      });
      if (fuItem) {
        try {
          var fuData = JSON.parse(fuItem.value);
          var fuCount = Object.keys(fuData).length;
          summaries.feedback_upvotes =
            fuCount +
            " feedback comment" +
            (fuCount !== 1 ? "s" : "") +
            " upvoted";
        } catch (e) {
          summaries.feedback_upvotes = "Upvote data stored";
        }
      } else {
        summaries.feedback_upvotes = "No data";
      }
    } else {
      summaries.feedback_upvotes = "No data";
    }

    // Published Remixes
    if (inv.published_remixes && inv.published_remixes.hasData) {
      var prItem = inv.published_remixes.items.find(function (it) {
        return it.key === "ts:published_remixes:v1";
      });
      if (prItem) {
        try {
          var prData = JSON.parse(prItem.value);
          var prCount = Object.keys(prData).length;
          summaries.published_remixes =
            prCount + " remix" + (prCount !== 1 ? "es" : "") + " published";
        } catch (e) {
          summaries.published_remixes = "Remix data stored";
        }
      } else {
        summaries.published_remixes = "No data";
      }
    } else {
      summaries.published_remixes = "No data";
    }

    // Remix Upvotes
    if (inv.remix_upvotes && inv.remix_upvotes.hasData) {
      var ruItem = inv.remix_upvotes.items.find(function (it) {
        return it.key === "ts:remix_upvotes:v1";
      });
      if (ruItem) {
        try {
          var ruData = JSON.parse(ruItem.value);
          var ruCount = Object.keys(ruData).length;
          summaries.remix_upvotes =
            ruCount + " remix" + (ruCount !== 1 ? "es" : "") + " upvoted";
        } catch (e) {
          summaries.remix_upvotes = "Upvote data stored";
        }
      } else {
        summaries.remix_upvotes = "No data";
      }
    } else {
      summaries.remix_upvotes = "No data";
    }

    return summaries;
  }

  /**
   * Check if any data exists at all.
   */
  function hasAnyData() {
    var inv = inventory();
    var ids = Object.keys(inv);
    for (var i = 0; i < ids.length; i++) {
      if (inv[ids[i]].hasData) return true;
    }
    return false;
  }

  /**
   * Clear all keys for a single category.
   * Returns the number of items removed.
   */
  function clearCategory(categoryId) {
    var cat = DATA_CATEGORIES[categoryId];
    if (!cat) return 0;

    var removed = 0;

    // Static keys
    cat.keys.forEach(function (key) {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removed++;
        }
      } catch (e) {}
    });

    // Dynamic prefix keys
    if (cat.dynamicPrefix) {
      var toRemove = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf(cat.dynamicPrefix) === 0) {
            toRemove.push(key);
          }
        }
        toRemove.forEach(function (key) {
          localStorage.removeItem(key);
          removed++;
        });
      } catch (e) {}
    }

    // Cookie (only count as removed if it actually exists)
    if (cat.cookie) {
      var cookieExists = document.cookie.indexOf(cat.cookie + "=") !== -1;
      document.cookie = cat.cookie + "=; max-age=0; path=/";
      if (cookieExists) removed++;
    }

    return removed;
  }

  /**
   * Attempt to delete server-side data from Supabase.
   * Returns a promise that resolves to { success, message, deletedRows? }.
   */
  function clearServerData(deviceId) {
    // Check if Supabase is available
    if (
      !window.ThirdSpacesSupabase ||
      !window.ThirdSpacesSupabase.isConfigured ||
      !window.ThirdSpacesSupabase.isConfigured()
    ) {
      return Promise.resolve({
        success: true,
        message: "Offline mode — your data is only stored in your browser.",
        deletedRows: 0,
      });
    }

    var client = window.ThirdSpacesSupabase.getClient();
    if (!client || !deviceId) {
      return Promise.resolve({
        success: true,
        message: "No server connection or device ID available.",
        deletedRows: 0,
      });
    }

    return client
      .rpc("delete_my_data", { p_device_id: deviceId })
      .then(function (response) {
        if (response.error) {
          console.warn("[DataManager] Server deletion failed:", response.error);
          return {
            success: false,
            message:
              "Could not reach the server. Your local data was still deleted.",
            deletedRows: 0,
          };
        }
        var count = response.data || 0;
        return {
          success: true,
          message:
            "Removed " +
            count +
            " record" +
            (count !== 1 ? "s" : "") +
            " from our server.",
          deletedRows: count,
        };
      })
      .catch(function (err) {
        console.warn("[DataManager] Server deletion error:", err);
        return {
          success: false,
          message:
            "Could not reach the server. Your local data was still deleted.",
          deletedRows: 0,
        };
      });
  }

  /**
   * Clear ALL user data: localStorage + cookie + Supabase server.
   * Returns a promise that resolves to { local, server }.
   */
  function clearAll() {
    // 1. Read device ID BEFORE clearing (needed for server deletion)
    var savedDeviceId = null;
    try {
      savedDeviceId = localStorage.getItem("tsg_device_id");
    } catch (e) {}

    // 2. Clear all categories locally
    var totalRemoved = 0;
    var ids = Object.keys(DATA_CATEGORIES);
    for (var i = 0; i < ids.length; i++) {
      totalRemoved += clearCategory(ids[i]);
    }

    // 3. Also clear the onboarding banner dismissal (not in categories)
    try {
      if (localStorage.getItem("tsg_remix_cta_dismissed") !== null) {
        localStorage.removeItem("tsg_remix_cta_dismissed");
        totalRemoved++;
      }
    } catch (e) {}

    // 4. Clear server-side data
    return clearServerData(savedDeviceId).then(function (serverResult) {
      return {
        local: totalRemoved,
        server: serverResult,
      };
    });
  }

  /**
   * Get the ordered list of category IDs.
   */
  function getCategoryIds() {
    return Object.keys(DATA_CATEGORIES);
  }

  /**
   * Get category metadata (without scanning storage).
   */
  function getCategoryMeta(catId) {
    var cat = DATA_CATEGORIES[catId];
    if (!cat) return null;
    return {
      id: catId,
      label: cat.label,
      icon: cat.icon,
      description: cat.description,
      storage: cat.storage,
      duration: cat.duration,
    };
  }

  // Expose globally
  window.TSGDataManager = {
    inventory: inventory,
    summarize: summarize,
    hasAnyData: hasAnyData,
    clearCategory: clearCategory,
    clearAll: clearAll,
    clearServerData: clearServerData,
    getCategoryIds: getCategoryIds,
    getCategoryMeta: getCategoryMeta,
  };
})();
