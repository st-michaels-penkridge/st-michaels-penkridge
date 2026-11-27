# Log

## Baseline test failures
none (18 Nov 2026: npm test passes - HTML valid, links OK, 36 of 36 page runs)

## Done
H1 | index.html, site.css | welcome strip and 10:30 band removed, with their styles and script
H2 | index.html, site.css, live-content.js, members/*, supabase/* | framed notice board; admins pin pictures with crop, position and size in the page editor; new migration with an admin-only storage bucket
H3 | index.html, site.css | Sunday photo matches the text; Find a grave search band; big counter without paragraphs; giving cut to essentials
H4 | buttons.js, site.css, privacy.html | map waits for consent; bottom bar with equal choices; privacy page explains it and lets people change their answer
B1 (24 Nov, william-tobi) | sundays, visit, life-events, donate, privacy, index (welcome popup), site.css | every button now uses the home page look (.btn-line, or .btn-give for giving); old -fill/-ghost/-light variants deleted; one size in .btn-square; site.css v=20261124. Already failing on William before this: index.html desktop page weight 1593KB (limit 1500)
B2 (24 Nov, william-tobi) | site.css | every photo set into a page (Sundays intro, home first Sunday, History rows and photo strips, Bygone album) gets squircle corners via corner-shape (Chrome/Edge); Safari and Firefox fall back to plain rounded corners; the black frames and mount on the strips and album removed; site.css v=20261124b
B3 (27 Nov, tobi-27-11-2026) | index.html, site.css | Give rebuilt from the signed-off mockup: full-width blossom photo, the Give card overlapping it with stacked buttons, and "What your gift does" (the Donate page's four lines) beside it on the same bottom line so the card has no empty space; site.css v=20261127. Also fixes the index.html desktop page-weight failure (smaller Give photo)
B4 (27 Nov, tobi-27-11-2026) | index.html, site.css, buttons.js, images/opt | Find a grave rebuilt from the mockup: plain search on white beside the snow-cross photo (squircle), bigger search bar, link to browse the churchyard on gravefindr; rolling reel and card removed (HTML, CSS, script, unused --shadow-6); site.css v=20261127b, buttons.js v=20261127
B5 (27 Nov, tobi-27-11-2026) | index.html, images/opt | Give photo re-encoded from the church's original at higher quality with light sharpening (7cc8b9568f0a-1443.webp); the original is only 1443px wide, so a full-size file from the church would be sharper still on high-density screens
B6 (27 Nov, tobi-27-11-2026) | site.css | header Donate button now burgundy with white lettering like the Give buttons, on every page and in the phone menu (dropped the white override and the outlined current-page style); site.css v=20261127c
B7 (27 Nov, tobi-27-11-2026) | site.css | menus: the dropdown is a squircle card with no dividers, each link lights up as its own squircle on hover or keyboard focus (desktop and phone), the current page shows in red; the phone menu card has squircle corners; site.css v=20261127d
B8 (27 Nov, tobi-27-11-2026) | visit.html | Visit map back to click-to-load (the "Show the map" placeholder), so Google Maps only loads after Accept on the cookie bar or a click, as on the home page; undoes the always-on map from 56ef4fd before this goes to main

## Questions for Tobi
- None.

## Legal flags for Tobi
- The cookie bar is the legal way to load Google Maps straight away (UK PECR): nothing loads until a visitor says yes, "No thanks" is as easy as "Allow", and the privacy page lets them change their mind.
- Pictures on the notice board are public. The editor reminds admins to use only pictures the church may share and no photos of children without consent.

## Final test run
18 Nov 2026, Opus: npm test fully passes (HTML valid, links OK, 36 of 36 page runs). Extra checks: axe clean on the editor with the picture form open, the home page with a picture pinned, privacy and visit, at 1280 and 375; cookie choices tested across pages; seasons still clean on 13 pages.
