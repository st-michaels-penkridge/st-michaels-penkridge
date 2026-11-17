# Plan

**Goal (done 17 Nov 2026, by Opus during setup):** Get `npm test` fully green so the GitHub check can guard main. These are the only failures on the site today: 5 HTML errors and 274 gallery thumbnails without sizes.

## Design notes

None of these tasks should change how anything looks. If a page looks different afterwards, that's a bug.

## Tasks

- [x] T1 | Agent: frontend | Checks: qa, review
  Files: churchyard.html
  Do: In the gravefindr `<iframe>` (line 56), delete the `scrolling="no"` attribute. Change nothing else on the tag. `gravefindr-embed.js` already resizes the frame to fit its content, so no scrollbar is needed.
  Done when: `npm run test:html` reports nothing for churchyard.html, and the diff is that one attribute.

- [x] T2 | Agent: frontend | Checks: qa, review
  Files: gallery.html
  Do: Add `role="region"` to the three `<div class="carousel" ...>` elements (lines 165, 181 and 197, data-carousel `outside`, `inside` and `memorials`). Keep their `aria-roledescription` and `aria-label` exactly as they are. This is the standard accessible carousel pattern.
  Done when: no `aria-label-misuse` errors, and the diff is those three attributes.

- [x] T3 | Agent: frontend | Checks: qa, review
  Files: gallery.html, gallery.js
  Do: Delete `<img id="lightbox-img" src="" alt="">` from the lightbox `<figure>` in gallery.html. In gallery.js, change `const lbImg = document.getElementById("lightbox-img");` to `let lbImg = null; // made on first open, so no empty <img> sits in the page`. At the top of `openLightbox`, straight after `if (!dialog) return;`, add:
  ```js
  if (!lbImg) {
    lbImg = document.createElement("img");
    lbImg.id = "lightbox-img";
    dialog.querySelector(".lightbox-figure").prepend(lbImg);
  }
  ```
  Leave the existing `lbImg.src` and `lbImg.alt` lines as they are.
  Done when: no `attribute-allowed-values` error in gallery.html. Clicking any thumbnail opens the lightbox with the large photo above its caption, it closes with the button and with Esc, and there are no console errors.

- [x] T4 | Agent: frontend | Checks: qa, review
  Files: gallery.js
  Do: In `makeCell`, straight after `img.src = sized(item.file, 400);`, add `img.width = 400;` and `img.height = 300;`. The thumbnails sit in fixed-height frames with `object-fit: cover`, so this doesn't change how they look. It just tells the browser their size up front.
  Done when: `npm run test:pages` passes for /gallery.html on phone and desktop, and the carousels look and move exactly as before.

## Waiting on

These need facts from Greg or the parish (24 TODOs across the site). Don't guess any of them:
- The church address and postcode (on most pages)
- Service pattern and finish time (index.html, sundays.html)
- The parish's own Parish Giving link, from the treasurer (donate.html)
- Parking and step-free access details (index.html, visit.html)
- Details, fees and how to book baptisms, weddings and funerals, plus the Rector's name and number (life-events.html)
- Days and times for Messy Church and coffee mornings (events.html)
