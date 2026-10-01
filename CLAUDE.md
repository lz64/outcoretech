# CLAUDE.md — outcoretech.com

Source for **https://outcoretech.com**, the marketing site for Outcore Tech, an engineering consultancy covering AI engineering, IoT prototyping, systems automation, and production process optimization.

The site is a single static page plus a 404 page: plain HTML, CSS, and one small progressive-enhancement JS file, with **no build step**.

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
- **Motion:**
  - Every auto-playing animation stops by itself within 5 s in total (WCAG 2.2.2) and never loops. The hero pulse plays twice (0.1 s + 2 × 2.4 s = 4.9 s). The logo plays once on load (0.25 s + 3.4 s = 3.65 s). `tests/hero.spec.js` and `tests/logo.spec.js` enforce the 5 s cap and the no-infinite rule.
  - `animation` declarations sit inside `@media (prefers-reduced-motion: no-preference)`, and the global `prefers-reduced-motion: reduce` kill-switch is a backstop. `tools/motion.test.mjs` parses `site.css` and checks this for the logo mark only (`mark-*` keyframes and `.mark` animation rules). `tests/hero.spec.js` checks that the hero pulse doesn't run under reduced motion.
  - The logo replays only on `.brand:hover` / `.brand:focus-visible`.
  - The logo mark appears **once per page**, because its SVG ids are document-global. The footer has none.
- **Contact form (Web3Forms):**
  - **Never automate a real submission.** Tests mock `https://api.web3forms.com/submit` with `page.route`.
  - The email input must be named exactly `email`, and there is no `replyto` field.
  - The no-JS `redirect` value must be exactly `https://outcoretech.com/#message-sent`; `check-config` rejects anything else.
  - The access key in `index.html` is public by design. `ACCESS_KEY` in `tests/helpers.js` must match it, so change both together.
- **Fonts:** exactly two preloads, Plex Sans variable and Plex Mono 400. IBM Plex Sans Hebrew is used only for the בס״ד line, is not preloaded, and is scoped with `unicode-range`.
- **בס״ד** appears at the top right of every page (`.bsd-bar`, `lang="he" dir="rtl"`). Keep it on any new page.

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
