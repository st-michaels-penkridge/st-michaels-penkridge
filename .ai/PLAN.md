# Plan

**Goal:** Remove the six dead files from the clean-up log, and shrink the large photos where it can be done without them looking worse.

## Design notes

Nothing on the site should look different after this plan.

Why only two photos are being compressed (measured 17 Nov): every page already serves WebP. Phones download between 8KB and 880KB of images per page. The only files over 250KB are the large 1280px versions, which open in the gallery lightbox and are used for the hero photos on desktop. Rebuilding them from the originals makes two of them 25-35% smaller. Every other one would come out the same size or bigger unless it was visibly softened, so those stay as they are. The ~57MB of original and unused photos in `images/` are never sent to visitors, so they don't slow the site (see Waiting on).

## Tasks

- [x] T1 | Agent: assets | Checks: qa, review
  Files: styles.css, home-v1.css, home-v2.css, chosen-type.css, nav.css, members/members.css
  Do: First run `git grep -n -e "styles.css" -e "home-v1.css" -e "home-v2.css" -e "chosen-type.css" -e "nav.css" -- "*.html" "*.js"`. It must print nothing, because no page or script loads these files (site.css replaced all five on 5 Nov). If it prints anything, stop and report it. Otherwise run `git rm styles.css home-v1.css home-v2.css chosen-type.css nav.css`. Then, on line 1 of `members/members.css`, change `Builds on ../styles.css` to `Builds on ../site.css`. Leave the comment on line 1 of site.css alone, because it records where site.css came from.
  Done when: the five files are deleted, the members.css comment says `../site.css`, and `npm test` passes with every page unchanged.

- [x] T2 | Agent: content | Checks: qa, review
  Files: README.md
  Do: On line 7, change ``shared by all 14 public and members pages through `chosen-type.css`.`` to ``shared by all 14 public and members pages through `site.css`.`` On line 19, change ``Home-specific styling is in `home-v1.css`.`` to ``Home-specific styling is now in `site.css`.`` Change nothing else.
  Done when: README.md no longer names any of the five deleted CSS files, and the diff is those two lines.

- [x] T3 | Agent: assets | Checks: qa, review
  Files: scripts/gallery-tags.py
  Do: Run `git grep -n "gallery-tags"`. The only match should be in `.claude/debt-log.md`. If anything else mentions it (a .bat, .ps1, .py or .md file), stop and report it. Otherwise run `git rm scripts/gallery-tags.py`. Keep `scripts/gallery_tags.py` (with the underscore), because that's the one the other scripts import.
  Done when: scripts/gallery-tags.py is deleted and scripts/gallery_tags.py is untouched.

- [!] BLOCKED T4 | Agent: assets | Checks: qa, review
  Files: images/opt/7cc8b9568f0a-1600.webp, images/opt/f4caec345099-1600.webp
  Do: From the repo folder, run `npm install --no-save sharp`, then `node .ai/tools/compress-webp.mjs`. Don't edit the script. It rebuilds each large photo over 250KB from its original JPG at the same pixel size, and only keeps the new file if it's at least 20% smaller. Expected output: `SHRUNK` for 7cc8b9568f0a-1600.webp (303KB to about 227KB) and f4caec345099-1600.webp (256KB to about 167KB), `kept` for the other 14, and `2 replaced` at the end. If the output is different, report it word for word.
  Done when: `git status` shows only those two .webp files changed (package.json and package-lock.json untouched), both keep their names and pixel sizes (1443x1114 and 1440x960), and `npm test` passes.
  Blocked: the script stops with `Error: UNKNOWN: unknown error, open` / `errno -4094` at `writeFileSync` on 7cc8b9568f0a-1600.webp, after 8 `kept` lines. Both target files have the OneDrive `ReparsePoint` attribute (Files On-Demand placeholders). Tried twice; no image, package.json or package-lock.json changed, images/opt clean in git. Needs Tobi to pin/download them locally, then re-run the two commands.

- [ ] T5 | Agent: assets | Checks: qa, review
  Files: .claude/debt-log.md
  Do: Replace the file's two lines (both dated 2026-11-11) with this one line:
  `2026-11-17 | resolved: the five superseded CSS files and scripts/gallery-tags.py | deleted in the clean-up plan (T1, T3) | nothing left open`
  Done when: debt-log.md is that one line.

## Waiting on

Decisions for Tobi (and Will):
- `images/` holds about 57MB that visitors never download: the original JPGs the WebP versions were made from, plus photos nothing uses (including the QR code PNGs and the frame-*.webp files). They only make the repo heavier. Keep them, or plan a careful delete job? Some of them are needed to rebuild the WebP versions.
- The desktop hero photos on the home page and Sundays page are about 480KB each. A desktop-only wide crop would cut that by more than half, but it's a design change. Do you want it?

Facts from Greg or the parish, carried over (24 TODOs across the site). Don't guess any of them:
- The church address and postcode (on most pages)
- Service pattern and finish time (index.html, sundays.html)
- The parish's own Parish Giving link, from the treasurer (donate.html)
- Parking and step-free access details (index.html, visit.html)
- Details, fees and how to book baptisms, weddings and funerals, plus the Rector's name and number (life-events.html)
- Days and times for Messy Church and coffee mornings (events.html)
