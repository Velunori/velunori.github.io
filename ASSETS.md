# Asset provenance

All images are local to this package. Pages make no requests to image CDNs, external fonts or analytics services.

| File | Source |
| --- | --- |
| `assets/mark.svg` | `lib/assets/brand/velunori-mark-lavender.svg` |
| `assets/mark-mint.svg`, `assets/mark-pearl.svg` | Matching accent variants from `lib/assets/brand/` |
| `assets/dusk.png` | `theme/backgrounds/velunori-dusk.png` |
| `assets/screens/appearance.png` | `bar/docs/settings-preview.png` |
| `assets/screens/<component>.png` | Native captures from each component's `scripts/check.sh`, with `VELUNORI_PREVIEW_PATH` and sample data |

The prism mark follows [the library's identity guidance](https://github.com/Velunori/lib/blob/main/docs/branding.md). Preserve its proportions and clear space.

Component previews were rendered with sample data, rather than taken from a user's private desktop. Every gallery frame uses the same local Dusk wallpaper. The images are native component captures, not the gradient-backed compositions in repository documentation. Serene is rendered with `VELUNORI_PREVIEW_BACKGROUND` pointing at the Dusk wallpaper; the theme preview uses its own Dusk-backed scene. Menu uses its root state, notifications use the toast preview, and update uses the running state. The theme image is a rendered design preview. The landing-page desktop combines the existing wallpaper, a CSS bar illustration, and the real appearance-panel preview; it is labeled as an illustration.

The original Dusk wallpaper was generated for the theme; see [the theme's prompt and notes](https://github.com/Velunori/theme/blob/master/docs/wallpaper-prompt.txt). Existing assets retain their source repositories' licenses and attribution. See `LICENSE` and each component's notices.

The website uses system sans-serif and serif fonts, with Georgia/Times New Roman and generic serif fallbacks. It does not redistribute font files.

## Search/social assets

`assets/social-card.png` is rendered from `scripts/social-card.html`, using the existing Dusk wallpaper and prism mark. PNG favicons/touch/browser icons are direct exports of the same existing vector mark. No new third-party image source or external font is used.
