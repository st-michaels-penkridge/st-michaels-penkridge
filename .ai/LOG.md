# Log

## Baseline test failures
none (18 Nov 2026: npm test passes - HTML valid, links OK, 36 of 36 page runs)

## Done
H1 | index.html, site.css | welcome strip and 10:30 band removed, with their styles and script
H2 | index.html, site.css, live-content.js, members/*, supabase/* | framed notice board; admins pin pictures with crop, position and size in the page editor; new migration with an admin-only storage bucket
H3 | index.html, site.css | Sunday photo matches the text; Find a grave search band; big counter without paragraphs; giving cut to essentials
H4 | buttons.js, site.css, privacy.html | map waits for consent; bottom bar with equal choices; privacy page explains it and lets people change their answer
B1 (24 Nov, william-tobi) | sundays, visit, life-events, donate, privacy, index (welcome popup), site.css | every button now uses the home page look (.btn-line, or .btn-give for giving); old -fill/-ghost/-light variants deleted; one size in .btn-square; site.css v=20261124. Already failing on William before this: index.html desktop page weight 1593KB (limit 1500)

## Questions for Tobi
- None.

## Legal flags for Tobi
- The cookie bar is the legal way to load Google Maps straight away (UK PECR): nothing loads until a visitor says yes, "No thanks" is as easy as "Allow", and the privacy page lets them change their mind.
- Pictures on the notice board are public. The editor reminds admins to use only pictures the church may share and no photos of children without consent.

## Final test run
18 Nov 2026, Opus: npm test fully passes (HTML valid, links OK, 36 of 36 page runs). Extra checks: axe clean on the editor with the picture form open, the home page with a picture pinned, privacy and visit, at 1280 and 375; cookie choices tested across pages; seasons still clean on 13 pages.
