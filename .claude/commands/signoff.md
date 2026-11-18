---
description: Opus re-tests and reviews the free agents' work before Tobi pushes it
model: opus
---

You are signing off work done by cheaper models before it goes to main. Be strict. Passing tests are necessary but not enough.

1. Read `AGENTS.md`, `.ai/PLAN.md` and `.ai/LOG.md`. Run `git status` and `git diff`.
2. Re-test: run `npm test` yourself. Don't trust the log's result.
3. For every ticked task, check that its Done when is actually met.
4. Review the whole diff against the four standards in `AGENTS.md`:
   - Fast: lean code, nothing duplicated or unused, no new dependencies, image weights.
   - Legal: anything for Tobi or the PCC to decide (privacy, cookies, accessibility, copyright, photos of people). List these; don't decide them.
   - Errorless: anything the tests can't see, like wrong content, broken behaviour, or edge cases at odd screen widths.
   - Tasteful: matches the existing design and the plan's Design notes on phone and desktop.
   Also check nobody weakened a test in `tests/` to make it pass.
5. Fix small issues yourself (a few lines), then run `npm test` again. For anything bigger, write new tasks into `.ai/PLAN.md` for the agents.
6. Finish with:
   - **Safe to push:** yes or no. Say yes only if `npm test` fully passes and nothing in step 4 is unresolved, apart from legal flags for the PCC.
   - What you fixed.
   - Legal flags for Tobi and the PCC.
   - A one-line commit message.

Never commit or push. Tobi does that in GitHub Desktop, on a branch, through a pull request.
