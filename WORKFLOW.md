# St Michael's agent workflow

Opus 5.5 (Claude Code) plans, signs off and makes the design calls. Free models in OpenCode do the building. Every change is tested four times before it reaches main.

## Who does what

| Agent | Model | Job |
|---|---|---|
| Opus `/handoff` | Claude Opus 5.5 | Plans the work, makes design decisions, writes `.ai/PLAN.md` |
| `lead` | DeepSeek V4.1 Flash (free) | Runs the plan, hands out tasks, runs every check |
| `frontend` | DeepSeek V4.1 Flash (free) | HTML, CSS, small JavaScript |
| `content` | GLM-5.3 Flash (free) | Page text, alt text |
| `assets` | DeepSeek V4.1 Flash (free) | Image compression, file clean-up |
| `qa` | GLM-5.3 Flash (free) | Runs `npm test` across the whole site after every task |
| `reviewer` | GLM-5.3 Flash (free) | Code review: lean, on-design, does what the task asked |
| `compliance` | GLM-5.3 Flash (free) | Flags UK legal and accessibility risks for you and the PCC |
| Opus `/signoff` | Claude Opus 5.5 | Re-tests, reviews everything, says whether it's safe to push |

The reviewers run on a different model from the builders on purpose, so they're a real second opinion.

## The four test runs
1. After every task, `qa` runs the full suite, so a change on one page can't quietly break another.
2. When the plan is finished, `qa` runs it all again.
3. `/signoff` runs it again itself and reviews what tests can't see.
4. GitHub runs it again on the pull request. With main protected, nothing merges unless it's green.

`npm test` checks HTML validity, broken links and missing files, then loads every page on a phone and a desktop: JavaScript errors, alt text and sizes on images, sideways scrolling, page weight, serious accessibility problems (WCAG 2.2 AA), and checks members pages stay hidden from Google. Agents can't edit the tests.

## One-off setup
1. Check `node -v` works in a terminal. If not, install Node.js LTS from nodejs.org. The tests use Google Chrome, so that needs to be installed too.
2. Install OpenCode: `npm i -g opencode-ai`
3. Copy everything in this folder into the St Michael's repo folder (where `index.html` is). If the repo already has a `package.json`, don't overwrite it. Ask Claude to merge the two.
4. In a terminal in the repo, run `npm install`, then `npm test` to see where the site stands today.
5. Run `opencode models opencode --refresh` and check `deepseek-v4.1-flash-free` and `glm-5.3-flash-free` are listed. Free models come and go. If one disappears, change the `model:` line in `.opencode/agents/*.md` to another free one.
6. Protect main on GitHub: in the repo, open Settings, then Rules, then Rulesets, and make a new branch ruleset for `main`. Turn on "Require a pull request before merging" and "Require status checks to pass", and add the `test` check.
7. Commit all of this so Will has it too.

## Every job
1. **Plan:** in Claude Code, run `/handoff <what you want done>`. Read `.ai/PLAN.md` and answer anything under "Waiting on".
2. **Build:** in a terminal in the repo, run `opencode` and type `go`. Approve shell commands when it asks.
3. **Sign off:** back in Claude Code, run `/signoff`. Only carry on if it says "Safe to push: yes".
4. **Push:** in GitHub Desktop, create a new branch, commit, publish the branch, then Create Pull Request. Merge into main once the Tests check goes green.

## Good to know
- Free models are limited-time offers with daily limits, and their providers may use your prompts to improve the models. Never put passwords or keys in the repo.
- The `compliance` agent spots legal risks. It can't make anything legal. Flags go in `.ai/LOG.md` for you and the PCC to decide.
- On launch day, set `LAUNCHED = true` in `tests/site.config.mjs`. From then on the tests fail if any public page is hidden from Google.
