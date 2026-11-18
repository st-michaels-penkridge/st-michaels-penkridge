# Plan

**Goal:** The site changes on its own for the church seasons the parish asked for (Advent, Christmas, Easter, Pentecost), and a new Bygone days page shows the parish's old pictures.

## Design notes

The site takes on the season's colour the way the altar frontal does, and the home page hero gets one quiet line for the season. Nothing else moves.

- Season is worked out from the visitor's date in `buttons.js` (already on every page), which sets `data-season` on `<html>`. Advent: Advent Sunday to 23 Dec. Christmas: 24 Dec to 6 Jan. Easter: Easter Day to the day before Pentecost. Pentecost: its own week. Outside those, nothing changes.
- Colours swap through the existing `--crimson`, `--crimson-deep` and `--red` variables, plus a new `--band` for the two home bands (times band and giving) that were hard-coded `#6c272c`.
  - Advent: violet `#4f2d5c`, bands `#45274f`.
  - Christmas: crimson stays, bands go evergreen `#1f3d2b`.
  - Easter: gold `#7a5518`, bands warm dark `#2a221d`.
  - Pentecost: red is already the site's colour, so only the hero line changes.
  All pass 4.5:1 on white and on the cream paper.
- Hero line: `.season-note` under the tagline, one per season in the HTML, shown by CSS when `data-season` matches. Brass line icon (same 24px, 1.4 stroke family as the welcome links), white Source Sans text, thin underline, links to What's on.
- Preview any season by adding `?season=advent` (christmas, easter, pentecost, none) to a page address. Only lasts for that page.

### Bygone days

- New page `bygone.html`, in the About us menu under History ("Bygone days", small line "Old postcards and photographs"). The church liked "Bygone days" as the name.
- Built from existing pieces only: `.page-head`, `.reel` and `.reel-head` (as on the History page photo strips), `.gallery-item` figures, and the History page's thin black frame with a pale mount. The only new CSS is `.album`: three columns that drop to one on a phone, so every picture keeps its own shape.
- 24 pictures from Andy's "Old Church Pics" deck, in four groups: old postcards, inside, engravings, Penkridge around the church. Captions use only what is printed on the card, the year on Andy's slide, or the history booklet. WebP, 800px wide at most, all under 160KB; everything after the first three loads lazily.

## Tasks

- [x] S1 | Agent: Opus (built directly) | Checks: qa, review
  Files: buttons.js
  Do: season logic at the top of buttons.js; sets `data-season` on `<html>`.
  Done when: checked against Advent and Easter dates for 2022 and 2024-2028, and the preview parameter works.

- [x] S2 | Agent: Opus | Checks: qa, review, legal
  Files: site.css
  Do: `--band` in `:root`, the two home bands use it, season colour block and `.season-note` styles at the end of site.css.
  Done when: every season passes axe (WCAG 2.2 AA) on 12 pages at desktop, no sideways scroll at 375px.

- [x] S3 | Agent: Opus | Checks: qa, review, legal
  Files: index.html
  Do: four `.season-note` lines after `.hero-tagline`.
  Done when: hidden outside the seasons, one line shows in each season.

- [x] S4 | Agent: Opus | Checks: qa
  Files: every page
  Do: cache versions bumped to `?v=20261118` for site.css and buttons.js.

- [x] B1 | Agent: Opus | Checks: qa, review, legal
  Files: images/bygone/*.webp, bygone.html
  Do: 24 old pictures cropped, trimmed and saved as WebP; the page.
  Done when: npm test passes with the new page on phone and desktop.

- [x] B2 | Agent: Opus | Checks: qa, review
  Files: site.css
  Do: `.album` columns; the History frame rule also covers `.album img`.

- [x] B3 | Agent: Opus | Checks: qa
  Files: every page, gallery.html
  Do: Bygone days added to the About us menu everywhere; a link to it under Photographs on the History page.

## Waiting on

Old pictures left out until Andy or the PCC can say we may use them:
- The 1930 aerial views carry the Aerofilms mark (Historic England's Britain from Above collection), so they need Historic England's permission.
- The procession with the church banner is a coloured copy taken from a website. The original black and white print would be fine.
- The carnival parade, the hunt meets outside the church and the 1967 pictures show people who may still be alive, so the PCC should decide.
- Modern photos (snow, sunsets, the market) and the signed pen drawing of the church: we need the photographers' or artist's permission.
- The engraving with the Alamy watermark and the Facebook screenshot can't be used.

Decisions for Tobi (and Will):
- Lent and Holy Week (violet, then red) weren't asked for. Easy to add the same way if the parish wants them.
- The seasonal greetings in the hero are generic. Greg may want his own wording.

From Andy (in Tobi's Outlook):
- Old Church Pics.pptx and Old Church Pictures.docx, for the Bygone days page.
- History booklet PDF, mini history leaflet, Greg's self-guided tour leaflet and the 800th PowerPoint, for the history section.
- The church logo (not found in the emails so far).

Carried over from the clean-up plan:
- `images/` holds about 57MB visitors never download. Keep, or plan a careful delete job?
- Desktop hero photos on Home and Sundays are about 480KB each. Want a desktop-only wide crop?

Facts from Greg or the parish (24 TODOs across the site). Don't guess any of them:
- The church address and postcode (on most pages)
- Service pattern and finish time (index.html, sundays.html)
- The parish's own Parish Giving link, from the treasurer (donate.html)
- Parking and step-free access details (index.html, visit.html)
- Details, fees and how to book baptisms, weddings and funerals, plus the Rector's name and number (life-events.html)
- Days and times for Messy Church and coffee mornings (events.html)
