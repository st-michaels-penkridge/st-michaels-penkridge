# Hand-off: St Michael's Penkridge website, 19 Nov 2026

Read `AGENTS.md` first. It covers the rules: fast, legal, errorless and tasteful, never invent church facts, and never commit or push without Tobi's say. This file covers where the work stands.

## Where things are

- Repo: github.com/st-michaels-penkridge/st-michaels-penkridge. The old 17acs/st-michaels-penkridge address redirects there.
- Live site: stmichaelspenkridge.co.uk, served by GitHub Pages from `main`.
- Work in progress: branch `home-page-edits` (PR #7 into `main`). It is not merged. `main` is protected and needs a PR with the Tests check passing.
- Commits on PR #7:
  - 18 Nov: home page edits (notice board pictures, Find a grave, big counter, map consent)
  - 19 Nov: home page refresh
  - 19 Nov: "Since 1226" and this file
- Pull `home-page-edits` before changing anything.
- Visual preview of the branch: https://claude.ai/artifact/1ckeZo3KYFhQMYFwo7V36m. This is a copy with preview-only tweaks: it shows made-up notices, and a note where the Gravefindr map would be. The repo is the source of truth, not the preview.

## Home page now (index.html, top to bottom)

1. **Hero** (`.hero-altar`): stained glass, title and CofE mark. The address under it (`.hero-address`) links to Google Maps directions.
2. **Counter** (`.age`):
   - "Since 1226" in black text on white, with a 3px brass strip top and bottom (`border-block`), and tight padding.
   - The digits roll down when they change. The code is the inline script near the end of index.html (`show()` and `digit()`). The CSS is `.counter .digit` and `.roll` with `@keyframes roll-down`. Each digit has a fixed width of .6em so nothing shifts.
3. **Life at St Michael's** (`.life`, `.life-rows`):
   - White rows over the organ photo: Notices, Sunday services, Messy Church, Coffee mornings, Baptisms, Weddings, Funerals.
   - On hover, a frosted glass pane glides to the row, a soft light follows the mouse, the arrow circle leans towards the cursor and the other rows dim.
   - The JavaScript is in `buttons.js` (the `.life-rows` block). The mouse effects are off for touch screens and for people who turn motion off.
4. **Find a grave** (`.find-grave`):
   - White with brass strips: heading, one line, and a rounded search bar with a dark icon button (`.grave-search`).
   - The search sends a GET to `gravefindr.co.uk/graveyards/st-michaels-penkridge?q=`.
   - Example surnames roll through the empty field every 1.56s (`.grave-hint`, a block in buttons.js).
   - The Gravefindr widget is deliberately not on the home page. Tobi didn't like it there.
5. **Give** (`.give`, `.give-box`): one centred box on white with six stacked shadows. It holds the photo, the heading, the Give monthly and Give once buttons, and the charity number.
6. **Your first Sunday**.
7. **Visit**.

## Elsewhere on the branch

- **Notices page** (`notices.html`):
  - The notice board moved here from the home page. Notices are smaller rows, centred.
  - Live notices and pinned pictures come from the members area through `live-content.js`.
- **Menu**: there's a new "Notices" group (Notices, then Bygone days) between Worship and About us on every public page.
- **Bygone days**:
  - A "Past events" section lists notices with `keep = true` once their `show_until` date has passed.
  - The database change is in `supabase/migrations/20261119000000_bygone_notices.sql`. It adds the `keep` column, a check that kept notices have a last day, and a public read rule.
  - The members editor has a new tick box, "Keep it in Bygone days after its last day".
  - There are 2 new tests in `supabase/tests/public-notices.test.cjs`.
- **Map consent**: the Google map cookie bar no longer pops up when a page loads. "Show the map" loads the map once. The privacy page button still lets people allow it permanently.
- **Members editor**: its links now point to `notices.html`.
- **Cache-busting**: the `?v=` on `site.css`, `buttons.js`, `live-content.js`, `members/api.js` and `members/app.js` is now `20261119`. Bump it again whenever one of those files changes.

## Testing

- `npm test` runs 38 checks: HTML validity, links, and every page at phone and desktop size (axe, page weight, no sideways scrolling). It must pass before pushing, and GitHub runs it again on the PR.
- `node --test supabase/tests/public-notices.test.cjs` gives 5 passes and 1 failure. The failing test, "empty and failed responses…", was already failing before 19 Nov. Don't weaken it: fix it properly or leave it for Tobi.
- Only Tobi changes `tests/site.config.mjs`.

## Open items for Tobi

1. **Merge PR #7.** Do it once the GitHub checks are green, and only when Tobi says so. Will also works on the repo.
2. **Give section.** Tobi wants to bring "the church column" into its design. This hasn't started yet, so ask him what he means.
3. **Glass effect.** `AGENTS.md` bans glassmorphism and gradients, but the Life rows use frosted glass and a radial light because Tobi asked for them. Either record that as an exception in AGENTS.md or let Tobi decide.
4. **Bygone days migration.** It must be run on the real Supabase project when the members area goes live, after the 20261021 and 20261118 migrations. The members area is still in demo mode.
5. **Legal flags:**
   - Kept notices stay public indefinitely, so the office should only keep ones that name people if the family are happy.
   - The churchyard page embeds Gravefindr with no consent step. That's fine as long as Gravefindr sets no cookies.
   - The privacy page mentions the Parish Giving Scheme, but the parish isn't registered with it.
   - The donate page is still waiting on the treasurer for the real giving details.
6. **Self-hosted fonts (proposed, not done).** Serve Cinzel and Source Sans 3 from the site instead of Google Fonts. That removes the only call to Google before consent, and it's slightly faster. Tobi leaned yes but hasn't confirmed.
7. **"Since 1226".** Don't add "Consecrated" unless Greg or Andy's booklet confirms a consecration date. The site says the present church was begun in 1226.

## How Tobi works

- He makes one change at a time to the existing design. Show before and after screenshots side by side, at desktop (1440) and phone (390) size, and keep a change only if he says it's better. Don't redesign from scratch: he rejected full Farm Africa-style rebuilds.
- He gives feedback as short comments and wants small, exact changes.
- He spots AI slop quickly. Avoid:
  - small all-caps labels above headings
  - generic centred sign-up cards
  - fake or stretched screenshots standing in for real features
  - filler copy
- Brand:
  - crimson #7a2428, brass #e3c48e (the CofE logo), black #111113
  - Cinzel headings, Source Sans 3 body text
  - thin 3px brass strips on white bands
- Replies to Tobi start with "TOBI". Keep them short, use plain "-" bullets, and no long dashes.
