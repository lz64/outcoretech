# Outcore Tech Website — Design Spec

- **Date:** 2026-09-28
- **Owner:** Ari Friedman (Outcore Tech)
- **Status:** Revised after an adversarial review (see §8), for owner review
- **Live target:** https://outcoretech.com

---

## 1. Intent

### What Ari said
- Outcore Tech is the business name for Ari's services in **AI engineering, IoT prototyping, systems automation, and production process optimization**. Build the site and get it live.
- Audience: **both** industrial/operations buyers and product companies/startups, **equal weight**, for a general business audience.
- Domain: **outcoretech.com** (owned; registered and DNS-hosted at GoDaddy).
- Contact: **a contact form that sends to email**. Destination: **contact@outcoretech.com** (mailbox hosted on Zoho Mail).
- Proof material: **five past projects** and **a background/bio**, both supplied. There is no logo or brand colors.
- AI work Ari delivers: **AI/ML event detection on real-time video, LLM apps and agents, machine learning on operational and sensor data, and computer vision beyond event detection.** Cloud AI on Azure/AWS is **not** claimed as an AI service.
- Process: Ari **does** deliver fast prototyping, handover documentation, and ongoing support. Security hardening is **not** claimed.
- Hosting: **GitHub Pages** under the `lz64` account, in a public repo.
- Visual direction: **"Control Room"**.
- The hero headline keeps "the plant floor". Ari chose it knowing it leans industrial.
- A one-line privacy note goes under the form's Send button.
- Commits in this repo use `51067939+lz64@users.noreply.github.com`, set in the repo-local git config (already done).

### Assumptions (confirmed during brainstorming)
- The site's job is to **win consulting work**: a visitor should understand what Outcore Tech does, trust that it has been done before, and make contact.
- A single-page marketing site is enough for launch.
- The copy is written in the **first person** ("I"). Metadata (title, description, and JSON-LD) is in the third person, which is standard.
- **No fabricated proof.** There are no invented clients, testimonials, logos, metrics, locations, or response times, and nothing is claimed beyond what Ari listed or confirmed.

### Success criteria
1. `https://outcoretech.com` serves the site with a valid HTTPS certificate. `https://www.outcoretech.com` and `http://` redirect to it.
2. Real form submissions arrive in the contact@outcoretech.com inbox, both with JavaScript on and with it off, and hitting Reply addresses the visitor.
3. Mail is unaffected: every non-web DNS record is byte-identical before and after the cutover. That covers MX, both SPF TXT records, the Zoho DKIM TXT (`zmail._domainkey`), and `_dmarc` if it exists.
4. Lighthouse mobile (median of 3 runs) scores **≥ 95** in Performance, Accessibility, Best Practices, and SEO against `https://outcoretech.com/` after HTTPS is enforced.
5. The layout is correct at 320, 375, 768, 1024, and 1440 px in light and dark, with no horizontal scroll. The automated accessibility scan (axe) reports zero WCAG 2.2 A/AA violations in both color schemes.
6. Ari has approved every word of copy before the domain is pointed at the site.

---

## 2. Scope

**In:**
- A single page (`index.html`) and a custom `404.html`.
- A contact form with a JavaScript path and a no-JavaScript fallback.
- SEO metadata, an Open Graph image, JSON-LD, and favicons.
- `robots.txt`, `sitemap.xml`, and a GitHub Actions deploy with validation.

**Out (YAGNI for launch):** blog, CMS, analytics and cookies, a theme toggle, a booking link, testimonials, client logos, a web manifest, CSP, CAPTCHA (escalation path in §7), and server-side code.

---

## 3. Page structure and copy

Mono section labels such as `// SERVICES` are part of the Control Room styling.

**Naming rule:** service headings, the contact select, and the meta description use the full name "Production Process Optimization". The hero strip, project tags, and footer use the short form "Process Optimization" (or `OPTIMIZATION` in mono).

### 3.1 Header (sticky, `--header-h: 64px`)
- Logo mark and the wordmark **OUTCORE TECH**, linking to the top of the page. The logo SVG has an accessible name.
- `<nav id="site-nav" aria-label="Primary">` holds **Services · Industries · Work · About** and a highlighted **Contact** button.
- **≥ 720 px:** the links are inline.
- **Below 720 px:** the header shows only the logo mark, the wordmark, and `<button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>`.
  - `#site-nav` is collapsed until toggled, then opens as a full-width panel below the header.
  - The panel closes on Escape (focus returns to the toggle), when a link is activated, and when the viewport grows to ≥ 720 px.
  - The collapsed state comes from CSS alone. No class is toggled at load, so the nav causes no layout shift.
