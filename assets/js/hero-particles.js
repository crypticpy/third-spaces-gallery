/**
 * Hero Particle System
 * Spawns floating emoji particles (hearts, stars, thumbs-up) that drift
 * upward and fade out, creating a sense of activity and engagement.
 *
 * Performance: Uses CSS animations (GPU-composited transform + opacity),
 * caps active particle count, pauses when tab is hidden or hero is
 * off-screen, and adapts density to screen width.
 *
 * Accessibility: Fully disabled when prefers-reduced-motion is set.
 */
(function () {
  "use strict";

  // --- Respect reduced motion -----------------------------------------
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motionQuery.matches) return;

  // --- Config ---------------------------------------------------------
  var EMOJIS = [
    "\u2764\uFE0F",
    "\u2B50",
    "\uD83D\uDC4D",
    "\u2728",
    "\uD83D\uDC96",
    "\uD83C\uDF1F",
    "\uD83C\uDF0D",
  ];
  var MAX_PARTICLES = 9; // hard cap on simultaneous particles
  var SPAWN_INTERVAL_MS = 1800; // base interval between spawns
  var PARTICLE_LIFETIME_MS = 4500; // matches CSS animation duration
  var active = 0;
  var container = null;
  var hero = null;
  var spawnTimer = null;
  var isVisible = true;

  // --- Helpers --------------------------------------------------------
  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getMaxForViewport() {
    var w = window.innerWidth;
    if (w < 640) return 4; // mobile
    if (w < 1024) return 6; // tablet
    return MAX_PARTICLES; // desktop
  }

  // --- Particle lifecycle ---------------------------------------------
  function spawnParticle() {
    if (!isVisible) return;
    if (active >= getMaxForViewport()) return;

    var el = document.createElement("span");
    el.className = "hero-particle";
    el.setAttribute("aria-hidden", "true");
    el.textContent = pick(EMOJIS);

    // Randomise position and animation properties
    var startX = rand(5, 95); // % from left
    var startY = rand(-30, 200); // px — varied vertical origin
    var size = rand(14, 28); // px
    var duration = rand(14, 22); // seconds
    var drift = rand(-50, 50); // px horizontal drift
    var travel = rand(-40, -100); // vh — how far up before gone
    var delay = rand(0, 0.5); // seconds

    el.style.cssText =
      "left:" +
      startX +
      "%;" +
      "font-size:" +
      size +
      "px;" +
      "--drift:" +
      drift +
      "px;" +
      "--start-y:" +
      startY +
      "px;" +
      "--travel:" +
      travel +
      "vh;" +
      "--dur:" +
      duration +
      "s;" +
      "animation-delay:" +
      delay +
      "s;";

    container.appendChild(el);
    active++;

    // Remove after animation completes
    var removeAfter = (duration + delay) * 1000 + 100;
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      active--;
    }, removeAfter);
  }

  // --- Visibility / performance guards --------------------------------
  function onVisibilityChange() {
    if (document.hidden) {
      isVisible = false;
    } else {
      isVisible = true;
    }
  }

  var observer = null;
  function setupIntersectionObserver() {
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(
      function (entries) {
        isVisible = entries[0].isIntersecting && !document.hidden;
      },
      { threshold: 0.1 },
    );
    observer.observe(hero);
  }

  // --- Reduced-motion live toggle -------------------------------------
  motionQuery.addEventListener("change", function (e) {
    if (e.matches) {
      // User enabled reduced motion — tear down
      clearInterval(spawnTimer);
      if (container && container.parentNode)
        container.parentNode.removeChild(container);
      if (observer) observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  });

  // --- Init -----------------------------------------------------------
  function init() {
    hero = document.querySelector(".hero-mesh");
    if (!hero) return;

    container = document.createElement("div");
    container.className = "hero-particles-container";
    container.setAttribute("aria-hidden", "true");
    hero.appendChild(container);

    document.addEventListener("visibilitychange", onVisibilityChange);
    setupIntersectionObserver();

    // Stagger initial burst so it doesn't start empty
    for (var i = 0; i < 2; i++) {
      setTimeout(spawnParticle, i * 600);
    }

    spawnTimer = setInterval(spawnParticle, SPAWN_INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
