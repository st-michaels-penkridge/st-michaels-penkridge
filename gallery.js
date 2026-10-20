(function () {
  "use strict";

  // Three sliding carousels on the History page, filled from images/manifest.json:
  // outside (the church and the town), inside (glass, stone and wood) and memorials.
  const reels = document.querySelectorAll("[data-carousel]");
  if (!reels.length) return;

  const dialog = document.getElementById("gallery-lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCap = document.getElementById("lightbox-caption");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const INTERVAL = 5000;

  const GLASS = [
    { file: "images/glass-east-window.jpg", caption: "The east window, glass by Ward & Hughes, 1864", rank: 200, group: "inside" },
    { file: "images/glass-chapel-window.jpg", caption: "Christ with the children, stained glass in the aisle chapel", rank: 190, group: "inside" },
    { file: "images/glass-east-tracery.jpg", caption: "Tracery at the top of the east window", rank: 120, group: "inside" },
  ];

  function cleanCaption(caption) {
    return caption
      .replace(/\.(jpe?g|png|webp)$/i, "")
      .replace(/\s*\(\d+\)\s*$/, "")
      .replace(/\s+0?\d{1,2}\s*$/, "")
      .replace(/^Penkridge St\.? Michael\s*-\s*/i, "")
      .trim();
  }

  function groupFor(item) {
    const c = (item.caption || "").toLowerCase();
    if (/memorial|tomb|monument|littleton|hatherton|congreve|arms|tablet|effigy|wynnesbury|percy|hyacinth|inscription/.test(c)) {
      return "memorials";
    }
    if (/nave|altar|chapel|organ|chancel|pulpit|lavabo|font|peal board|interior/.test(c)) {
      return "inside";
    }
    return "outside";
  }

  function openLightbox(item) {
    if (!dialog) return;
    lbImg.src = item.file;
    lbImg.alt = cleanCaption(item.caption);
    lbCap.textContent = cleanCaption(item.caption);
    if (dialog.showModal) dialog.showModal();
  }

  function build(reel, items) {
    const track = reel.querySelector(".carousel-track");
    const prev = reel.querySelector("[data-prev]");
    const next = reel.querySelector("[data-next]");
    const play = reel.querySelector("[data-play]");
    const pos = reel.querySelector("[data-pos]");
    let timer = null;
    let paused = reduceMotion;
    let hovering = false;
    let visible = false;

    items.forEach((item) => {
      const li = document.createElement("li");
      li.className = "gallery-cell";
      const fig = document.createElement("figure");
      fig.className = "gallery-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-thumb";
      btn.setAttribute("aria-label", "View larger: " + cleanCaption(item.caption));
      const img = document.createElement("img");
      img.src = item.file;
      img.alt = cleanCaption(item.caption);
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => li.remove());
      btn.appendChild(img);
      btn.addEventListener("click", () => openLightbox(item));
      const cap = document.createElement("figcaption");
      cap.textContent = cleanCaption(item.caption);
      fig.append(btn, cap);
      li.appendChild(fig);
      track.appendChild(li);
    });

    function step() {
      const first = track.querySelector(".gallery-cell");
      if (!first) return track.clientWidth;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }

    function atEnd() {
      return track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    }

    function update() {
      const total = track.querySelectorAll(".gallery-cell").length;
      const index = Math.min(total, Math.round(track.scrollLeft / step()) + 1);
      if (pos) pos.textContent = (atEnd() ? total : index) + " of " + total;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = atEnd();
    }

    function advance() {
      if (atEnd()) track.scrollTo({ left: 0, behavior: "smooth" });
      else track.scrollBy({ left: step(), behavior: "smooth" });
    }

    function sync() {
      const shouldRun = !paused && !hovering && visible && !document.hidden;
      if (shouldRun && !timer) timer = setInterval(advance, INTERVAL);
      if (!shouldRun && timer) {
        clearInterval(timer);
        timer = null;
      }
      if (play) {
        play.innerHTML = paused ? "&#9654;" : "&#10074;&#10074;";
        play.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
      }
    }

    prev?.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next?.addEventListener("click", () => advance());
    play?.addEventListener("click", () => {
      paused = !paused;
      sync();
    });

    reel.addEventListener("mouseenter", () => { hovering = true; sync(); });
    reel.addEventListener("mouseleave", () => { hovering = false; sync(); });
    reel.addEventListener("focusin", () => { hovering = true; sync(); });
    reel.addEventListener("focusout", () => { hovering = false; sync(); });
    track.addEventListener("touchstart", () => { paused = true; sync(); }, { passive: true });
    document.addEventListener("visibilitychange", sync);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
        sync();
      }, { threshold: 0.35 }).observe(reel);
    } else {
      visible = true;
    }

    let scrollTimer;
    track.addEventListener("scroll", () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(update, 80);
    });
    window.addEventListener("resize", update);
    update();
    sync();
  }

  dialog?.querySelector(".lightbox-close")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });

  fetch("images/manifest.json")
    .then((r) => {
      if (!r.ok) throw new Error("manifest missing");
      return r.json();
    })
    .then((data) => {
      const all = data.map((item) => ({ ...item, group: groupFor(item) })).concat(GLASS);
      reels.forEach((reel) => {
        const key = reel.getAttribute("data-carousel");
        const items = all
          .filter((i) => i.group === key)
          .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || a.caption.localeCompare(b.caption, "en"));
        build(reel, items);
      });
    })
    .catch(() => {
      reels.forEach((reel) => {
        reel.querySelector(".carousel-track").innerHTML =
          '<li class="gallery-error">The photos could not be loaded. Please refresh the page to try again.</li>';
      });
    });
})();
