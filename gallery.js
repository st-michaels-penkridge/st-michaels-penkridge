(function () {
  "use strict";

  // Three carousels on the History page, filled from images/manifest.json:
  // outside (the church and the town), inside (glass, stone and wood) and memorials.
  // Each one drifts slowly and seamlessly across the full width of the page,
  // stops while the cursor is over it, and can be dragged or stepped with the buttons.
  const reels = document.querySelectorAll("[data-carousel]");
  if (!reels.length) return;

  const dialog = document.getElementById("gallery-lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCap = document.getElementById("lightbox-caption");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SPEED = 38; // pixels per second
  let lightboxOpen = false;

  const GLASS = [
    { file: "images/glass-east-window.jpg", caption: "East window, by Ward & Hughes, 1864", rank: 200, group: "inside" },
    { file: "images/glass-chapel-window.jpg", caption: "Christ with the children, chapel glass", rank: 190, group: "inside" },
    { file: "images/glass-east-tracery.jpg", caption: "Tracery at the top of the east window", rank: 120, group: "inside" },
  ];

  // Photos supplied by the parish (not from Wikimedia Commons), November 2026.
  // Grouped and ranked explicitly so they land in the right carousel, best first,
  // regardless of what rank-gallery.py later does to images/manifest.json.
  const PARISH_PHOTOS = [
    { file: "images/8df36e0988e8.jpg", caption: "Cherry blossom at the gate", rank: 200, group: "outside" },
    { file: "images/7cc8b9568f0a.jpg", caption: "Blossom beneath the tower", rank: 195, group: "outside" },
    { file: "images/6cc1ade8fa68.jpg", caption: "Snow in the churchyard", rank: 190, group: "outside" },
    { file: "images/a275dbe9703f.jpg", caption: "St Michael's under snow", rank: 185, group: "outside" },
    { file: "images/58425c177166.jpg", caption: "A crisp winter morning", rank: 180, group: "outside" },
    { file: "images/325a5ddeec4b.jpg", caption: "The church lit at night", rank: 175, group: "outside" },
    { file: "images/bec610a0b444.jpg", caption: "St Michael's after dark", rank: 170, group: "outside" },
    { file: "images/0405fa5054b4.jpg", caption: "A rainbow over the church", rank: 165, group: "outside" },
    { file: "images/f4caec345099.jpg", caption: "The church from the air", rank: 160, group: "outside" },
    { file: "images/0b274b19ff65.jpg", caption: "The tower at dusk", rank: 155, group: "outside" },
    { file: "images/c8d80d6a706b.jpg", caption: "The church on a bright day", rank: 150, group: "outside" },
    { file: "images/efb1ab435f91.jpg", caption: "Path through the churchyard", rank: 145, group: "outside" },
    { file: "images/71a2cb618232.jpg", caption: "A classic view of the church", rank: 140, group: "outside" },
    { file: "images/14045945b55f.jpg", caption: "Down the nave", rank: 200, group: "inside" },
    { file: "images/b9cb8df4a1ae.jpg", caption: "The nave, towards the screen", rank: 195, group: "inside" },
    { file: "images/7ef7bae8d361.jpg", caption: "The Littleton tombs", rank: 200, group: "memorials" },
    { file: "images/c7d7c4f48edd.jpg", caption: "War memorial unveiling, 1921", rank: 195, group: "memorials" },
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


  // Small WebP thumbnails in the strip, a large one in the lightbox
  function sized(file, w) {
    var m = /^images\/([^\/]+)\.jpe?g$/i.exec(file);
    return m ? "images/opt/" + m[1] + "-" + w + ".webp" : file;
  }

  function openLightbox(item) {
    if (!dialog) return;
    lbImg.src = sized(item.file, 1600);
    lbImg.alt = cleanCaption(item.caption);
    lbCap.textContent = cleanCaption(item.caption);
    if (dialog.showModal) {
      dialog.showModal();
      lightboxOpen = true;
    }
  }

  function makeCell(item, isCopy, eager) {
    const li = document.createElement("li");
    li.className = "gallery-cell";
    if (isCopy) li.setAttribute("aria-hidden", "true");
    const fig = document.createElement("figure");
    fig.className = "gallery-item";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "gallery-thumb";
    btn.setAttribute("aria-label", "View larger: " + cleanCaption(item.caption));
    if (isCopy) btn.tabIndex = -1;
    const img = document.createElement("img");
    img.src = sized(item.file, 400);
    img.alt = isCopy ? "" : cleanCaption(item.caption);
    img.loading = eager ? "eager" : "lazy";
    img.decoding = "async";
    img.draggable = false;
    btn.appendChild(img);
    btn.addEventListener("click", (e) => {
      if (btn.closest(".carousel-viewport").dataset.dragged === "1") {
        e.preventDefault();
        return;
      }
      openLightbox(item);
    });
    const cap = document.createElement("figcaption");
    cap.textContent = cleanCaption(item.caption);
    fig.append(btn, cap);
    li.appendChild(fig);
    return li;
  }

  function build(reel, items) {
    const track = reel.querySelector(".carousel-track");
    const prev = reel.querySelector("[data-prev]");
    const next = reel.querySelector("[data-next]");
    const play = reel.querySelector("[data-play]");
    const pos = reel.querySelector("[data-pos]");
    const n = items.length;
    if (!n) return;

    items.forEach((item, i) => track.appendChild(makeCell(item, false, i < 4)));

    let step = 0;      // width of one photo plus the gap
    let setWidth = 0;  // width of one full run of photos
    let x = 0;         // how far the strip has moved
    let v = 0;         // current speed, eased so it slows to a stop
    let paused = reduceMotion;
    let hovering = false;
    let focused = false;
    let visible = false;
    let drag = null;
    let glide = null;
    let last = 0;
    let shownIndex = -1;

    // Repeat the photos so the strip never runs out, whatever the screen width
    function measure() {
      track.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
      const first = track.querySelector(".gallery-cell");
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = first.getBoundingClientRect().width + gap;
      setWidth = step * n;
      const copies = Math.max(1, Math.ceil(reel.clientWidth / setWidth) + 1);
      for (let c = 0; c < copies; c++) {
        items.forEach((item) => track.appendChild(makeCell(item, true, false)));
      }
      x = ((x % setWidth) + setWidth) % setWidth;
      render();
    }

    function render() {
      track.style.transform = "translate3d(" + (-x).toFixed(2) + "px, 0, 0)";
      const index = (Math.round(x / step) % n + n) % n;
      if (index !== shownIndex && pos) {
        shownIndex = index;
        pos.textContent = index + 1 + " of " + n;
      }
    }

    function wrap() {
      if (x >= setWidth) x -= setWidth;
      if (x < 0) x += setWidth;
    }

    function moving() {
      return !paused && !hovering && !focused && !drag && !glide && visible && !document.hidden && !lightboxOpen;
    }

    function frame(t) {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (glide) {
        const k = Math.min(1, (t - glide.start) / 550);
        const ease = 1 - Math.pow(1 - k, 3);
        x = glide.from + (glide.to - glide.from) * ease;
        if (k >= 1) glide = null;
      } else if (!drag) {
        const target = moving() ? SPEED : 0;
        v += (target - v) * Math.min(1, dt * 4);
        if (Math.abs(v) < 0.5 && target === 0) v = 0;
        x += v * dt;
      }
      wrap();
      render();
      requestAnimationFrame(frame);
    }

    function jump(dir) {
      const from = x;
      const base = Math.round(x / step) * step;
      glide = { from: from, to: base + dir * step, start: performance.now() };
      v = 0;
    }

    function syncPlay() {
      if (!play) return;
      play.innerHTML = paused ? "&#9654;" : "&#10074;&#10074;";
      play.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
    }

    prev?.addEventListener("click", () => jump(-1));
    next?.addEventListener("click", () => jump(1));
    play?.addEventListener("click", () => {
      paused = !paused;
      syncPlay();
    });

    // Stop while the cursor is over the photos or keyboard focus is inside
    const viewport = track.parentElement;
    viewport.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
    viewport.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") hovering = false; });
    reel.addEventListener("focusin", () => { focused = true; });
    reel.addEventListener("focusout", () => { focused = false; });
    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); jump(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); jump(-1); }
    });

    // Drag the strip with a finger or the mouse
    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      drag = { startX: e.clientX, startOffset: x, id: e.pointerId, moved: false };
      glide = null;
      v = 0;
      viewport.dataset.dragged = "0";
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) > 6) {
        drag.moved = true;
        viewport.dataset.dragged = "1";
        viewport.setPointerCapture(e.pointerId);
        viewport.classList.add("is-dragging");
      }
      if (drag.moved) {
        x = drag.startOffset - dx;
        wrap();
      }
    });
    const endDrag = () => {
      if (!drag) return;
      drag = null;
      viewport.classList.remove("is-dragging");
      setTimeout(() => { viewport.dataset.dragged = "0"; }, 0);
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting;
      }, { threshold: 0.1 }).observe(reel);
    } else {
      visible = true;
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    });

    measure();
    syncPlay();
    requestAnimationFrame(frame);
  }

  dialog?.querySelector(".lightbox-close")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog?.addEventListener("close", () => { lightboxOpen = false; });

  fetch("images/manifest.json")
    .then((r) => {
      if (!r.ok) throw new Error("manifest missing");
      return r.json();
    })
    .then((data) => {
      const all = data.map((item) => ({ ...item, group: groupFor(item) })).concat(GLASS, PARISH_PHOTOS);
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
