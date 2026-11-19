# St Michael's Penkridge website - rules for every agent

This is the static website for St Michael's Church, Penkridge: plain HTML, CSS and JavaScript, no build step. Tobi and Will look after it. Every agent working in this repo follows these rules.

## The site
- The churchyard page loads the gravefindr widget from gravefindr.co.uk. Do not rebuild or restyle it.
- `members/` stays in demo mode until the PCC approves it. Do not touch its config or any Supabase settings unless the task says so.
- Pages in `members/` always keep their `noindex` tag. Never add or remove `noindex` on public pages unless the plan says so.
- Do not change `CNAME`. Do not break the existing QR welcome popup.

## The four standards - every change meets all four

### 1. Fast
- Plain HTML/CSS/JS only. No frameworks, libraries, build steps or new dependencies.
- Write the least code that does the job cleanly. Readable beats clever: no golfed one-liners.
- Reuse existing classes, components and CSS variables before adding new ones. Delete any code you replace. No duplicate rules, unused selectors or inline styles.
- JavaScript only when HTML/CSS can't do it. Scripts load with `defer`. No JS for layout.
- Images: photos under 250KB, `width` and `height` set, `loading="lazy"` on anything below the first screen.
- No new web fonts, third-party scripts or embeds unless the plan says so.

### 2. Legal (UK)
Agents flag legal issues. They never decide them. Tobi and the PCC sign off.
- Personal data: any form, sign-up or members feature must link to the privacy notice. Never add new data collection unless the plan says so.
- Cookies: anything that sets non-essential cookies or loads third-party embeds (maps, video, analytics, social widgets) gets flagged for cookie consent. Never add trackers.
- Accessibility (WCAG 2.2 AA): headings in order, a label on every input, visible focus states, text contrast of at least 4.5:1, everything usable by keyboard, meaningful alt text.
- Copyright: only use images and text the church owns or has permission for. Keep existing photo credits and licence notes (e.g. CC BY) intact.
- Photos of children or identifiable people: never add new ones unless the plan says consent is confirmed.

### 3. Errorless
- Valid HTML, no broken internal links, no console errors, no missing files.
- Works at 375px (phone) and desktop widths.
- `npm test` re-tests the whole site: HTML validity, links, and every page on a phone and a desktop (errors, missing files, images, accessibility, page weight, members pages hidden from Google). No task is ticked until it passes, and nothing reaches main unless the same tests pass again on GitHub.
- Never weaken, skip or delete a test to make it pass. Only Tobi changes `tests/site.config.mjs`.

### 4. Tasteful
- Match the existing design: same type scale, spacing, colours, buttons and components. The design notes in `.ai/PLAN.md` (written by Opus) take priority.
- Calm and dignified for a parish audience: generous whitespace, clear hierarchy, comfortable line lengths (about 60-75 characters).
- No gradients, glassmorphism, emoji icons, stock "AI" styling, auto-playing media or new pop-ups.
- Anything new should look like it was always part of the site.

## Facts about the church
- Never invent facts: addresses, postcodes, service times, fees, names, phone numbers, emails, giving links.
- If a fact is missing, leave the existing placeholder or add `<!-- TODO: what is needed -->` and mention it in your report.
- UK English in all site text.

## Working rules
- Do only the task you were given. No extra "improvements".
- Never commit, push or change git history. Tobi commits through GitHub Desktop.
- Never read or print `.env` files, keys or passwords.
- When you finish, report: files changed, what you did in one line each, anything you were unsure about.

## Workflow files
- `.ai/HANDOFF.md` - where the work stands (19 Nov 2026): branch, what changed, open items. Read it first.
- `.ai/PLAN.md` - the current plan, written by Opus in Claude Code (`/handoff`).
- `.ai/LOG.md` - one line per finished task, plus questions and legal flags for Tobi.
- `.claude/debt-log.md` - existing clean-up notes, if present.
