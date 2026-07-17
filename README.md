# Elleva — Proforma Quotation Generator

A Next.js + Tailwind CSS website that replicates the Elleva proforma-quotation
document as a fillable web form. On submit it:

1. Generates a **pixel-matching PDF** of the filled document and downloads it.
2. Sends the data + PDF to a **Google Apps Script** backend, which saves the
   PDF in Google Drive and logs a row (name, firm, quotation no., total, PDF
   link) in a **Google Sheet**.
3. **Clears the form** so the next quotation starts fresh.

## 1. Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the form should look and behave like the target
design, with the Elleva logo in the header.

> Note: this project was scaffolded in a sandboxed build environment that
> couldn't run `next dev`/`next build` itself (a native-binary/Turbopack
> issue specific to that sandbox — `npx tsc --noEmit` passed with zero
> errors). It should run normally on your machine; if `next build` ever
> complains about Turbopack, run `next build --no-turbopack` as a fallback.

## 2. Connect the Google Sheet + Drive backend

1. Create a new Google Sheet (or open an existing one).
2. **Extensions → Apps Script**, delete the placeholder code, and paste in
   the contents of [`apps-script/Code.gs`](./apps-script/Code.gs).
3. In the Apps Script editor, run the `setup` function once (top dropdown →
   `setup` → ▶ Run). Approve the permissions prompt. This creates the
   `Quotations` sheet tab and an `Elleva Quotations` folder in your Drive.
4. **Deploy → New deployment → type: Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**, then copy the Web app URL (ends in `/exec`).
5. In the project, copy `.env.local.example` to `.env.local` and paste the
   URL in as `APPS_SCRIPT_URL`:

   ```bash
   cp .env.local.example .env.local
   # then edit .env.local and set APPS_SCRIPT_URL=<your deployed URL>
   ```

   This keeps the URL on the **server only** — it's read by the
   `/api/submit-quotation` route (`app/api/submit-quotation/route.ts`) and is
   never sent to the browser or stored client-side. Restart `npm run dev`
   after adding it.

When deploying (Netlify/Vercel/etc.), set `APPS_SCRIPT_URL` as an
environment variable in the host's dashboard rather than committing
`.env.local`.

Now every submission saves the PDF to that Drive folder and appends a row to
the `Quotations` sheet with a link to the PDF.

## 3. Product rows

The table ships with 5 rows (matching the original design) — let me know if
you'd like an "Add row" button instead of a fixed count.

## 4. Deploy the site

Any static/Node host works (Netlify, Vercel, etc.):

```bash
npm run build
npm run start
```

For Netlify: connect the repo, build command `npm run build` — the Next.js
Netlify plugin handles the rest automatically.

## Project structure

```
app/
  layout.tsx         — fonts + page shell
  page.tsx            — renders the form
  globals.css         — design tokens (navy/gold palette, field styles)
components/
  QuotationForm.tsx   — the entire form, PDF export, submit logic
lib/
  numberToWords.ts     — ₹ amount → words (Indian numbering)
apps-script/
  Code.gs              — paste into Google Apps Script (Drive + Sheet backend)
public/images/
  elleva-logo.jpeg     — your logo, used in the header
```

## Notes / things you may want to tweak

- **GST default** on each row is pre-filled at 5% — change per row as needed.
- **Freight** in the totals box is a manual ₹ entry (separate from the
  "Freight" text field under Commercial Terms, which is for a description
  like "Extra as per actuals").
- **QR code**: enter a UPI ID in Bank Details to generate a scan-to-pay QR
  automatically (amount is filled in live from the Grand Total).
- **Buyer signature / stamp**: signature is a typed field (styled in a
  script font); the stamp box is left blank for physical/printed stamping.
