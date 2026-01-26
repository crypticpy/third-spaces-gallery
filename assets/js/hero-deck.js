/**
 * Hero Phone Deck — shuffle, cycle, and mobile navigation
 *
 * - Shuffles phone order on each page load (Fisher-Yates)
 * - Auto-cycles every 4 s so every design gets front billing
 * - Horizontal swipe on the deck cycles (prevents page scroll)
 * - On mobile, tapping a phone navigates to /designs/ which
 *   auto-activates the immersive gallery
 * - Respects prefers-reduced-motion
 */
(() => {
  const deck = document.querySelector("[data-hero-deck]");
  if (!deck) return;

  const phones = Array.from(deck.querySelectorAll("[data-hero-phone]"));
  if (phones.length < 2) return;

  const reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileQuery = window.matchMedia("(max-width: 767px)");

  // Resolve /designs/ URL from baseurl meta tag
  const baseMeta = document.querySelector('meta[name="baseurl"]');
  const designsUrl = (baseMeta ? baseMeta.content : "") + "/designs/";

  // ---------------------------------------------------------------
  // 1. Shuffle positions on load (Fisher-Yates)
  // ---------------------------------------------------------------
  const positions = phones.map((_, i) => i);
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
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
  //    Uses touchmove with passive:false so we can preventDefault
  //    on horizontal gestures to stop the page from scrolling.
  // ---------------------------------------------------------------
  let startX = 0;
  let startY = 0;
  let gestureDir = null; // null = undecided, "h" = horizontal, "v" = vertical

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
      // Determine gesture direction on first significant movement
      if (gestureDir === null) {
        const dx = Math.abs(e.touches[0].clientX - startX);
        const dy = Math.abs(e.touches[0].clientY - startY);
        if (dx > 8 || dy > 8) {
          gestureDir = dx > dy ? "h" : "v";
        }
      }
      // Block page scroll for horizontal swipes on the deck
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
        // Horizontal swipe — cycle the deck
        cycle();
      }
      // Taps (no significant movement) fall through to click handler

      gestureDir = null;
      startAuto();
    },
    { passive: true },
  );

  // ---------------------------------------------------------------
  // 5. Mobile tap → navigate to immersive gallery at /designs/
  //    Desktop tap → let Quick Look modal handle it (no intercept)
  //    Capture phase fires before modal.js event delegation.
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
    true, // capture phase
  );
})();
