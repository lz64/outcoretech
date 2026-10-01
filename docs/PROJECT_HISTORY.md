# Project history: outcoretech.com

A durable record of how this site was designed, built, and launched (2026-09-28 to 2026-09-30): what the owner decided, the rulings made along the way, the defects caught, the launch results, and how to operate the site now.

Ari Friedman (the owner) made every product decision. Claude Code did the design, build, and verification work with him.

- Binding spec: `docs/superpowers/specs/2026-09-28-outcore-tech-site-design.md`
- Plan: `docs/superpowers/plans/2026-09-28-outcore-tech-site.md`
- Agent working rules: `CLAUDE.md`

---

## 1. Outcome

- **Live:** https://outcoretech.com (GitHub Pages, public repo `lz64/outcoretech`). `www`, `http://`, and the old preview URL `https://lz64.github.io/outcoretech/` all 301 to `https://outcoretech.com/`.
- **HTTPS:** Let's Encrypt certificate covering apex + `www`, auto-renewed by GitHub, HTTPS enforced.
- **Production Lighthouse (mobile, median of 3):** Performance 98, Accessibility 100, Best Practices 100, SEO 100.
- **Tests at launch:** 50 unit tests (node:test) and 131 browser tests (Playwright + axe). CI runs all of them before every deploy.
- **Mail (Zoho):** proven unaffected by the cutover. Every MX/SPF/DKIM record was byte-identical before and after, checked against the authoritative nameservers.
- **Contact form:** Web3Forms, delivering to contact@outcoretech.com. The owner tested it with JavaScript on and off, and Reply goes to the visitor.
- **All six spec success criteria met** (spec §1).

## 2. Timeline

| When | What |
|---|---|
| 2026-09-28 | Brainstorm, then the design spec. An adversarial 4-reviewer fact-check (GitHub Pages, Web3Forms, copy fidelity, completeness) fixed 30+ issues before any code. |
| 2026-09-28 | 15-task implementation plan with complete code. A **dry run** executed Tasks 1–13 in a scratch copy; its 12 findings and a design review were folded into the plan. |
| 2026-09-29 | Node upgraded to 24.19 LTS. Built on `main` with subagent-driven development: one implementer and one independent reviewer per task, then a whole-branch final review on the most capable model, then one fix wave. |
| 2026-09-29 | **Stage 1:** public repo created and preview deployed. The owner approved the copy, tested the form, set Web3Forms retention to 30 days, and allow-listed the sender in Zoho. |
| 2026-09-29 | **Redesign:** new logo mark (a 6-concept design panel with 3 judges, then a hybrid round), plus בס״ד at the top right of every page. |
| 2026-09-30 | **Stage 2:** GitHub domain verification, GoDaddy DNS cutover, HTTPS certificate (needed a re-trigger), HTTPS enforced, the form redirect switched to the domain, production verification. Live. |
| 2026-09-30 | **After launch:** the logo and hero pulses play continuously, with a "Pause motion" control in the top bar (§3). |

## 3. Owner decisions (the "why" behind the site)

