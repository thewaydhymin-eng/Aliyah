# Aliyah of the Day · The Way Derech Ha Yashar

Daily Aliyah (English and Afrikaans) for thewayderech.co.za, published with GitHub Pages.

## What is here

| Path | What it is |
|---|---|
| `data/` | One JSON file per Parashah (seven Aliyot each). This is the content. |
| `config.json` | `base` = the site's web address; `current` = the data file for this week's block. |
| `src/` | The daily block's design (`widget.css`, `widget.html`) and logic (`widget.js`). |
| `build.js` | Generates everything below from `data/` and `src/`. Run `node build.js`. |
| `aliyah.js` | Generated. The daily block used on GoDaddy (current week only). |
| `index.html` | Generated. Today's Aliyah page. |
| `<year>/<parashah>/<n>/` | Generated. One permanent page per Aliyah. |
| `archive/` | Generated. List of all Aliyot (future dates are hidden until their day). |
| `sitemap.xml`, `robots.txt` | Generated. For Google Search Console. |
| `assets/` | Logo and Aliyah image cards (`assets/cards/<year>-<parashah>-<n>.jpg`, used as the social-media preview). |

## GoDaddy code (paste once into an HTML section)

```html
<div id="tw-aliyah-root"></div>
<script src="https://thewaydhymin-eng.github.io/Aliyah/aliyah.js"></script>
```

## Each week

1. Add `data/<year>-<parashah>.json` with the seven Aliyot.
2. Point `current` in `config.json` to it.
3. Optionally add image cards to `assets/cards/`.
4. Run `node build.js`, commit and push.

## Own web address

When `aliyah.thewayderech.co.za` is connected (DNS CNAME to `thewaydhymin-eng.github.io` and the custom domain set under Settings → Pages), change `base` in `config.json` to `https://aliyah.thewayderech.co.za`, add a `CNAME` file containing that address, and rebuild.
