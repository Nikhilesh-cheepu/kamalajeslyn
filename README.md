# Repudi Kamala Jeslyn — Portfolio

A colourful one-page portfolio for graphic design work: flyers, web design, client projects, and hobby pieces.

## Preview locally

Open `index.html` in your browser, or run a simple server:

```bash
cd /Users/nikhilesh/Desktop/kamalajeslyn
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Add your flyers

1. Copy **all** images into **`public/flyers/`** (unordered is fine).
2. Run:
   ```bash
   npm run scan-flyers
   ```
3. Refresh the site — each poster uses its real width/height ratio on the grid.

Optional rename when you know the type: `client-bakery.jpg`, `hobby-party.png`. See `public/flyers/README.md`.

## Customise

- **Email:** Edit `CONTACT_EMAIL` in `script.js`.
- **Colours:** Change CSS variables at the top of `styles.css` (`--accent-1`, etc.).
- **Copy:** Update text in `index.html` (about, services, hero).

## PDF later

The site includes basic `@media print` styles. For a portfolio PDF you can:

- Print to PDF from the browser (Chrome → Print → Save as PDF), or
- Use a tool like Puppeteer / Playwright to export the page once your images are in place.

Share your files in chat when ready and they can be wired into the gallery for you.