- **Purpose:** win consulting work. **Audience:** industrial/operations buyers *and* product companies or startups, weighted equally.
- **Hosting:** GitHub Pages under the `lz64` account, in a public repo. Commits use only the `lz64` GitHub no-reply identity.
- **Domain:** outcoretech.com (GoDaddy DNS). Email stays on Zoho.
- **Contact:** a form that delivers to email (Web3Forms), not a booking link or a bare email address. The address appears only in the form's failure message.
- **Visual direction: "Control Room".** Graphite and warm paper themes, one safety-amber signal colour, IBM Plex Sans and Plex Mono, mono uppercase labels, a schematic motif, automatic light/dark.
- **Copy:** only claims the owner made or confirmed. No invented clients, metrics, or testimonials.
  - AI scope (confirmed): LLM apps and agents, ML on operational and sensor data, and computer vision, including event detection on live video.
  - Process claims (confirmed): fast prototyping, handover documentation, ongoing support. **Security hardening is not claimed.**
  - The hero keeps "the plant floor" (the owner's choice).
  - Interface microcopy approved (spec §3.12).
  - A one-line privacy note sits under the form.
- **Name:** "Outcore" comes from "outcorrect", meaning *past correct*.
- **Logo:** "Pure Scope".
  - The shape: a signal line that runs flat, dips, then rises into a check and ends in an amber node.
  - The motion at launch: a spectrum scan beam writes it once on load (3.65 s) and replays on hover or focus. There is no motion under reduced motion. Since 2026-09-30 it loops (see "Continuous pulses" below).
  - Chosen from a design panel: hybrid of concept B2's scope line and scan beam with B3's amber node, without B2's box.
  - The spectrum pulse was the owner's request.
- **בס״ד** sits at the top right of every page, in IBM Plex Sans Hebrew (self-hosted, 5.5 KB).
- **No social media links** (owner's choice). The Open Graph tags stay because messaging and email apps use them for link previews.
- **Continuous pulses with a pause control (2026-09-30, after launch).**
  - The owner asked for the pulse to play continuously. Both pulses now loop: the hero schematic's amber pulse (3.2 s cycle) and the logo's spectrum scan (6.5 s cycle), each with a short rest between passes "so it pulses rather than buzzes".
  - One shared button controls both: a quiet text button, "Pause motion" / "Play motion", at the far left of the thin top bar, opposite בס״ד, on every page. It remembers the visitor's choice, and the motion stays still for anyone whose device asks for reduced motion.
  - Why the control exists: WCAG 2.2 SC 2.2.2 requires a way to pause motion that starts automatically and lasts more than 5 seconds. The launch design avoided the need by capping motion at 5 s; looping makes the control mandatory.
  - Without JavaScript the button can't work, so it stays hidden and the motion keeps the finite launch behaviour (logo once, hero pulse twice).
  - The button is about 27 px tall, as tall as the bar: a recorded exception to the site's 44 px tap-target rule (spec §4.4) that still meets WCAG 2.5.8's 24 px.

## 4. How the work was done

1. **Brainstorming:** one question at a time, then a written spec.
2. **Adversarial spec review:** four independent reviewers, each finding challenged by a skeptic. Surviving findings were fixed before planning.
3. **Writing the plan:** complete code for every step, TDD, exact expected outputs.
4. **Dry run:** a full scratch execution of Tasks 1–13 found three tests that could never pass as written, a CSS specificity bug, and more. All were fixed in the plan before the real build.
5. **Subagent-driven development:**
   - A fresh implementer per task (a smaller model for transcription tasks, a standard model for integration).
   - A fresh reviewer per task covering spec compliance and quality.
   - Fix rounds when needed. Every decision was recorded in a ledger.
6. **Final whole-branch review** on the most capable model. It found 2 Important issues (cached-DNS verification, enlarged-text overflow), fixed in one wave plus a scoped re-review.
7. **Live stages** (repo creation, DNS, certificate) were run by the controller with the owner. They were never delegated to agents.

## 5. Rulings made on the owner's behalf

| # | Ruling | Cost if wrong |
|---|---|---|
| 1 | Publishing and DNS stages stay with the controller and owner, not subagents | Slower only |
| 2 | The DNS tool's code was built and reviewed before launch, like all other code | None |
| 3 | Newer html-validate (11.16.1) allowed. Markup was fixed to satisfy it; only the spec-mandated honeypot got an inline exemption | Minor markup churn |
| 4 | Port 4173 confirmed free before every browser-test run; `reuseExistingServer: false` | None |
| 5 | No build until Node ≥ 24.8 | None |
| 6 | Node upgraded to 24.19 LTS (owner's request) | None |
| 7 | Commit trailer enforced verbatim after one agent substituted its own model name | None |
| 8 | `tools/lighthouse.mjs` hardened: guarded Chrome cleanup and validated `runs`. It paid off on every later run | A few lines in a dev tool |
| 9 | Mobile-menu breakpoint moved from 720px to **45em**: identical at default text size, and no header overflow with enlarged text | None at default size |
| 10 | Preview redirect retired from the form-config guard only at the domain switch | None |
| 11 | Build ledger kept until launch; publishing replaced the merge step (work was on `main` by owner choice) | None |
| 12 | Git credential helper set repo-locally, not globally, so the owner's other repos are untouched | None |
| 13 | LinkedIn preview check skipped (the site links no social profiles) | One unverified preview card |
| 14 | HTTPS certificate re-triggered early: it never started because the domain was attached before DNS pointed at GitHub | Seconds of detachment on an unannounced site |

## 6. Defects caught before they shipped (lessons)

- **No-JS form fallback:**
  - A `?sent=1` URL can't show a confirmation without JS.
  - The free Web3Forms plan refuses cross-domain redirects.
  - Fix: a CSS `#message-sent:target` confirmation and a redirect that matches the stage.
- **JS form path:** sending the `redirect` field in the JSON made the API answer with a redirect. `fetch` reported failure even though the email was sent, which would cause duplicate resubmits. Fix: strip `redirect` before sending.
- **Accessibility:**
  - The amber focus ring was 1.6:1 on light; it got its own `--focus` token.
  - Input borders were under 3:1.
  - A looping animation violated WCAG 2.2.2. At launch, auto-playing motion was capped at 5 s and never looped: the hero pulse played twice in 4.9 s, and the logo played once in 3.65 s. (Since 2026-09-30 both loop behind a pause control, which is the other way to meet 2.2.2; the cap still applies when JavaScript is off. See §3.)
  - Live regions hidden with `display:none` don't announce; they now stay rendered.
  - Focus dropped to `<body>` on submit; it now returns to the button.
- **CSS specificity:** `ul[class]` (0,1,1) beat single-class component margins, which silently removed spacing. Fix: wrap the reset in `:where()`.
- **Unstyled lists:** the header and footer nav `<ul>` had no class, so they kept browser bullets.
- **Playwright with JS off:** smooth scrolling never settles, so `click()` waits forever ("element is not stable"). Fix: those tests run with `reducedMotion: 'reduce'`.
- **html-validate** rejects `autocomplete` on a checkbox, but the spec's honeypot needs it. Fix: an inline single-line directive.
- **DNS verification against public resolvers** (8.8.8.8/1.1.1.1) can report "unchanged" from cache. `tools/dns.mjs` now queries the zone's **authoritative** nameservers.
- **Enlarged default text** overflowed the header just above the px breakpoint. Fix: an em breakpoint.
- **GitHub Pages certificate** stayed `null` because the domain was attached before DNS resolved to GitHub. Fix: re-saving the domain started issuance, approved within a minute.
- **Windows:**
  - `kill $!` in Git Bash doesn't stop the real node process.
  - Node's file watcher crashes on 8.3 short paths.
  - chrome-launcher can throw EPERM during cleanup.
  - Too many stray node processes cause out-of-memory crashes in the browser tests.

## 7. Runbooks

**Edit the site**
1. Edit `site/`. If a change in copy breaks a pinned test, update the test deliberately.
2. Run `npm test`, then preview with `npm run serve`.
3. Push `main` and watch the run (`CLAUDE.md` § Git and deploy). There is no staging.

**Regenerate brand images** (after a logo, headline, or font change): `npm run images`. It renders `tools/brand/*.html` to `og-image.png`, `apple-touch-icon.png`, and `favicon.ico`. Update `site/assets/img/favicon.svg` and `logo.svg` by hand.

**Rotate the Web3Forms key**
1. Create a new key at web3forms.com for contact@outcoretech.com.
2. Replace the `access_key` value in `site/index.html` and `ACCESS_KEY` in `tests/helpers.js`. The form tests pin the key, so CI fails if the two differ.
3. Run `npm run check:live` (it rejects a non-UUID or placeholder key), then `npm test`.
4. Push, then send one real test message by hand.

**Change DNS**
1. Export the zone file from GoDaddy as a backup, then run `node tools/dns.mjs snapshot dns-snapshots/before-YYYY-MM-DD.json`.
2. Make the change in GoDaddy. Never touch the mail records listed in `CLAUDE.md`.
3. `node tools/dns.mjs verify dns-snapshots/before-YYYY-MM-DD.json`. For a change to web records it must print "Cutover DNS verified". The tool lets only the apex A/AAAA, the `www` CNAME and the `_github-pages-challenge-lz64` TXT change, and it requires them to hold GitHub's values. An intended change to any other record it queries (MX, the SPF/DKIM TXTs, `_dmarc`, CAA, `_domainconnect`) shows as `changed:` and exits 1, so check those lines against the change you made. Records it doesn't query, such as a new subdomain, aren't checked. An unexpected `changed:` line on a mail record means restore it immediately from the zone file exported in step 1.

**HTTPS certificate stuck** (`gh api repos/lz64/outcoretech/pages --jq .https_certificate.state` stays `null` for more than 20 minutes while `.../pages/health` is valid):
```bash
gh api -X PUT repos/lz64/outcoretech/pages -F cname=null
gh api -X PUT repos/lz64/outcoretech/pages -f cname=outcoretech.com
```
Then poll until the state is `approved`. Check `gh api repos/lz64/outcoretech/pages --jq .https_enforced`; if it isn't `true`, run `gh api -X PUT repos/lz64/outcoretech/pages -F https_enforced=true`.

**Health check of production**
```bash
node tools/smoke.mjs https://outcoretech.com/ --check-404
node tools/lighthouse.mjs https://outcoretech.com/
```

## 8. Open follow-ups (minor, none affects visitors today)

- `tools/motion.test.mjs`: the guard regex would also accept a negated `@media not (prefers-reduced-motion: no-preference)`.
- `.bsd-bar` has a fixed height (so the 404 page fits above the fold). With a browser minimum font size above 14px, its text could spill under the header. Optional fix: `overflow: hidden`.
- `tools/dns.mjs` lowercases only CNAME values, so a case-only change in an MX hostname (which DNS treats as identical) would show as a false "changed". Its CLI also prints a raw stack trace on resolver failures.
- The schematic stays full size (not reduced) when stacked between 720 and 899px. This is cosmetic.
- The "Pause motion" button scrolls away with the top bar while the logo keeps looping in the sticky header. It meets WCAG 2.2.2 (it is the second tab stop on every page), but mouse users must scroll up to reach it.
- `tools/motion.test.mjs` only parses the `animation:` shorthand. A rule written with `animation-*` longhands would slip past the static guard (the browser tests would still catch most cases).
- The loop rest state is checked through computed styles. A pixel comparison of the live resting logo would also catch paint artifacts.
- GitHub's `ubuntu-latest` runner image moves to Ubuntu 26 from 2026-10-19. CI should keep working; watch the first run after that date.

## 9. Where things live

| Thing | Where |
|---|---|
| Code, CI, Pages settings | GitHub, account `lz64`, repo `lz64/outcoretech` |
| Domain and DNS | GoDaddy (outcoretech.com) |
| Mailbox | Zoho Mail (contact@outcoretech.com) |
| Form relay | Web3Forms dashboard (retention 30 days; free plan 250 submissions/month) |
| Brand sources | `tools/brand/*.html`, `site/assets/img/*.svg` |
| DNS baseline snapshots | `dns-snapshots/` (git-ignored, local only) |
