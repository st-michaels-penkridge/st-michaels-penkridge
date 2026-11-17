# Log

## Baseline test failures
none (17 Nov 2026: npm test passes - HTML valid, 46 links OK, 34 of 34 page runs)

## Done
<!-- One line per finished task: T1 | files | summary -->
T1 | styles.css, home-v1.css, home-v2.css, chosen-type.css, nav.css, members/members.css | deleted the five superseded CSS files and pointed the members.css header at site.css; npm test 34/34, 46 links OK
T2 | README.md | repointed the two stale stylesheet mentions (chosen-type.css, home-v1.css) to site.css; no deleted CSS filenames remain in README.md; npm test 34/34, 46 links OK
T3 | scripts/gallery-tags.py | deleted the dead hyphenated duplicate; scripts/gallery_tags.py untouched; npm test 34/34, 46 links OK
T4 | images/opt/7cc8b9568f0a-1600.webp, images/opt/f4caec345099-1600.webp | rebuilt from the originals at sign-off: 303KB to 227KB and 256KB to 167KB, same names and pixel sizes, checked side by side at full size
T5 | .claude/debt-log.md | replaced the two resolved entries with one resolved line

## Questions for Tobi
- (resolved) T4 was blocked locally because the repo sits in OneDrive and the photos were online-only placeholders. Fix for next time: right-click the repo folder and choose "Always keep on this device", or re-clone it outside OneDrive.

## Legal flags for Tobi

## Final test run
17 Nov 2026, Opus sign-off: npm test fully passes - HTML valid, 46 links OK, 34 of 34 page runs.
