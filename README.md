# Velunori — Dusk website

The static website for the Velunori desktop suite, published with GitHub Pages at <https://velunori.github.io/>.

## Review locally

Open `index.html` directly in a browser. Local images, navigation, layout/accent controls, gallery, installation choices, FAQ and guide work without a server. Clipboard access depends on browser permissions; the copy buttons include a fallback and an explicit failure message.

For an HTTP preview, from this directory:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/`. Stop the server with Ctrl+C. No dependencies or build command are required.

## Included

- `index.html`: full Dusk landing page, interactive bar illustration, eight screenshot views, nine-component overview, installation configurator, FAQ and community links.
- `guide.html`: requirements, installation, first steps, calendars, updates, recovery, troubleshooting and support.
- `404.html`: custom error page.
- `styles.css` and `app.js`: responsive styles and progressive enhancements. Native buttons, keyboard-operated gallery tabs, a modal image viewer, reduced-motion support, a mobile navigation menu and copy controls.
- `assets/`: the existing prism mark, Dusk wallpaper and all product screenshots, stored locally. See `ASSETS.md`.
- `robots.txt`, `sitemap.xml`, canonical URLs and social metadata targeting the `https://velunori.github.io/` address.
- `.nojekyll`: makes the static package suitable for branch-based GitHub Pages hosting.
- `scripts/`: dependency-free source/SEO checks, browser QA, social-card source and ZIP packaging.
- `SEO.md`: implemented metadata and the post-publication verification plan; `site.webmanifest` and local icons support browser identity.

The Guided installation flow offers the full suite or individual components and includes the shared library automatically. Selection is retained in this tab’s session storage; a `?components=clock,control-center&cloud=1` URL can also select components. Unknown component names are ignored. The downloaded script resolves dependencies again, independently of the page. No analytics, tracking scripts, external fonts, network APIs or account system are included. The website displays commands; it never executes them or changes the user's desktop.

JavaScript enhances the site. Without it, the main content, guide, default calendar preview, full installation commands and native FAQ remain available. Component repositories are always linked. The interactive gallery, configurator, copy controls and modal viewer require JavaScript.

## Validate

```bash
python3 scripts/check.py
node --check app.js
```

Optional browser QA requires Node.js 22+ (built-in WebSocket) and an existing Chromium installation; no npm packages are required:

```bash
node scripts/browser-check.mjs
```

Set `CHROME_BIN` to choose another Chromium executable. The browser check uses a disposable profile and only visits the local website. It checks direct file opening, navigation, gallery controls, image loading, install/update command options, clipboard feedback, small-screen overflow, no-JavaScript fallback, and captures review screenshots under `docs/`. It does not install Velunori, contact calendar providers, lock the desktop, update the system or publish a website.

## GitHub Actions checks

[`.github/workflows/website-checks.yml`](.github/workflows/website-checks.yml) runs for pull requests, pushes to `main`, and manual dispatch. It checks HTML structure, assets, anchors, metadata and ARIA references; JavaScript syntax; gallery and keyboard controls; installation options; clipboard feedback; no-JavaScript content; and desktop/mobile layouts. Browser QA fails on page errors or unexpected third-party runtime requests.

The job uses Ubuntu 24.04, Python 3.12, Node.js 24 and the runner's preinstalled Chrome/Chromium. No npm dependencies or system package installation are needed. The official [runner software inventory](https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md) lists the available browsers. Action revisions are pinned; [Dependabot](.github/dependabot.yml) proposes monthly GitHub Actions updates.

A successful run saves `website-screenshots` and `velunori-dusk-website` artifacts for 14 days. Partial screenshots are also retained after a failed check when available. Download and unzip the website artifact to review the same portable package produced locally. A failed check prevents the website package from being uploaded.

This workflow requests only `contents: read`, does not retain checkout credentials, and has no deployment steps. It does not enable Pages or alter an existing Pages publishing configuration. If branch-based Pages hosting is enabled later, its deployment is separate from this check workflow; passing this job alone is not a deployment gate. Configure a repository ruleset requiring **Structure, browser and package** before merging to `main` if you want checks to gate changes to that publishing branch.

## Installer payload

`install.sh` and `downloads/velunori-<version>.sh` are self-contained installers built by [`Velunori/velunori`](https://github.com/Velunori/velunori) from its pinned submodules. They contain runtime source files and licenses, validate their embedded payload and inventory, and require explicit terminal confirmation before installation. No repositories are fetched. Optional calendar libraries are downloaded only with `--cloud`.

The generated command is `curl -fsSL https://velunori.github.io/install.sh | bash -s -- --all` for the full suite, or the matching component arguments. Without flags the script asks for a selection through the terminal. The installer integration tests use a stand-in host and temporary homes; they are not a live desktop installation.

Rebuild after moving the bundle's pins, from a checkout of `velunori` next to this repository:

```bash
python3 velunori/installer/build.py --site-dir velunori.github.io
```

The builder stages the versioned script, the root `install.sh` copy and matching checksum files, and updates download links in the pages. It never publishes.

## Package

```bash
python3 scripts/package.py
```

Creates `dist/velunori-dusk-website.zip`, including source, assets, documentation and checks. The package excludes Git metadata, caches, previous archives and local review screenshots. Unzip it, then open `index.html` inside its `velunori-dusk-website` folder.

## GitHub Pages hosting

This repository is the organization site **`Velunori/velunori.github.io`**. In **Settings → Pages**, choose **Deploy from a branch** and select **main / (root)**. `.nojekyll` disables Jekyll processing; a push to `main` redeploys the site. After deployment, verify the public URL, navigation, images, the `install.sh` download and its checksum over HTTPS.

If you move to a custom domain, update canonical/social URLs, `sitemap.xml`, `robots.txt`, the root-relative home link in `404.html`, and the install command. Ordinary page assets and navigation are relative, so local and subdirectory previews work.

## Maintain content

The download is built from `Velunori/velunori/installer/engine.py` and `installer/catalog.json`. Its supported actions are `plan`, `check`, `install` and `status`; selection uses `--all` or `--components`, with optional `--cloud`. Keep generated commands and compatibility notes aligned with the engine. In-place upgrades and managed removal are not implemented yet. Calendar support and limitations follow the clock README. Component screenshots come directly from each component's preview check; the website gives all eight gallery views the same Dusk wallpaper frame. Do not copy the gradient-backed `docs/preview.png` compositions into the site, and do not present sample renders as live account or desktop verification. See `ASSETS.md` for capture states.

Change shared colors and type in `styles.css`. The layout preview's accent affects only the illustrative bar; it does not recolor the real settings screenshot or apply desktop settings. Add gallery panels in HTML and maintain matching tab IDs and `aria-controls`.

Contribution and community guidelines are shared through [Velunori/.github](https://github.com/Velunori/.github). MIT license; original asset notices remain in their source repositories.
