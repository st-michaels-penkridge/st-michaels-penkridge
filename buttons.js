(function () {
  "use strict";
  // Size the full-screen hero to whatever height the header really is
  var mast = document.querySelector(".masthead");
  function sizeHero() {
    if (mast) document.documentElement.style.setProperty("--mast-h", mast.offsetHeight + "px");
  }
  sizeHero();
  window.addEventListener("resize", sizeHero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeHero);

  // A soft shadow under the header once the page has moved
  if (mast) {
    var onScroll = function () {
      mast.classList.toggle("is-scrolled", window.scrollY > 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  // Buttons: a light that follows the cursor, and a gentle magnet pull.
  // Only for mouse and trackpad users, and never when motion is turned off.
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!fine) return;

  document.querySelectorAll(".btn").forEach(function (btn) {
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var x = e.clientX - r.left;
      var y = e.clientY - r.top;
      btn.style.setProperty("--mx", x + "px");
      btn.style.setProperty("--my", y + "px");
      if (still) return;
      var tx = ((x - r.width / 2) / r.width) * 6;
      var ty = ((y - r.height / 2) / r.height) * 5;
      btn.style.setProperty("--tx", tx.toFixed(1) + "px");
      btn.style.setProperty("--ty", ty.toFixed(1) + "px");
    });
    btn.addEventListener("pointerleave", function () {
      btn.style.removeProperty("--tx");
      btn.style.removeProperty("--ty");
    });
  });

  // Stained glass: each window tilts slightly towards the cursor
  if (still) return;
  document.querySelectorAll(".lancet").forEach(function (glass) {
    glass.addEventListener("pointermove", function (e) {
      var r = glass.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      glass.style.setProperty("--ry", (px * 14).toFixed(2) + "deg");
      glass.style.setProperty("--rx", (-py * 6).toFixed(2) + "deg");
      glass.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
      glass.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
      glass.classList.add("is-tilting");
    });
    glass.addEventListener("pointerleave", function () {
      ["--rx", "--ry"].forEach(function (p) { glass.style.removeProperty(p); });
      glass.classList.remove("is-tilting");
    });
  });
})();
