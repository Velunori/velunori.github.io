# Velunori search and social metadata

Prepared for `https://velunori.github.io/`. The website is still local and unpublished; no search-console registration, crawl/index request, domain change or public deployment has been performed.

## Included

- Unique English titles and descriptions for the homepage and installation guide.
- Canonical URLs: homepage `/` and `/guide.html`; component-selection query variants keep the same canonical page.
- Explicit indexing/large-preview metadata for public pages, with `noindex` on the custom 404 page.
- Open Graph and Twitter large-image metadata, absolute URLs and descriptive image alternatives.
- A real 1200×630 PNG share card rendered from the project's HTML, logo and Dusk wallpaper; `scripts/social-card.html` is its editable source.
- Structured JSON-LD: Organization, WebSite and SoftwareApplication on the homepage; TechArticle and BreadcrumbList on the guide. No fabricated reviews, ratings or unsupported publication dates.
- An XML sitemap with actual content update dates and canonical HTML URLs only. Downloads, utility scripts and review screenshots are not submitted as content pages.
- `robots.txt`, SVG/PNG favicons, Apple touch icon and a browser-mode web manifest. No service worker, PWA/offline claim, analytics or third-party runtime request is added.
- Readable static content, descriptive headings/links, image alternatives, responsive layouts and no-JavaScript fallback remain intact.
- A small optional Revolut support link in the footer, without an embedded payment widget or tracking request.

The software schema describes the preview honestly. Parsed JSON-LD is not a guarantee of a Google software rich result, indexing or ranking. We do not add fake ratings to satisfy rich-result fields. See [Google's software-app guidance](https://developers.google.com/search/docs/appearance/structured-data/software-app), [structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), and [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Validate locally

```bash
python3 scripts/check.py
node scripts/browser-check.mjs
```

The offline checker validates titles/descriptions, canonical consistency, JSON-LD parsing/types, social metadata and exact PNG dimensions, icon paths, sitemap URLs/dates, robots references and 404 rules. Browser checks cover the visible content, install selection, small-screen overflow, no-JavaScript content and unexpected external runtime requests.

The social card can be re-rendered with local Chromium:

```bash
bash scripts/render-social-card.sh
```

Update sitemap `lastmod` only when page content materially changes, not on every check. Update canonical/social/manifest/sitemap URLs together if the domain or hosting path changes. The site has one language; no untranslated alternate-language pages are claimed.

## After the Omarchy compatibility/release gate

Only after publication is approved and completed:

1. Verify real HTTPS responses, the root/guide canonical URLs, native 404 status, robots, sitemap, icons, social-card image and installer/checksum downloads.
2. Verify ownership in Search Console without putting private credentials in the repository. No verification token is invented here.
3. Submit the live sitemap and inspect canonical/indexability results. A sitemap is a hint, not a guarantee of crawling/indexing or ranking.
4. Check live structured-data and social previews against the deployed URL. Record results separately from offline parsing.
5. Recheck mobile behavior and measured performance; do not claim Core Web Vitals or Lighthouse scores that were not measured.

Blocking utility/download paths in robots does not itself guarantee their URLs cannot appear in results. The public HTML uses explicit indexing metadata, while the sitemap lists only the intended content pages.
