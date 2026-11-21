# Plan

**Goal:** Tobi's home page edits of 18 Nov 2026 (his marked-up screenshot): less filler, a real notice board, and stronger calls to action.

## Design notes

- The welcome line with four icons and the dark 10:30 band are gone. The 10:30 time is still in Your first Sunday and the footer.
- Notice board: one framed board with a title bar. When admins have pinned pictures (newsletters, posters), they sit on the left and notices on the right. With no pictures, the notices run three across. Pictures keep the crop chosen in the page editor (shape, position, zoom) through three CSS variables on the image, so the editor preview and the home page match exactly. Tapping one opens it full size.
- Pictures are managed in the members area page editor: choose a file, then drag or use sliders to position it, a slider to size it, and a shape (A4 portrait, square, landscape). The editor shrinks the file to 1600px and saves it as a JPEG, which also strips camera location data. Admins only (enforced by the database).
- Your first Sunday: the photo now takes exactly the height of the text beside it.
- Find a grave: one dark band over the churchyard photo, with a big search box into the Gravefindr directory, the churchyard map link and the Gravefindr credit.
- The age of the church: heading, a big counter and the history link. No paragraphs.
- Giving: heading, one line, the two buttons and the charity number. The Parish Giving Scheme line is gone (the scheme says the parish hasn't registered).
- Map: Google Maps loads straight away once a visitor agrees. A bar at the bottom of pages with a map asks, with equal "Allow Google Maps" and "No thanks" buttons. The answer stays in that browser; the privacy page has a button to change it. "Show the map" still loads it once.

## Tasks

- [x] H1 | Agent: Opus | Checks: qa, review
  Files: index.html, site.css
  Do: remove the welcome strip and the 10:30 band, with their styles and the next-service script.

- [x] H2 | Agent: Opus | Checks: qa, review, legal
  Files: index.html, site.css, live-content.js, members/api.js, members/app.js, members/members.css, supabase/migrations/20261118000000_notice_board_pictures.sql, supabase/README.md
  Do: notice board redesign and admin pictures, live and demo.

- [x] H3 | Agent: Opus | Checks: qa, review
  Files: index.html, site.css
  Do: Sunday photo height, Find a grave band, big counter, shorter giving. Styles for the removed story layout deleted.

- [x] H4 | Agent: Opus | Checks: qa, review, legal
  Files: buttons.js, site.css, privacy.html
  Do: cookie consent for the map, and the privacy page wording.

## Waiting on

- To go live, the members area needs the new migration applied (it also creates the notice-board storage bucket). Until the PCC switches the members area on, pictures only show in a local preview.
- The privacy page still names the Parish Giving Scheme for online giving, but the scheme's own site says the parish hasn't registered. The treasurer should check.

Carried over:
- Old pictures for Bygone days waiting on permission (aerials, the coloured procession, carnival, hunt meets, 1967 photos, modern photos, the pen drawing).
- Facts from Greg or the parish (service pattern, parking, fees, Messy Church and coffee morning times, the Parish Giving link).
