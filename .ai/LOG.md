# Log

## Baseline test failures
none (17 Nov 2026: npm test passes - HTML valid, 46 links OK, 34 of 34 page runs)

## Done
<!-- One line per finished task: T1 | files | summary -->
T1 | styles.css, home-v1.css, home-v2.css, chosen-type.css, nav.css, members/members.css | deleted the five superseded CSS files and pointed the members.css header at site.css; npm test 34/34, 46 links OK
T2 | README.md | repointed the two stale stylesheet mentions (chosen-type.css, home-v1.css) to site.css; no deleted CSS filenames remain in README.md; npm test 34/34, 46 links OK
T3 | scripts/gallery-tags.py | deleted the dead hyphenated duplicate; scripts/gallery_tags.py untouched; npm test 34/34, 46 links OK

## Questions for Tobi
- T4 is blocked on OneDrive, not on code. `images/opt/7cc8b9568f0a-1600.webp` and `images/opt/f4caec345099-1600.webp` are OneDrive Files-On-Demand placeholders (ReparsePoint), so the compress script's `writeFileSync` fails with `UNKNOWN: unknown error, errno -4094`. Could you set both files to "Always keep on this device" (and let OneDrive finish syncing), then run `node .ai/tools/compress-webp.mjs` again? Nothing was changed by the two attempts.

## Legal flags for Tobi

## Final test run
