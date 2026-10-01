# CLAUDE.md — outcoretech.com

Source for **https://outcoretech.com**, the marketing site for Outcore Tech, an engineering consultancy covering AI engineering, IoT prototyping, systems automation, and production process optimization.

The site is a single static page plus a 404 page: plain HTML, CSS, and one small progressive-enhancement JS file (plus a one-line inline script in `<head>` for the motion state), with **no build step**.

- Design spec (binding): `docs/superpowers/specs/2026-09-28-outcore-tech-site-design.md`
- Implementation plan (completed): `docs/superpowers/plans/2026-09-28-outcore-tech-site.md`
- Project history, decisions, runbooks: `docs/PROJECT_HISTORY.md`. **Read this before changing DNS, the form, or the logo.**

## Layout

```
site/            ← the ONLY deployed folder (GitHub Pages via Actions)
  index.html     ← all page content (relative URLs only)
  404.html       ← not-found page (root-absolute URLs only)
  assets/css/site.css, nojs.css · assets/js/site.js · assets/fonts/ · assets/img/
tools/           ← dev-only Node tooling (+ node:test unit tests *.test.mjs)
tests/           ← Playwright + axe browser tests (*.spec.js)
.github/workflows/pages.yml ← validate → deploy site/ on push to main
docs/            ← spec, plan, project history
```

## Commands

Use Git Bash on Windows, and Node ≥ 24.8. The local machine runs Node 24.19 LTS.

```bash
npm install && npx playwright install chromium   # first time
npm run serve        # http://127.0.0.1:4173/ (GitHub-Pages-like: serves 404.html for missing paths)
npm run check        # unit tests + html-validate + contrast + link + form-config checks
npm test             # check + all Playwright tests (needs port 4173 free)
npm run check:live   # form config incl. "real Web3Forms key" guard (CI runs this)
npm run fonts        # re-copy self-hosted fonts from @fontsource packages
npm run images       # regenerate og-image.png, apple-touch-icon.png, favicon.ico from tools/brand/*.html
node tools/smoke.mjs https://outcoretech.com/ --check-404     # smoke-test a deployed URL (+ screenshots/)
node tools/lighthouse.mjs https://outcoretech.com/            # median of 3 runs; every category must be ≥ 95
node tools/dns.mjs snapshot dns-snapshots/<file>.json         # snapshot DNS from the authoritative nameservers
node tools/dns.mjs verify dns-snapshots/<file>.json           # web records must hold GitHub's values; every other queried record must be unchanged
```

## Rules the tests enforce (do not weaken a test to get past one)

- **Only `site/` is deployed.** Nothing in `site/` may reference `tools/`, `tests/`, `docs/`, or the repo root. This is a convention, not a test: `tools/check-links.mjs` would pass a `../` path that escapes `site/` if the file exists.
- **URLs:** `index.html` uses relative URLs for its own assets and anchors. The canonical, Open Graph and JSON-LD URLs are absolute (`https://outcoretech.com/…`) by design, and `tests/metadata.spec.js` pins them. `404.html` uses root-absolute URLs (`/assets/...`, `/#services`), because GitHub Pages serves it at any depth.
- **Colours come only from tokens.** The only hex values allowed in `site/assets/css/*.css` are in the two `:root` blocks of `site.css`, plus one `#000` mask alpha. A unit test checks every CSS file. `tools/check-contrast.mjs` enforces the WCAG contrast contract in light and dark.
- **Copy is owner-approved and pinned by tests.** When changing wording on purpose, update the matching test in `tests/`. The hero headline is also pinned in `tools/smoke.mjs` (`HEADLINE`) and in `tools/brand/og-image.html`; after changing it, run `npm run images`.
  - Straight apostrophes; literal `—`, `–`, `…`, `·`, `©`; `&amp;` in HTML.
  - Naming rule: "Production Process Optimization" in headings, the select, and the meta description; "Process Optimization" in the strip, tags, and title.
  - Never add unapproved claims. `tests/copy-guard.spec.js` lists forbidden phrases.
