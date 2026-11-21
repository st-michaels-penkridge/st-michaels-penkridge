# Hand-off: St Michael's Penkridge website, 21 Nov 2026

Read `AGENTS.md` first. It covers the rules: fast, legal, errorless and tasteful, never invent church facts, and never commit or push without Tobi's say. This file covers where the work stands.

## Where things are

- Repo: github.com/st-michaels-penkridge/st-michaels-penkridge. The old 17acs/st-michaels-penkridge address redirects there.
- Live site: stmichaelspenkridge.co.uk, served by GitHub Pages from `main`.
- Branch `home-page-edits` (PR #7 into `main`). `main` is protected and needs a PR with the Tests check passing. On 21 Nov Tobi asked for PR #7 to go live.
- Commits on PR #7:
  - 18 Nov: home page edits (notice board pictures, Find a grave, big counter, map consent)
  - 19 Nov: home page refresh
  - 19 Nov: "Since 1226" and this file
  - 21 Nov: the 20-21 Nov redesign below, `main` merged in (Search Console tag and sitemap)
- Visual preview of the branch: https://claude.ai/artifact/1ckeZo3KYFhQMYFwo7V36m. This is a copy with preview-only tweaks: it shows made-up notices, and a note where the Gravefindr map would be. The repo is the source of truth, not the preview.

## Header, on every public page

- No header bar and no wordmark. Two things float over the page: the Menu corner in the top left and Donate in the top right.
- **Menu corner** (`.nav-toggle`, last blocks of `site.css`):
  - A clear glass triangle in the top left corner. Its long edge is smoothed into the top and left edges of the screen. It is drawn at true size (12.5rem, 10rem on phones) as an SVG.
  - The glass is on `.nav-toggle::before`, and the clip-path that limits clicks to the shape is on that layer too. Don't put a clip-path, filter or mask on the button itself: that stops the glass blurring.
  - `.masthead::before` draws a soft shadow just outside the curved edge, so the glass shows on white pages.
  - The lines and the word "Menu" each turn white over dark sections. `buttons.js` checks what is behind each one and adds `.on-dark`.
  - On hover the glass dilates by 10% on a spring.
  - Inner pages start lower (`main` padding-top, plus `.events-head`) so headings never sit under the glass.
- **Menu panel**: a white panel with nine links in three equal columns, two columns at 1099px and one at 760px.
  - It opens like an app on a Mac. The white layer (`.nav::before`) grows out of the corner on `--spring-pop`, a damped spring made with `linear()`. It overshoots about 10% and settles in 0.7s, and the links pop in once it has grown.
  - Closing (`.is-closing`, which `buttons.js` removes after 450ms) shrinks it back into the corner, and the glass corner springs into place.
  - Donate stays still in the top right corner the whole time.
- **Donate** buttons everywhere (`.btn-give`, nav Donate): burgundy with white lettering and the hand-and-heart mark, with a slight pull towards the cursor.
  - On phones the floating Donate is hidden while the menu is closed. Tobi was offered to change this.

## Home page now (index.html, top to bottom)

1. **Hero** (`.hero-altar`): stained glass, title and CofE mark. The address links to Google Maps directions.
   - After 5s with no scroll or touch, the page lifts 18vh and drops back on the same spring. That's the scroll hint: the `hint-down`/`hint-up` classes in `buttons.js`, with the CSS doing the moving. It waits until the finger on the first Sunday tab has finished.
2. **Counter** (`.age`, inline script near the end of index.html):
   - "Since 1226", then years, days, hours, minutes and seconds.
   - The first time it comes into view, each number races up from 0 in order, taking about 2s, then the clock ticks on with rolling digits.
   - Each number keeps its final width while counting.
3. **Life at St Michael's** (`.life`): seven full-width rows over the organ photo, in the style of Farm Africa's "What we do".
   - On hover a clear glass band rises from the bottom of the row. The small name fades and a larger one swings in from the left on a spring. The white arrow button turns black and swells.
   - The section fits on one laptop screen.
4. **Find a grave** (`.find-grave`): a black band under a 6px white line.
   - A slow, faded reel of churchyard photos, with a pause button.
   - A white search card that sends a GET to `gravefindr.co.uk/graveyards/st-michaels-penkridge?q=`.
5. **Give** (`.give`): a black box with the photo, heading, Give monthly and Give once buttons, and the charity number.
6. **Your first Sunday**: a glass bump on the right edge of the hero, its bottom level with the address. A finger taps three times on load.
   - It opens a panel that grows out of the tab on the same spring: mostly the nave photo, with the words on a white card. The rest of the page dims.
   - Escape, the cross or a click outside closes it.
7. **Visit**: compact, with the map behind cookie consent.

## Elsewhere

- **Cookie bar** (`buttons.js`): asks once on a first visit, with equal "Accept all" and "Reject all". The answer is kept in localStorage `smp-cookies` and can be changed on the privacy page. Google Maps only loads after "Accept all" or "Show the map".
- **Footer**: all photo credits are in the footer. The Gallery and History credits moved there.
- **Cache-busting**: `site.css` and `buttons.js` are on `?v=20261121` on the public pages. The members pages still use `20261118` and weren't touched. Bump the number whenever a file changes.
- From 19 Nov, unchanged: the Notices page, the Notices menu group, Bygone days past events (needs `supabase/migrations/20261119000000_bygone_notices.sql` run on the real project when members goes live), and members editor links.

## Testing

- `npm test` runs 38 checks: HTML validity, links, and every page at phone and desktop size (axe, page weight, no sideways scrolling). It must pass before pushing, and GitHub runs it again on the PR.
- Motion: everything respects `prefers-reduced-motion`. Menus open and close instantly, and there is no count-up and no scroll hint.
- `node --test supabase/tests/public-notices.test.cjs`: the test "empty and failed responses…" was already failing before 19 Nov. Fix it properly or leave it.
- Only Tobi changes `tests/site.config.mjs`.

## Open items for Tobi

1. **AGENTS.md exceptions.** Tobi asked for each of these, but they break written rules. Add them to AGENTS.md as exceptions or let Tobi decide:
   - glass (menu corner, first Sunday tab, Life rows)
   - spring and bounce motion
   - the auto-moving photo reel
   - the cookie bar and first Sunday pop-ups
2. **Give section**: Tobi wants to bring "the church column" into its design. Not started.
3. **Bygone days migration**: run it on the real Supabase project when the members area goes live.
4. **Legal flags:**
   - Kept notices stay public indefinitely.
   - Gravefindr is embedded on the churchyard page with no consent step. That's fine only if it sets no cookies.
   - The privacy page mentions the Parish Giving Scheme, but the parish isn't registered.
   - The donate page is waiting on the treasurer for the real giving details.
5. **Self-hosted fonts** (proposed, not done). This would remove the only call to Google before consent.
6. **"Since 1226"**: don't add "Consecrated" unless a source confirms the date.

## How Tobi works

- He gives feedback as comments on the preview and wants small, exact changes, one at a time. Check each at 1440 and 390 before sending.
- He likes Farm Africa's site, iOS/Mac glass and spring motion. He spots AI slop quickly: no all-caps labels above headings, no filler copy, no generic cards.
- Brand:
  - crimson/burgundy #7a2428, brass #e3c48e, black #111113
  - Cinzel headings, Source Sans 3 body text
- Replies to Tobi start with "TOBI". Keep them short, use plain "-" bullets, and no long dashes.
