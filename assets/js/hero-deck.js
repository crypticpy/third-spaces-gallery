/**
 * Hero Phone Deck — random picks, feature badges, cycle, and mobile navigation
 *
 * - Picks 3 random designs from the full manifest on each page load
 * - Builds phone frames + Quick Look JSON dynamically
 * - Shows a feature badge (Accessible, Social, etc.) from each design's feature_focus
 * - Auto-cycles every 4 s so every design gets front billing
 * - Horizontal swipe on the deck cycles (prevents page scroll)
 * - On mobile, tapping a phone navigates to /designs/
 * - Respects prefers-reduced-motion
 */
(() => {
  const deck = document.querySelector("[data-hero-deck]");
  if (!deck) return;

  const phones = Array.from(deck.querySelectorAll("[data-hero-phone]"));
  if (phones.length < 2) return;

  // ---------------------------------------------------------------
  // 0. Parse manifest and pick 3 random designs
  // ---------------------------------------------------------------
  const manifestEl = document.querySelector("[data-hero-manifest]");
  if (!manifestEl) return;

  let designs;
  try {
    designs = JSON.parse(manifestEl.textContent);
  } catch (e) {
    return;
  }
  if (!designs || designs.length < 3) return;

  // Feature badge map: feature_focus id → { label, icon }
  const featureBadges = {
    accessibility: { label: "Accessible", icon: "\u267F" },
    communication: { label: "Social", icon: "\uD83D\uDCAC" },
    navigation: { label: "Navigation", icon: "\uD83D\uDDFA\uFE0F" },
    feedback: { label: "Feedback", icon: "\u2B50" },
    ai: { label: "AI Powered", icon: "\u2728" },
    discovery: { label: "Discovery", icon: "\uD83D\uDD0D" },
  };

  // Pick a visually interesting badge — prefer non-discovery features since most apps have discovery
  function pickBadge(featureFocus) {
    if (!featureFocus || !featureFocus.length) {
      return { label: "Student Design", icon: "\uD83C\uDFA8" };
    }
    var nonDiscovery = featureFocus.filter(function (f) {
      return f !== "discovery";
    });
    var pool = nonDiscovery.length ? nonDiscovery : featureFocus;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    return (
      featureBadges[pick] || { label: "Student Design", icon: "\uD83C\uDFA8" }
    );
  }

  // Fisher-Yates shuffle, then take first 3
  for (var i = designs.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = designs[i];
    designs[i] = designs[j];
    designs[j] = tmp;
  }
  var picked = designs.slice(0, 3);

  // Build phone DOM for each pick
  picked.forEach(function (design, idx) {
    var phone = phones[idx];
    if (!phone) return;

    var badge = pickBadge(design.feature_focus);

    // Build phone frame HTML
    phone.innerHTML =
      '<button type="button" class="hero-phone-btn" data-quicklook' +
      ' aria-label="Quick look: ' +
      (design.title || "").replace(/"/g, "&quot;") +
      " (" +
      badge.label +
      ')">' +
      '<div class="relative">' +
      '<div class="phone-frame">' +
      '<div class="phone-frame-notch" aria-hidden="true"></div>' +
      "<picture>" +
      '<source srcset="' +
      design.thumbnailWebp +
      '" type="image/webp">' +
      '<img src="' +
      design.thumbnail +
      '"' +
      ' alt="' +
      (design.title || "").replace(/"/g, "&quot;") +
      '"' +
      (idx === 0 ? ' loading="eager"' : ' loading="lazy"') +
      ' decoding="async" class="phone-frame-img">' +
      "</picture>" +
      "</div>" +
      '<span class="hero-phone-badge">' +
      '<span aria-hidden="true">' +
      badge.icon +
      "</span> " +
      badge.label +
      "</span>" +
      "</div>" +
      "</button>";

    // Attach Quick Look JSON payload
    var script = document.createElement("script");
    script.type = "application/json";
    script.setAttribute("data-design-json", "");
    script.textContent = JSON.stringify({
      title: design.title,
      summary: design.summary,
      designer: design.designer,
      grade: design.grade,
      feature_focus: design.feature_focus,
      url: design.url,
      voteKey: design.voteKey,
      votes: design.votes,
      demo_url: design.demo_url,
      screens: design.screens,
    });
    phone.appendChild(script);
  });

  // ---------------------------------------------------------------
  // 1. Shuffle positions on load (Fisher-Yates)
  // ---------------------------------------------------------------
  const reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileQuery = window.matchMedia("(max-width: 767px)");

  const baseMeta = document.querySelector('meta[name="baseurl"]');
  const designsUrl = (baseMeta ? baseMeta.content : "") + "/designs/";

  const positions = phones.map((_, i) => i);
  for (let k = positions.length - 1; k > 0; k--) {
    const m = Math.floor(Math.random() * (k + 1));
    [positions[k], positions[m]] = [positions[m], positions[k]];
  }
  applyPositions();

  function applyPositions() {
    phones.forEach((phone, i) => {
      phone.setAttribute("data-pos", String(positions[i]));
    });
  }

  // ---------------------------------------------------------------
  // 2. Cycle: front (0) → back, everyone else shifts forward
  // ---------------------------------------------------------------
  function cycle() {
    for (let i = 0; i < positions.length; i++) {
      positions[i] = (positions[i] + positions.length - 1) % positions.length;
    }
    applyPositions();
  }

  // ---------------------------------------------------------------
  // 3. Auto-cycle every 4 s (pauses on hover / touch)
  // ---------------------------------------------------------------
  let timer = null;

  function startAuto() {
    if (reducedMotion) return;
    stopAuto();
    timer = setInterval(cycle, 4000);
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  startAuto();
  deck.addEventListener("mouseenter", stopAuto);
  deck.addEventListener("mouseleave", startAuto);

  // ---------------------------------------------------------------
  // 4. Touch handling — swipe cycles, tap navigates on mobile
  // ---------------------------------------------------------------
  let startX = 0;
  let startY = 0;
  let gestureDir = null;

  deck.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      gestureDir = null;
      stopAuto();
    },
    { passive: true },
  );

  deck.addEventListener(
    "touchmove",
    (e) => {
      if (gestureDir === null) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 8 || dy > 8) {
          gestureDir = dx > dy ? "h" : "v";
        }
      }
      if (gestureDir === "h") {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  deck.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const absDx = Math.abs(dx);

      if (gestureDir === "h" && absDx > 20) {
        cycle();
      }

      gestureDir = null;
      startAuto();
    },
    { passive: true },
  );

  // ---------------------------------------------------------------
  // 5. Mobile tap → navigate to immersive gallery at /designs/
  //    Desktop tap → let Quick Look modal handle it (no intercept)
  // ---------------------------------------------------------------
  deck.addEventListener(
    "click",
    (e) => {
      if (!mobileQuery.matches) return;

      const btn = e.target.closest("[data-quicklook]");
      if (!btn) return;

      e.stopPropagation();
      e.preventDefault();
      window.location.href = designsUrl;
    },
    true,
  );
})();