- **Motion** (spec §4.5). Two things move: the hero schematic's amber pulse and the logo's spectrum scan. `data-motion` on `<html>` selects one of three states, and their CSS rules are mutually exclusive:
  - **Absent (JS did not run): finite.** Everything stops by itself within 5 s (WCAG 2.2.2). The hero pulse plays twice (0.1 s + 2 × 2.4 s = 4.9 s). The logo plays once on load (0.25 s + 3.4 s = 3.65 s) and replays only on `.brand:hover` / `.brand:focus-visible`. The pause button stays `hidden`. These rules are scoped to `:root:not([data-motion])`.
  - **`loop` (set by `site.js`): both pulses loop forever**, with a rest between passes (logo 6.5 s cycle, hero pulse 3.2 s cycle). Motion that auto-plays for more than 5 s needs a pause mechanism, so `site.js` sets `loop` only when the `.motion-toggle` button is on the page, and reveals it. Never add looping motion that this button doesn't stop.
  - **`paused` (the visitor's choice): `animation: none`.** Both show their rest state, and there is no hover replay. The button reads "Play motion".
  - **The pause control** is the quiet "Pause motion" / "Play motion" text button at the far left of the top bar (`.bsd-bar`), on every page, with identical markup. Its name is its label text, and it has no `aria-pressed`. It is as tall as the bar (about 27 px) and at least 44 px wide: the one recorded exception to the 44 px tap-target rule (spec §4.4).
  - **The choice persists** in `localStorage` key `motion` (`paused` / `loop`). A one-line inline script in `<head>`, right after the stylesheet links, applies a stored `paused` before first paint. It never sets `loop`. Storage access is wrapped in try/catch in both places.
  - **Reduced motion:** every animation rule and keyframe sits inside `@media (prefers-reduced-motion: no-preference)`, the button is `display: none` under `reduce`, and the global `reduce` kill-switch is a backstop. Nothing moves in any state.
  - **The loop keyframes** (`mark-*-loop`) are the scan keyframes with their percentages × 3.4 / 6.5, then a rest, then an ease back to the start state. After changing a scan keyframe, recompute its loop twin. The hero loop rests at dash offset -101, not -100, where the round cap would paint a dot.
  - **Handover invariant:** each loop timeline starts with its finite timeline (the same stops at the same times, with the same easing), then rests. `site.js` carries the animation clock over at page load, so the loop continues where the one-time animation was and nothing restarts when the script arrives late. "Play motion" starts fresh. `site.js` reads every duration and delay from the CSS; don't repeat them in JS. The carry-over is wrapped in try/catch and must stay that way: if it throws, the loops start fresh and the rest of `site.js` (the pause button, the nav, the form) still runs. `tools/motion.test.mjs` checks the keyframes, timing functions and durations stay aligned.
  - **What the tests enforce:**
    - `tools/motion.test.mjs` parses `site.css`: every `mark-*` / `sch-pulse*` keyframe and animation rule is inside the no-preference guard; each rule is scoped to exactly one state; finite rules end within 5 s; `infinite` appears only under `loop`; no `forwards` fill; the loop keyframes match the rescaled scan; the handover invariant holds for the logo and the hero pulse (stops, times, easing and per-stop timing functions; only the `step-end` stop that holds the end state is exempt); each hover replay (`mark-*-r`) has the duration, easing and keyframes of its load run; the beam and the trace head stay in step. It also pins the bar markup and the inline script in both pages.
    - `tests/motion.spec.js` covers the button: position, name, size, keyboard, pause and resume, persistence across reloads and pages (including that the inline script works before `site.js`), reduced motion, no JS, and `localStorage` throwing.
    - `tests/motion-handover.spec.js` holds `site.js` back and covers the handover: mid-scan, after the scan, during a hover replay and after one that ended before the load run, in each pass of the hero pulse and after both, the exact clock mapping, "Play motion" starting fresh, reduced motion or a stored `paused` (nothing to carry, no errors), and a carry-over that throws (`getAnimations` or the `currentTime` setter): the loop starts fresh, and the pause button and the mobile menu still work.
    - `tests/hero.spec.js` and `tests/logo.spec.js` cover the finite motion with JS disabled (5 s cap, no `infinite`, rest state, hover/focus replay) and the loops with JS (infinite, seamless loop point, rest equals the static mark, the pulse paints nothing between passes).
    - `tests/layout-a11y.spec.js` runs axe in the `loop` and `paused` states.
  - The logo mark appears **once per page**, because its SVG ids are document-global. The footer has none.
- **Contact form (Web3Forms):**
  - **Never automate a real submission.** Tests mock `https://api.web3forms.com/submit` with `page.route`.
  - The email input must be named exactly `email`, and there is no `replyto` field.
  - The no-JS `redirect` value must be exactly `https://outcoretech.com/#message-sent`; `check-config` rejects anything else.
  - The access key in `index.html` is public by design. `ACCESS_KEY` in `tests/helpers.js` must match it, so change both together.
- **Fonts:** exactly two preloads, Plex Sans variable and Plex Mono 400. IBM Plex Sans Hebrew is used only for the בס״ד line, is not preloaded, and is scoped with `unicode-range`.
- **בס״ד** appears at the top right of every page (`.bsd-bar`, `lang="he" dir="rtl"`), opposite the "Pause motion" button. Keep the whole bar, and the inline motion script in `<head>`, on any new page.

## Git and deploy

- Commit with the **repo-local** identity, which is already configured as the lz64 GitHub no-reply address. Use only the `lz64` GitHub account and its no-reply address for this repo; never commit or push with any other account or email.
- Credentials are repo-local (`credential.https://github.com.helper = !gh auth git-credential`). Don't run the global `gh auth setup-git`.
- **Pushing `main` deploys to production.** There is no staging, so run `npm test` and preview with `npm run serve` before pushing.
- After pushing, watch the run for the pushed commit: `gh run watch $(gh run list --workflow pages.yml --commit $(git rev-parse HEAD) --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`. If the run isn't listed yet, retry after a few seconds.

## DNS and mail (GoDaddy DNS, Zoho mail): careful

- **Web records:**
  - apex A: `185.199.108–111.153`
  - apex AAAA: `2606:50c0:8000–8003::153`
  - `www` CNAME: `lz64.github.io`
  - TXT `_github-pages-challenge-lz64`: **keep forever**
- **Never touch the mail records:**
  - 3 Zoho MX records
  - SPF TXT at `@`
  - `dc-…._spfm` TXT
  - `zmail._domainkey` DKIM TXT
  - `_domainconnect` CNAME (GoDaddy Domain Connect, not mail, but leave it alone too)
- **Before any DNS change:** snapshot with `tools/dns.mjs`. Afterwards, run `verify` against it. `dns-snapshots/` is git-ignored and local-only.
- If the HTTPS certificate is stuck (`https_certificate.state` stays `null`), re-save the domain. See `docs/PROJECT_HISTORY.md` § Runbooks.

## Windows and environment quirks

- **Port 4173:** Playwright starts its own server (`reuseExistingServer: false`), so the port must be free. A stray `node tools/serve.mjs` must be stopped with `taskkill`. `kill $!` in Git Bash does not reliably free the port.
- **Memory:** many stray `node.exe` processes from other sessions can starve memory, and Chromium/Node then crash mid-suite. If the suite fails with "out of memory" or "Target crashed", free memory or use `npx playwright test --workers=2`.
- **Lighthouse:** chrome-launcher may print `warning: Chrome cleanup failed (EPERM)` on Windows. It is harmless, and `tools/lighthouse.mjs` continues.
- **Node file watchers** can crash on Windows 8.3 short paths (segments like `ABCDEF~1`); use the long path.
