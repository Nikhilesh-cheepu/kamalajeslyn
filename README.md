# Repudi Kamala Jeslyn — Portfolio

A colourful one-page portfolio for graphic design work: flyers, web design, client projects, and hobby pieces.

## Preview locally

Open `index.html` in your browser, or run a simple server:

```bash
cd /Users/nikhilesh/Desktop/kamalajeslyn
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).

## Deploy on Vercel

`index.html` is in the **project root** (not inside `public/`).

In Vercel → Project → **Settings** → **General**:

| Setting | Value |
|---------|--------|
| Framework Preset | **Other** |
| Root Directory | *(leave empty)* |
| Build Command | *(leave empty)* |
| Output Directory | *(leave empty)* — **not** `public` |

Then **Redeploy** the latest commit. Your site URL will be something like `https://kamalajeslyn.vercel.app`.

If you see **404 NOT_FOUND**, the Output Directory is almost always set to `public` by mistake — clear it and redeploy.

## Environment variables (Vercel)

In Vercel → Settings → Environment Variables, add:

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Upload & store flyers |
| `BLOB_STORE_ID` | From Vercel Blob dashboard |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Optional webhook key |
| `ADMIN_PASSWORD` | Admin login (`9550` or your own) |

Redeploy after adding variables.

## Admin panel

Open **`/admin`** on your live site (e.g. `https://your-site.vercel.app/admin`).

- Log in with your password only (no username)
- **Upload** — images auto-sort into **4∶5** or **9∶16**
- **Drag** to reorder within each ratio
- **Delete** with × on each thumbnail

The public site loads flyers from Vercel Blob via `/api/flyers`.

### Migrate existing local flyers to Blob

```bash
export BLOB_READ_WRITE_TOKEN=your_token
npm run migrate-blob
```

## Add your flyers (legacy local)

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
