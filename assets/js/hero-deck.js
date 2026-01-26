/**
 * Hero Phone Deck — shuffle, cycle, and mobile navigation
 *
 * - Shuffles phone order on each page load (Fisher-Yates)
 * - Auto-cycles every 4 s so every design gets front billing
 * - Horizontal swipe on the deck manually cycles
 * - On mobile (<768 px), tapping a phone navigates to the submission
 *   page instead of opening the Quick Look modal
 * - Respects prefers-reduced-motion (no auto-cycle, no transitions)
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

  // ---------------------------------------------------------------
  // 1. Shuffle positions on load (Fisher-Yates)
  // ---------------------------------------------------------------
  const positions = phones.map((_, i) => i); // [0, 1, 2]
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
  // 4. Swipe detection on the deck (horizontal → cycle)
  // ---------------------------------------------------------------
  let startX = 0;
  let startY = 0;

  deck.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      stopAuto();
    },
    { passive: true },
  );

  deck.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe — cycle the deck
        cycle();
      }
      // Taps fall through to the click handler below

      startAuto();
    },
    { passive: true },
  );

  // ---------------------------------------------------------------
  // 5. Mobile: navigate to submission page instead of Quick Look
  //    Uses capture phase so it fires before modal.js delegation
  // ---------------------------------------------------------------
  deck.addEventListener(
    "click",
    (e) => {
      if (!mobileQuery.matches) return; // desktop → let Quick Look handle it

      const btn = e.target.closest("[data-quicklook]");
      if (!btn) return;

      const phone = btn.closest("[data-hero-phone]");
      if (!phone) return;

      const jsonEl = phone.querySelector("[data-design-json]");
      if (!jsonEl) return;

      try {
        const data = JSON.parse(jsonEl.textContent);
        if (data.url) {
          e.stopPropagation();
          e.preventDefault();
          window.location.href = data.url;
        }
      } catch (err) {
        console.warn("[HeroDeck] Could not parse design JSON", err);
      }
    },
    true, // capture phase
  );
})();
