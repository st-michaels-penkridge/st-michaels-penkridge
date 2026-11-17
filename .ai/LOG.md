# Log

## Baseline test failures
Recorded 17 Nov 2026 when the workflow was set up:
- test:html - churchyard.html:56 `scrolling` is deprecated on `<iframe>`; gallery.html:165, 181, 197 `aria-label` can't be used on a plain `<div>`; gallery.html:216 `<img src="">` is an invalid value.
- test:links - passes (46 links).
- test:pages - 32 of 34 pass. /gallery.html (phone and desktop): 274 carousel thumbnails have no width and height.
- Skipped: /graveyard/churchyard.html, the old volunteer map tool. It needs the 1GB tomb photos, which aren't in git.

## Done
<!-- One line per finished task: T1 | files | summary -->
- T1 | churchyard.html | removed deprecated scrolling="no" from the gravefindr iframe
- T2 | gallery.html | added role="region" to the three carousels
- T3 | gallery.html, gallery.js | lightbox <img> now made on first open, so no empty src in the page (checked: opens, shows photo and caption, closes with Esc and the button)
- T4 | gallery.js | thumbnails get width/height; gallery strip is pixel-identical before and after

## Questions for Tobi

## Legal flags for Tobi

## Final test run
17 Nov 2026: npm test fully passes - HTML valid, 46 links OK, 34 of 34 page runs pass.
