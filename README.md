# outcoretech.com

Source for the Outcore Tech website. The deployed site is the `site/` folder: plain HTML, CSS, and one small JS file, with no build step.
The design spec is `docs/superpowers/specs/2026-09-28-outcore-tech-site-design.md`.

## Edit the site

- **Copy:** `site/index.html`. Tests in `tests/` pin the approved wording, so update the matching test when you change copy on purpose.
- **Styles:** `site/assets/css/site.css`. Colours come only from the tokens at the top; `npm run check` enforces their contrast.
- **Footer year:** `© 2026` in `site/index.html` and `site/404.html`.
- **Contact form:** submissions go through Web3Forms to contact@outcoretech.com. The key is the `access_key` hidden input in `site/index.html`, and it is public by design.

## Preview locally

```bash
npm install
npx playwright install chromium
npm run serve          # http://127.0.0.1:4173/
```

## Test

```bash
npm run check          # unit tests, HTML validation, contrast, links, form config
npm test               # all of the above plus the browser tests
```

## Deploy

Push to `main`. GitHub Actions validates, then publishes `site/` to GitHub Pages at https://outcoretech.com.
After launch there is no staging URL, so preview locally before pushing.

## Maintenance commands

```bash
npm run images                                      # regenerate og-image.png, apple-touch-icon.png, favicon.ico
node tools/smoke.mjs https://outcoretech.com/ --check-404
node tools/lighthouse.mjs https://outcoretech.com/  # median of 3 runs, each category must be >= 95
```
