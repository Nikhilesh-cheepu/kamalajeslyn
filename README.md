# Repudi Kamala Jeslyn — Portfolio

A colourful one-page portfolio for graphic design work. **All flyer images live in Vercel Blob** — there is no local `public/flyers/` folder.

## Run locally (full stack)

```bash
npm install
npm run dev:vercel
```

Open **http://localhost:3000** (port may vary). Use **Node 20** (`nvm use` reads `.nvmrc`).

- Public site: `/`
- Admin upload: `/admin` (password from `ADMIN_PASSWORD` in `.env.local`)

Copy `.env.example` → `.env.local` and set `BLOB_READ_WRITE_TOKEN` and `ADMIN_PASSWORD` for local uploads.

Do **not** use `python3 -m http.server` — the gallery and admin need API routes.

## Deploy on Vercel

`index.html` is in the **project root** (not inside `public/`).

In Vercel → Project → **Settings** → **General**:

| Setting | Value |
|---------|--------|
| Framework Preset | **Other** |
| Root Directory | *(leave empty)* |
| Build Command | *(leave empty)* |
| Output Directory | *(leave empty)* — **not** `public` |

Then **Redeploy**. Site URL example: `https://kamalajeslyn.vercel.app`.

If you see **404 NOT_FOUND**, clear Output Directory (must not be `public`) and redeploy.

## Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Read/write flyers in Vercel Blob |
| `BLOB_STORE_ID` | From Vercel Blob dashboard |
| `ADMIN_PASSWORD` | Admin login (e.g. `9550`) |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Optional |

Redeploy after adding or changing variables.

## Admin panel

Open **`/admin`** on your live or local site.

- Log in with password only (no username)
- **Upload** — select or drop **multiple images**; one batch upload, auto-sorted into **4∶5** or **9∶16**
- **Drag** to reorder within each ratio
- **Delete** with × on each thumbnail

The public site loads images from Vercel Blob via `GET /api/flyers`.

## Customise

- **Email:** `CONTACT_EMAIL` in `script.js`
- **Colours:** CSS variables in `styles.css`
- **Copy:** `index.html`
