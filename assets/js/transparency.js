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
      summary: function (items) {
        var voteItem = items.find(function (it) {
          return it.key === "ts:votes:v2";
        });
        if (voteItem) {
          try {
            var parsed = JSON.parse(voteItem.value);
            var count = Object.keys(parsed.votes || {}).length;
            return count + " design" + (count !== 1 ? "s" : "") + " voted on";
          } catch (e) {
            return "Vote data stored";
          }
        }
        return "Vote backup cookie stored";
      },
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
      summary: function (items) {
        var idItem = items[0];
        var shortId = idItem ? idItem.value.substring(0, 8) + "..." : "";
        return "Random ID: " + shortId;
      },
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
      summary: function (items) {
        var fbCount = items.length;
        return (
          fbCount + " feedback entr" + (fbCount !== 1 ? "ies" : "y") + " stored"
        );
      },
    },
    remix: {
      label: "Remix Cart",
      icon: "\uD83C\uDFA8",
      description: "Features you collected for your remix",
      keys: ["tsg_remix_cart", "tsg_remix_onboarding_seen"],
      cookie: null,
      storage: "Your browser only",
      duration: "Until you delete it",
      summary: function (items) {
        var cartItem = items.find(function (it) {
          return it.key === "tsg_remix_cart";
        });
        if (cartItem) {
          try {
            var cart = JSON.parse(cartItem.value);
            return (
              cart.length +
              " feature" +
              (cart.length !== 1 ? "s" : "") +
              " saved"
            );
          } catch (e) {
            return "Remix data stored";
          }
        }
        return "Onboarding flag only";
      },
    },
    preferences: {
      label: "Preferences",
      icon: "\u2699\uFE0F",
      description: "Your theme choice (Chill or Hype) and gallery view mode",
      keys: ["tsg_theme", "tsg_view_mode"],
      cookie: null,
      storage: "Your browser only",
      duration: "Until you delete it",
      summary: function (items) {
        var themeItem = items.find(function (it) {
          return it.key === "tsg_theme";
        });
        var viewItem = items.find(function (it) {
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
        return parts.join(", ") || "Preference data stored";
      },
    },
    history: {
      label: "Viewing History",
      icon: "\uD83D\uDC41\uFE0F",
      description: "Which designs you viewed in immersive mode",
      keys: ["tsg_viewed_designs", "tsg_onboarding_complete"],
      cookie: null,
      storage: "Your browser only",
      duration: "Until you delete it",
      summary: function (items) {
        var viewedItem = items.find(function (it) {
          return it.key === "tsg_viewed_designs";
        });
        if (viewedItem) {
          try {
            var viewed = JSON.parse(viewedItem.value);
            return (
              viewed.length +
              " design" +
              (viewed.length !== 1 ? "s" : "") +
              " viewed"
            );
          } catch (e) {
            return "Viewing data stored";
          }
        }
        return "Onboarding flag only";
      },
    },
    feedback_upvotes: {
      label: "Feedback Upvotes",
      icon: "\uD83D\uDC4D",
      description: "Which community feedback comments you upvoted",
      keys: ["ts:feedback_upvotes:v1"],
      cookie: null,
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it",
      summary: function (items) {
        var fuItem = items.find(function (it) {
          return it.key === "ts:feedback_upvotes:v1";
        });
        if (fuItem) {
          try {
            var fuData = JSON.parse(fuItem.value);
            var fuCount = Object.keys(fuData).length;
            return (
              fuCount +
              " feedback comment" +
              (fuCount !== 1 ? "s" : "") +
              " upvoted"
            );
          } catch (e) {
            return "Upvote data stored";
          }
        }
        return "Upvote data stored";
      },
    },
    published_remixes: {
      label: "Published Remixes",
      icon: "\uD83D\uDCE4",
      description: "Remixes you submitted for community display",
      keys: ["ts:published_remixes:v1"],
      cookie: null,
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it",
      summary: function (items) {
        var prItem = items.find(function (it) {
          return it.key === "ts:published_remixes:v1";
        });
        if (prItem) {
          try {
            var prData = JSON.parse(prItem.value);
            var prCount = Object.keys(prData).length;
            return (
              prCount + " remix" + (prCount !== 1 ? "es" : "") + " published"
            );
          } catch (e) {
            return "Remix data stored";
          }
        }
        return "Remix data stored";
      },
    },
    remix_upvotes: {
      label: "Remix Upvotes",
      icon: "\u2B50",
      description: "Which community remixes you upvoted",
      keys: ["ts:remix_upvotes:v1"],
      cookie: null,
      storage: "Your browser + our server (if connected)",
      duration: "Until you delete it",
      summary: function (items) {
        var ruItem = items.find(function (it) {
          return it.key === "ts:remix_upvotes:v1";
        });
        if (ruItem) {
          try {
            var ruData = JSON.parse(ruItem.value);
            var ruCount = Object.keys(ruData).length;
            return (
              ruCount + " remix" + (ruCount !== 1 ? "es" : "") + " upvoted"
            );
          } catch (e) {
            return "Upvote data stored";
          }
        }
        return "Upvote data stored";
      },
    },
  };

  /**
   * Discover all storage keys (static, dynamic-prefix, and cookie) for a category.
   * Returns an array of { key, type } entries.
   */
  function getCategoryKeys(cat) {
    var keys = [];
    cat.keys.forEach(function (key) {
      keys.push({ key: key, type: "local" });
    });
    if (cat.dynamicPrefix) {
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf(cat.dynamicPrefix) === 0) {
            keys.push({ key: k, type: "local" });
          }
        }
      } catch (e) {}
    }
    if (cat.cookie) {
      keys.push({ key: cat.cookie, type: "cookie" });
    }
    return keys;
  }

  /**
   * Scan all localStorage keys and cookie for a given category.
   * Returns { label, icon, description, items[], hasData }.
   */
  function inventoryCategory(catId) {
    var cat = DATA_CATEGORIES[catId];
    if (!cat) return null;

    var items = [];
    var discovered = getCategoryKeys(cat);

    discovered.forEach(function (entry) {
      if (entry.type === "local") {
        var val;
        try {
          val = localStorage.getItem(entry.key);
        } catch (e) {
          val = null;
        }
        if (val !== null) {
          items.push({
            key: entry.key,
            value: val,
            size: val.length,
            type: "local",
          });
        }
      } else if (entry.type === "cookie") {
        var match = document.cookie.match(
          new RegExp("(?:^|; )" + entry.key + "=([^;]*)"),
        );
        if (match) {
          items.push({
            key: "cookie:" + entry.key,
            value: match[1],
            size: match[1].length,
            type: "cookie",
          });
        }
      }
    });

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
    Object.keys(DATA_CATEGORIES).forEach(function (id) {
      var cat = DATA_CATEGORIES[id];
      var catInv = inv[id];
      if (!catInv || !catInv.hasData) {
        summaries[id] = "No data";
        return;
      }
      if (typeof cat.summary === "function") {
        summaries[id] = cat.summary(catInv.items);
      } else {
        summaries[id] = "Data stored";
      }
    });
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
    var discovered = getCategoryKeys(cat);

    discovered.forEach(function (entry) {
      if (entry.type === "local") {
        try {
          if (localStorage.getItem(entry.key) !== null) {
            localStorage.removeItem(entry.key);
            removed++;
          }
        } catch (e) {}
      } else if (entry.type === "cookie") {
        var cookieExists = document.cookie.indexOf(entry.key + "=") !== -1;
        document.cookie = entry.key + "=; max-age=0; path=/";
        if (cookieExists) removed++;
      }
    });

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