- **Without JS:** `<noscript><link rel="stylesheet" href="assets/css/nojs.css"></noscript>` in `<head>` does three things:
  - hides the toggle;
  - shows `#site-nav` as a wrapping row under the logo, with each link at least 44 px tall;
  - makes the header `position: static` below 720 px.

### 3.2 Hero
- Status line (mono): `● SYSTEMS ONLINE // 25 YEARS IN THE FIELD`. The dot is a CSS circle, not a text glyph.
- **H1:** Engineering that connects the plant floor, the network, and the cloud.
- **Subline:** AI engineering, IoT prototyping, systems automation, and production process optimization — for operations teams and product builders alike. Backed by 25 years as a computer systems engineer.
- Buttons: **Start a conversation** (goes to `#contact`) · **See services** (goes to `#services`), followed by an arrow drawn as inline SVG with `aria-hidden`.
- Service index strip (mono, each item links to its card's id): `01 AI ENGINEERING · 02 IOT PROTOTYPING · 03 SYSTEMS AUTOMATION · 04 PROCESS OPTIMIZATION`
- Decorative schematic (inline SVG, `aria-hidden="true"`): the nodes `SENSOR — CONTROLLER — EDGE — CLOUD` joined by circuit traces.
  - After load, an amber pulse travels the traces for **at most 5 seconds in total** (for example a 2.4 s CSS animation with `animation-iteration-count: 2`), then stops (WCAG 2.2.2).
  - The pulse doesn't run at all under `prefers-reduced-motion: reduce`, and it is CSS only.
  - Below 720 px the schematic sits under the text at reduced size.

### 3.3 Services — `// SERVICES` (`id="services"`; cards `#ai`, `#iot`, `#automation`, `#process`)
**H2:** Four disciplines. One connected system.

**01 — AI Engineering**
*Practical AI built into real systems — not demos.*
I build AI into the systems you already run: LLM apps and agents, machine learning on operational and sensor data, and computer vision on live video.
- LLM apps and agents: chat assistants, document processing, and workflow automation
- Machine learning on operational and sensor data: prediction, anomaly detection, and forecasting
- Computer vision on real-time video: event detection, inspection, counting, and tracking
- Event-triggered automation at the edge, such as automated recording

**02 — IoT Prototyping**
*From bench prototype to field pilot.*
Connected devices built around ESP32, LoRaWAN, and Wi-Fi, with the sensors, controls, and interfaces your product or equipment needs.
- ESP32-based controllers
- Touchscreen controls, timers, and scheduling
- LoRaWAN and Wi-Fi sensor networks
- Serial integration with existing equipment
- Matter smart-home integration

**03 — Systems Automation**
*Equipment that runs on rules, not clipboards.*
PLCs, SCADA, building controls, and networks tied together, and to the cloud, so systems respond on their own and report what they're doing.
- PLC and MES/SCADA integration
- HVAC, temperature, and ventilation control
- Building and home automation
- High-density networks, fiber optics, and real-time video distribution

**04 — Production Process Optimization**
*Instrument the process. Find the bottleneck. Automate the fix.*
I replace paper, duplicate data entry, and blind spots with real-time data and automated workflows.
- Paper systems and duplicative manual processes replaced completely
- Real-time metrics and driver feedback
- QR code scanning and passwordless driver authentication
- Monitoring, alerting, and centralized situational views
- Pick/pack, load/unload, and delivery workflows

### 3.4 Industries — `// INDUSTRIES` (`id="industries"`)
**H2:** Where I've delivered.
Manufacturing · Distribution & logistics · Industrial process · Traffic control · Building control & HVAC · Home automation · Public-private partnerships (3P)

### 3.5 How I work — `// PROCESS`
**H2:** How I work.
1. **Assess.** I learn the operation or product, map the systems and data, and agree with you on what "better" looks like, in terms you can measure.
2. **Prototype.** A working proof on real hardware and real data, built fast, so decisions rest on evidence rather than slides.
3. **Deploy.** Taken from prototype into the field, with the networking and monitoring to keep it running and documentation your team can own.
4. **Support.** Monitoring, tuning, and extensions as your operation or product changes.

### 3.6 Selected work — `// SELECTED WORK` (`id="work"`)
**H2:** Systems in the field.
Each card shows the title, the service tags, the industry (only where Ari stated one), and then **Challenge**, **Built**, and **Result**. Ari approved the cards as written.

**1. Smart 36 kW pool heater controller**
Tags: IoT Prototyping · Systems Automation
- **Challenge:** Board-controlled heaters slammed the heating elements on and off, with no flexibility in how or when they ran.
- **Built:** A standalone Wi-Fi controller with soft ramp up/down, eco consumption modes, timers and scheduling, ambient temperature inputs, pump speed control and pump-state awareness, Matter smart-home integration, and a touchscreen interface.
- **Result:** Controlled ramping instead of hard starts, running on the owner's schedule from the wall panel or any Matter app.

**2. Warehouse and delivery logistics platform**
Tags: Process Optimization · Systems Automation · Industry: Distribution & logistics
- **Challenge:** Pick/pack, load/unload, and delivery ran on paper, with the same information keyed in more than once.
- **Built:** QR code scanning at every step, Google API integrations, passwordless driver sign-in, and real-time metrics with driver feedback.
- **Result:** Completely replaced the paper systems and the duplicated manual processes.

**3. Quarry operations monitoring**
Tags: Systems Automation · Process Optimization · Industry: Industrial process
- **Challenge:** Large industrial quarries ran SCADA networks with no centralized situational view or information repository, and remote locations couldn't drill into detail.
- **Built:** Monitoring, alerting, and process improvement across the SCADA networks with integrated real-time video feeds, plus a centralized situational view with drill-down from remote locations.
- **Result:** One operational picture, with the detail available from any location.

**4. Edge-virtualized real-time video distribution**
Tags: AI Engineering · Systems Automation · Industry: Traffic control
- **Challenge:** Multiple large real-time video distribution and control systems were held back by parallel concurrency limits, with no conditional awareness or remote enablement.
- **Built:** An edge virtualization platform with compression and location awareness, monitoring, and AI event detection that triggers automated recording for situational awareness.
- **Result:** Removed the concurrency ceiling and added event-driven recording and remote enablement.

**5. Automated building hot water**
Tags: IoT Prototyping · Systems Automation · Industry: Building control
- **Challenge:** Conventional hot water meant waiting at the tap or wasting energy keeping the lines hot.
- **Built:** Wi-Fi and cloud control of tankless units, valve controls, and recirculation pumps, with multiple temperature sensing points and fault detection.
- **Result:** Hot water available everywhere, without the waste, and fully configurable.

*Spec-only note, not page copy: the card 5 Challenge was worded during brainstorming and approved with the card drafts.*

### 3.7 About — `// ABOUT` (`id="about"`)
**H2:** Ari Friedman
*Computer Systems Engineer · 25 years*

I've spent 25 years as a computer systems engineer, building systems that have to work in the real world: high-density networks, fiber optics, and real-time video; PLCs, MES/SCADA, and building controls; ESP32 and LoRaWAN devices; Python, Azure, and AWS; and AI, from LLM apps to computer vision. Outcore Tech is how I bring that full stack to clients: one engineer who can take a problem from the sensor to the cloud and back.

Toolset (four labelled groups of mono "chips"):
- **AI & edge:** LLM apps & agents · Machine learning · Computer vision · AI/ML event detection · Edge virtualization · Video compression
- **Networks & video:** High-density networks · Fiber optics · Real-time video sharing
- **Field & controls:** ESP32 · PLC · Serial · MES/SCADA · LoRaWAN · Wi-Fi · Matter · HVAC · Temperature & ventilation control · Building control · Home automation
- **Software & cloud:** Python · Azure · AWS · Google APIs

### 3.8 Contact — `// CONTACT` (`id="contact"`)
**H2:** Tell me what you're building, or what needs fixing.
*Share a few details and I'll get back to you.*

| Label | `name` | Type | Required | Attributes |
|---|---|---|---|---|
| Name | `name` | text | yes | `autocomplete="name"`, `maxlength="100"` |
| Email | `email` | email | yes | `autocomplete="email"`, `maxlength="254"`. **Must be named exactly `email`**, because Web3Forms uses it as the Reply-To address |
| Company | `company` | text | no | `autocomplete="organization"`, `maxlength="120"` |
| What do you need help with? | `service` | select | yes | First option `<option value="" disabled selected>Choose one…</option>`, then AI Engineering · IoT Prototyping · Systems Automation · Production Process Optimization · Not sure yet |
| Message | `message` | textarea | yes | `minlength="10"`, `maxlength="5000"`, `rows="6"` |

Hidden fields are listed in §5.3.

- Button: **Send message**. It changes to **Sending…** and is disabled from submit until the response arrives.
- Privacy note under the button (`--muted`, small): *I'll use these details only to reply to you. The form is delivered by Web3Forms. This site sets no cookies and uses no analytics.*
- **JS success** (inline, in a `role="status"` live region): *Thanks — your message is on its way. I'll be in touch soon.* The form is then cleared.
- **JS failure** (inline, `role="alert"`, `--danger` text): *Your message didn't go through. Please try again, or email contact@outcoretech.com.* The address is an underlined `mailto:` link. The visitor's input is kept.
- **No-JS confirmation:** `<p id="message-sent" class="form-sent" tabindex="-1">Thanks — your message is on its way. I'll be in touch soon.</p>`. It is hidden by default and shown only by CSS (`.form-sent:not(:target) { display: none; }`) when the URL fragment is `#message-sent`.
- The failure message is the only place on the page where contact@outcoretech.com is visible.

### 3.9 Footer
`© 2026 Outcore Tech`, the anchor links, and the mono line `AI · IOT · AUTOMATION · OPTIMIZATION`. The year is hardcoded.

### 3.10 404 page
- Mono: `404 // SIGNAL LOST`
- H1: This page isn't on the network.
- Link: **Back to outcoretech.com** (goes to `/`).
- **URLs are root-absolute, and this is the only file where they are.** GitHub Pages serves `404.html` at any missing path and depth, so relative URLs would break. It uses:
  - `/assets/css/site.css`
  - `/assets/img/...`
  - nav links `/#services`, `/#industries`, `/#work`, `/#about`, `/#contact`
- Font URLs inside `site.css` stay relative to the CSS file, so they still resolve.
- `<meta name="robots" content="noindex">`, with no canonical, Open Graph, or JSON-LD tags.
- It renders unstyled on the Stage 1 preview sub-path. That is expected, and it is verified at Stage 2.

### 3.11 Metadata (`index.html` `<head>`)
- `<!doctype html>`, `<html lang="en">`, `<meta charset="utf-8">` first, `<meta name="viewport" content="width=device-width, initial-scale=1">`, and `<meta name="color-scheme" content="light dark">`.
- `theme-color`: `#f3f2ee` with `media="(prefers-color-scheme: light)"`, and `#0e1115` with `media="(prefers-color-scheme: dark)"`.
- `<title>`: Outcore Tech — AI, IoT, Automation & Process Optimization
- Meta description: Outcore Tech: AI engineering, IoT prototyping, systems automation, and production process optimization, backed by 25 years of real-world systems work.
- Canonical URL: `https://outcoretech.com/`
- Icons:
  - `<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">`
  - `<link rel="icon" href="assets/img/favicon.ico" sizes="32x32">`
  - `<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">` (180×180, opaque background)
- Open Graph:
  - `og:type=website`, `og:url=https://outcoretech.com/`, `og:site_name=Outcore Tech`, `og:locale=en_US`
  - `og:title` and `og:description` (same as the title and meta description)
  - `og:image=https://outcoretech.com/assets/img/og-image.png`, with `og:image:width=1200`, `og:image:height=630`, and `og:image:alt="Outcore Tech — engineering from sensor to cloud"`
  - `twitter:card=summary_large_image`
- JSON-LD `Organization` (not `ProfessionalService`, which carries LocalBusiness's address requirement). Fields:
  - `@id` `https://outcoretech.com/#org`, name, url, description
  - `logo` → `https://outcoretech.com/assets/img/apple-touch-icon.png`
  - `founder` → Person: Ari Friedman, jobTitle Computer Systems Engineer
  - `knowsAbout`: AI engineering, LLM applications, machine learning, computer vision, IoT prototyping, systems automation, production process optimization, ESP32, LoRaWAN, PLC, MES/SCADA, HVAC control, building automation, real-time video, fiber optics, Python, Azure, AWS
  - Address and area served are left out because neither was supplied. Email is deliberately left out to limit scraping.
- `robots.txt` allows everything and references `https://outcoretech.com/sitemap.xml`. `sitemap.xml` lists only `https://outcoretech.com/`, with no `<lastmod>`.

---

## 4. Visual design — "Control Room"

### 4.1 Color tokens
The page follows the OS setting via `prefers-color-scheme`, and `color-scheme: light dark` is declared.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#0e1115` | `#f3f2ee` | page background |
| `--surface` | `#151a20` | `#ffffff` | cards, header, menu panel |
| `--surface-2` | `#1b2129` | `#ebeae5` | chips, input fills |
| `--line` | `#27303a` | `#d6d8dc` | **decorative only**: card borders, grid, traces. Never the only boundary of a control |
| `--field-border` | `#6b7684` | `#767e88` | borders of inputs, the select, the textarea, and the menu button |
| `--text` | `#e7eaee` | `#12161b` | body text |
| `--muted` | `#9ba5b1` | `#57616c` | secondary text |
| `--accent` | `#ffb020` | `#ffb020` | button fills, status dot, traces |
| `--accent-text` | `#ffb020` | `#8a5a00` | accent used as text or links |
| `--on-accent` | `#16110a` | `#16110a` | text on amber fills |
| `--focus` | `#ffb020` | `#8a5a00` | focus ring |
| `--danger` | `#ff7a70` | `#b42318` | failure message text and invalid-field borders |

**Contrast contract**, asserted by an automated check in both themes against `--bg`, `--surface`, and `--surface-2`:
- `--text`, `--muted`, `--accent-text`, and `--danger` meet ≥ 4.5:1.
- `--on-accent` on `--accent` meets ≥ 4.5:1.
- `--field-border` and `--focus` meet ≥ 3:1.
- `--line`, the grid, the traces, and the status dot are decorative and exempt.

If any value fails the check, it is adjusted in the build and the new value is recorded here.

### 4.2 Typography
- **IBM Plex Sans** is used for headings and body, and **IBM Plex Mono** for labels, tags, the status line, and chips. Both are licensed under the SIL Open Font License, and `OFL.txt` ships alongside them.
- There are three self-hosted Latin-subset `woff2` files:
  - `ibm-plex-sans-latin-var.woff2` (variable, weights 400–600)
  - `ibm-plex-mono-latin-400.woff2`
  - `ibm-plex-mono-latin-500.woff2`
- All three use `font-display: swap`. Exactly two are preloaded: the Sans variable file and Mono 400, each via `<link rel="preload" as="font" type="font/woff2" crossorigin>`. No third-party font requests are made.
- Glyphs outside the Latin subset (the → arrow and the ● status dot) are drawn as inline SVG or CSS, not as text.
- The type scale uses `clamp()`: the H1 runs from about 2.25 rem on mobile to about 4 rem on desktop, and body text is 1.0625 rem with a line height of 1.6.

### 4.3 Motifs
- A faint 24 px grid behind the hero.
- 1 px `--line` bordered cards with corner tick marks.
- Mono index numbers (`01`–`04`).
- A focus ring on every interactive element: `:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }`. It is never removed without a replacement.
- A logo mark of a solid core inside a ring, with one trace breaking out of the ring ("out of the core"), drawn as SVG and reused for the favicon.

### 4.4 Layout
- Container max width 1160 px. Side gutters are 16 px below 480 px, 24 px up to 1024 px, and 32 px above that.
- Services and process steps: 1 column, 2 columns at ≥ 720 px, 4 columns at ≥ 1080 px.
- Selected work: 1 column, 2 columns at ≥ 900 px.
- `html { scroll-padding-top: calc(var(--header-h) + 8px); }` keeps anchor targets and focused elements clear of the sticky header (WCAG 2.4.11).
- Smooth scrolling applies only under `@media (prefers-reduced-motion: no-preference)`.
- No horizontal scroll at any width down to 320 px. Tap targets are at least 44×44 px.

### 4.5 Accessibility
- The skip link targets `<main id="main" tabindex="-1">`. There are semantic landmarks, one H1, and an ordered heading hierarchy.
- Every form control has a visible `<label>`. Status messages use live regions.
- Links inside running text, including the failure message's mailto, are underlined, because color alone doesn't distinguish them.
- All motion is covered by §3.2's 5-second limit and stops under reduced motion.
- Decorative SVGs are `aria-hidden="true"`.

---

## 5. Architecture

### 5.1 Repository layout
```
outcoretech/
├─ site/                      ← the ONLY folder that is deployed
│  ├─ index.html
│  ├─ 404.html
│  ├─ robots.txt
│  ├─ sitemap.xml
│  └─ assets/
│     ├─ css/site.css · css/nojs.css
│     ├─ js/site.js
│     ├─ fonts/*.woff2 · fonts/OFL.txt
│     └─ img/  logo.svg · favicon.svg · favicon.ico · apple-touch-icon.png · og-image.png
├─ tools/                     ← dev-only scripts (asset generation, checks); never deployed
├─ tests/                     ← browser tests (layout, axe, no-JS, keyboard); never deployed
├─ .github/workflows/pages.yml
├─ docs/superpowers/specs/ · docs/superpowers/plans/
├─ package.json · package-lock.json   ← dev-only tooling
└─ README.md                  ← how to edit, preview locally, and deploy
```

The deploy goes through **GitHub Actions**, uploading only `site/`, so specs, plans, and tooling never reach the live site. GitHub's docs say that with a custom Actions workflow a `CNAME` file is ignored and not required, and the custom domain is set through the Pages API. Jekyll never runs, so no `.nojekyll` file is needed.

### 5.2 Units
| Unit | Responsibility | Depends on |
|---|---|---|
| `index.html` | All content, structure, metadata, and the inline SVGs (logo, schematic, arrow). All URLs are relative. | `site.css`, `nojs.css`, `site.js` (optional) |
| `site.css` | Tokens, themes, typography, layout, components, motion | fonts |
| `nojs.css` | No-JS header and nav layout (§3.1) | — |
| `site.js` | (1) mobile nav toggle; (2) progressive-enhancement form submit (§5.3) | Web3Forms API |
| `404.html` | Not-found page, with root-absolute URLs (§3.10) | `site.css` |
| `pages.yml` | Validate `site/`, then deploy it to GitHub Pages | GitHub Actions |

The page is fully usable with JavaScript disabled: the nav comes from §3.1 and the form falls back as described in §5.3.

### 5.3 Contact form data flow
1. `<form action="https://api.web3forms.com/submit" method="POST">`, with these hidden fields:
   - `access_key`: Ari's key. It is designed to be public, so it is not a secret.
   - `subject`: "New inquiry – Outcore Tech"
   - `from_name`: "Outcore Tech website"
   - `redirect`: **depends on the stage.** In Stage 1 it is `https://lz64.github.io/outcoretech/#message-sent`; from Stage 2 it is `https://outcoretech.com/#message-sent`. The free plan requires redirects to stay on the same domain as the form.
   - The `botcheck` honeypot, exactly `<input type="checkbox" name="botcheck" hidden tabindex="-1" autocomplete="off">`. It must be a checkbox with the `hidden` attribute, never an off-screen text input, so that keyboard and assistive-technology users can never reach it.
   - There is **no `replyto` field.** Web3Forms uses the `email` field as Reply-To by default, and a `replyto` field would override it.
2. **With JavaScript**, `site.js` intercepts the submit:
   - It calls `form.reportValidity()` and stops if the form is invalid.
   - It builds `const data = Object.fromEntries(new FormData(form)); delete data.redirect;`. The redirect field is for the no-JS path only; sending it from `fetch` causes a cross-origin redirect that reports a false failure and leads visitors to resubmit.
   - It POSTs `JSON.stringify(data)` to `https://api.web3forms.com/submit` with `Content-Type: application/json` and `Accept: application/json`.
   - **Success is `response.ok && body.success === true` only.** Anything else is a failure: a 4xx, 429, or 5xx status, a Cloudflare HTML challenge, a body that isn't JSON, a missing `success` field, or a network error. On failure the page shows the failure message, keeps the input, and re-enables the button. The API's `message` text is never shown to visitors.
3. **Without JavaScript:** a native POST. Web3Forms then 303-redirects to the `redirect` URL, and `#message-sent:target` shows the confirmation (§3.8).
4. Web3Forms emails the submission to contact@outcoretech.com, with the visitor's `email` as Reply-To and every named field included.
5. Automated submissions are never used in CI or `tools/`. Web3Forms rejects server-side calls on the free plan and rate-limits repeated submissions.
6. **Retention:** Web3Forms keeps submissions (US-hosted) for up to 3 years by default. Ari sets the form's retention to **30 days** in the Web3Forms dashboard. Zoho is the system of record.

### 5.4 Deploy
**Stage 1: Preview**
1. Create the public repo `lz64/outcoretech`. Pushes authenticate as `lz64` through `gh auth setup-git`, whose token has the `workflow` scope. Before the first push, confirm that `git log --format=%ae | sort -u` lists only the no-reply address.
2. Enable Pages with `build_type=workflow`: `gh api -X POST repos/lz64/outcoretech/pages -f build_type=workflow`. If that is rejected because the repo is still empty, push first, enable Pages, and then run `gh workflow run pages.yml`.
3. Push `main`. `pages.yml` runs on push to `main` and on `workflow_dispatch`. It runs a validate job first; the deploy job runs only if validation passes. Stage 1 is complete when a run has succeeded after Pages was enabled.
4. The preview is at `https://lz64.github.io/outcoretech/`.
   - `index.html` uses only relative asset paths, so it works under the sub-path. The one exception is `404.html` (§3.10).
   - Canonical, Open Graph, and sitemap URLs are absolute to `https://outcoretech.com`.

**Stage 2: Domain (only after Ari approves the preview and copy)**
0. **Before-snapshot:** export the GoDaddy zone file, and record `Resolve-DnsName` output for these records:
   - MX, TXT, A, AAAA, and CAA at `@`
   - `_dmarc`, `zmail._domainkey`, and `dc-8e814c8572._spfm`
1. **Verify the domain on the GitHub account.** This is web UI only; there is no API for it.
   - While signed in as `lz64`, go to profile **Settings → Pages → Add a domain** and enter `outcoretech.com`.
   - In GoDaddy, add a TXT record. The Name is `_github-pages-challenge-lz64`. **Do not type `.outcoretech.com`; GoDaddy appends it.** The Value is the code GitHub shows.
   - Once `Resolve-DnsName _github-pages-challenge-lz64.outcoretech.com -Type TXT` returns the value, click **Verify**.
   - **Keep this record permanently.**
2. **Set the custom domain** (only after step 1 shows Verified): `gh api -X PUT repos/lz64/outcoretech/pages -f cname=outcoretech.com`. From this moment, `lz64.github.io/outcoretech/*` 301-redirects to `outcoretech.com/*`, so do step 3 straight away.
3. **GoDaddy DNS**, done by Ari from a copy-paste list:
   - Turn off any forwarding or parking.
   - **Delete** A `@` records `15.197.148.33` and `3.33.130.190`.
   - **Add** A `@` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`.
   - **Add** AAAA `@` records (recommended) `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, and `2606:50c0:8003::153`.
   - **Edit** the CNAME `www` to point at `lz64.github.io`.
   - **Do not touch:**
     - MX `mx.zoho.com` (10), `mx3.zoho.com` (20), and `mx2.zoho.com` (50)
     - TXT `@` `v=spf1 include:dc-8e814c8572._spfm.outcoretech.com ~all`
     - TXT `dc-8e814c8572._spfm`
     - TXT `zmail._domainkey`
     - `_dmarc`, if present
     - CNAME `_domainconnect`
4. **Wait for the certificate.** Poll `gh api repos/lz64/outcoretech/pages --jq '{cname,protected_domain_state,https_certificate}'` until `https_certificate.state == "approved"`. If it hasn't been approved within about 1 hour of DNS resolving, remove the domain (`-F cname=null`), set it again, and keep polling.
5. **Enforce HTTPS:** `gh api -X PUT repos/lz64/outcoretech/pages -F https_enforced=true`.
6. **Switch the form redirect:** commit the `redirect` value change to `https://outcoretech.com/#message-sent` and push. The deploy goes live.
7. **From here on there is no preview URL.** Every push to `main` is production, so later edits are previewed locally with the `package.json` preview script before pushing.

---

## 6. Verification (before declaring each stage done)

**Stage 1 (preview):**
- HTML validation and internal link and fragment checks pass, both locally and in CI.
- The contrast check passes for the contract in §4.1.
- Browser tests at 320, 375, 768, 1024, and 1440 px, in light and dark:
  - no horizontal scroll;
  - screenshots at 375 and 1440 px in both schemes for Ari to review;
  - zero axe WCAG 2.2 A/AA violations in both schemes.
- Keyboard: pressing Tab from page load focuses the skip link first, and every focusable element shows a visible focus ring.
- No-JS pass, at 375 px with JavaScript disabled:
  - every nav link is visible and focusable;
  - the menu toggle is hidden;
  - the form's fields are usable, and it POSTs to Web3Forms.
- Lighthouse mobile is run against the preview as an early signal. The binding run is in Stage 2.
- **A real form submission with JavaScript** from the preview: the inline success message appears, the form clears, and Ari confirms it arrived in Zoho with a working Reply-To. If Web3Forms rejects the `github.io` host, run this test from the local preview server instead.

**Stage 2 (domain):**
- DNS checks:
  - `outcoretech.com` A returns exactly `185.199.108–111.153`, with neither `15.197.148.33` nor `3.33.130.190`.
  - AAAA, if added, returns exactly the four `2606:50c0:800x::153` values.
  - `www` is a CNAME to `lz64.github.io`.
  - The `_github-pages-challenge-lz64` TXT record is present.
- **Every record in the step 0 before-snapshot, other than the planned A, AAAA, and www changes, is byte-identical.**
- `https://outcoretech.com` returns 200 with a valid certificate.
- `http://outcoretech.com` and `https://www.outcoretech.com` redirect to it.
- `https://lz64.github.io/outcoretech/` returns a 301 to it.
- The Pages API reports `protected_domain_state: verified`, an `approved` certificate, and `https_enforced: true`.
- `https://outcoretech.com/a/b/c` returns HTTP 404 with the styled 404 page.
- **A real form submission with JavaScript disabled** from `https://outcoretech.com` lands on `/#message-sent`, shows the confirmation, and arrives in Zoho.
- **Lighthouse mobile** against `https://outcoretech.com/` (median of 3) is ≥ 95 in all four categories.
- The link preview for `https://outcoretech.com/` looks right in LinkedIn Post Inspector: image, title, and description.

---

## 7. Risks and owner actions

| Item | Owner | Note |
|---|---|---|
| Web3Forms access key | Ari | Create it at web3forms.com for contact@outcoretech.com and paste it into the chat. It is needed before the Stage 1 deploy. |
| Web3Forms retention | Ari | Set the form's retention to 30 days in the Web3Forms dashboard (§5.3). |
| Copy review | Ari | This spec, then the live preview. That includes the Industries list: Manufacturing, 3P, and Home automation come from Ari's background, not from a project card. |
| GitHub domain verification and GoDaddy DNS | Ari | This is §5.4 Stage 2, with copy-paste instructions provided. HTTPS is usually ready within an hour of the domain resolving; DNS propagation can take up to 24 h. |
| Web3Forms emails landing in spam | Ari | After the first test, add the sender shown on that email to Zoho's allow-list. |
| Form spam | Ari | Launch relies on Web3Forms' server-side filtering plus the honeypot, which Web3Forms marks as deprecated but which is harmless to keep. If spam arrives, enable Web3Forms' free hCaptcha. That adds the third-party script `https://web3forms.com/client/script.js` (loaded on first focus of the form) and a `<noscript>` note, makes JS required to submit, and needs a Lighthouse re-check. Spam also counts toward the quota. |
| Free-tier cap | — | The Web3Forms free plan allows 250 submissions a month. Past the cap, submissions are refused until the next month, and JS visitors see the mailto fallback. The access key is public, and domain restriction requires a paid plan. |
| github.io preview rejected by Web3Forms | — | Some free platform subdomains are blocked by default. If so, run the Stage 1 JS submission test from localhost, and the no-JS test at Stage 2 (as already planned). |
| Public repo | — | Source, spec, and plan are publicly readable. They contain no secrets. |

---

## 8. Review log

An adversarial review ran on 2026-09-28: four independent reviewers (GitHub Pages facts, Web3Forms facts, copy fidelity, completeness), each followed by a skeptic that tried to refute every finding. The findings that survived and were applied:

- **No-JS form:** a CSS `:target` confirmation and a redirect that depends on the stage. The earlier `?sent=1` design needed JS, and its cross-domain redirect was refused on the free plan.
- **JS form:** `redirect` is stripped from the payload, the success condition is explicit, and the field `name` attributes and the select placeholder are specified.
- **Honeypot:** exact markup, plus the spam escalation path.
- **Accessibility:**
  - `--focus` token: amber was only 1.63:1 in light.
  - `--field-border` token: `--line` was below 3:1.
  - `--danger` token.
  - Animation limited to 5 s (WCAG 2.2.2).
  - Scroll padding for the sticky header.
  - Underlined in-text links.
  - The mobile header and no-JS nav defined without layout shift.
- **404 page:** root-absolute URLs.
- **Deploy order:** Pages is enabled before the first run, and in Stage 2 the account is verified, then the cname is set, then DNS changes back to back, then the certificate is polled, then HTTPS is enforced.
- **DNS:** the GoDaddy TXT Name is the prefix only, the AAAA values are listed explicitly, all mail records are protected by a before-snapshot, and the preview URL's 301 is noted.
- **Copy:**
  - Unsupported claims removed ("data pipelines", "operator" feedback, "security", merged ESP32/touchscreen).
  - AI scope set from Ari's confirmations.
  - Home automation added to Industries.
  - Naming rule added.
  - The AI & edge toolset group added.
  - Title and meta description shortened.
  - JSON-LD switched to `Organization`.
- **Fonts:** the variable Plex Sans file, the exact preload list, and non-Latin glyphs drawn as SVG/CSS.
