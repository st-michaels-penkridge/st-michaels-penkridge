# Log

## Baseline test failures
none (18 Nov 2026: npm test passes - HTML valid, links OK, 34 of 34 page runs)

## Done
<!-- One line per finished task: T1 | files | summary -->
S1 | buttons.js | season worked out from the date and set as data-season on <html>; checked 29 dates across 2022-2028 plus the ?season= preview
S2 | site.css | --band variable for the two home bands; Advent violet, Christmas evergreen bands, Easter gold; .season-note styles
S3 | index.html | one seasonal hero line per season, linking to What's on
S4 | all pages | cache versions bumped to 20261118
B1 | bygone.html, images/bygone/ | Bygone days page with 24 of Andy's old pictures in four groups
B2 | site.css | .album columns, reusing the History page frame
B3 | all pages, gallery.html | Bygone days in the About us menu, and linked from the History page photos

## Questions for Tobi
- Lent and Holy Week weren't asked for. Add them too?

## Legal flags for Tobi
- Bygone days only uses old postcards, engravings and early photographs. The dated ones are 1936 or earlier, and the rest look as old, but most are undated, so Andy should confirm none of them are recent or someone else's work. The pictures left out are listed in PLAN.md under Waiting on.
- The home page says giving is set up through the Parish Giving Scheme, but the scheme's own site says St Michael's hasn't registered yet. The treasurer should check.
- Colours meet WCAG 2.2 AA in every season (axe, 4 seasons x 13 pages).

## Final test run
18 Nov 2026, Opus: npm test fully passes - HTML valid, links OK, 36 of 36 page runs. Extra season check: 4 seasons x 13 pages, axe clean on desktop, no sideways scroll at 375px.
