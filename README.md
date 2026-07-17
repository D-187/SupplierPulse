# SupplierPulse — Supplier Health Score

**Live demo:** https://supplierpulse-six.vercel.app

Suppliers upload their performance data as a spreadsheet. The app scores each supplier across
four categories (financial reliability, operations, quality, compliance), gives them a health
tier, and routes them to either "eligible for a financial product" or "needs coaching support" —
with a live-adjustable scoring model so you can see the logic work, not just a static result.

## Features

- **Excel upload** — parses and validates the supplier data template server-side; a broken file
  returns specific, readable errors and writes nothing to the database.
- **Scoring engine** — pure, tested functions compute 4 weighted category sub-scores → 1 overall
  score → tier (Healthy / Watch / At-risk). See [`src/lib/scoring.ts`](src/lib/scoring.ts).
- **Dashboard** — sortable/filterable supplier table, tier badges, at-a-glance stats, and a
  "needs attention" rail for anyone flagged for coaching.
- **Supplier detail view** — category breakdown against tier thresholds, comparison to the
  dataset average, ranked weakest metrics, and a plainly-shown routing outcome.
- **Live weight admin panel** — drag the four category-weight sliders and every tier recomputes
  instantly, client-side, against data already loaded (no re-fetch).
- **Rule-based coaching message** — a scripted message naming the actual weakest metric for any
  Watch/At-risk supplier.
- **Interactive tour guide** — a guided walkthrough of each page's key features, built on
  [driver.js](https://driverjs.com).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Excel parsing | SheetJS (`xlsx`, patched CDN build — the npm release has unpatched CVEs) |
| Database | Postgres on Supabase |
| ORM | Prisma |
| Deployment | Vercel |

## Getting started

```bash
npm install
```

Create `.env.local` with your Supabase connection strings:

```bash
DATABASE_URL="postgresql://<pooler-connection>?pgbouncer=true"
DIRECT_URL="postgresql://<direct-or-session-pooler-connection>"
```

Push the schema and run the dev server:

```bash
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — with an empty database it opens straight
on the upload screen. Upload [`sample-data/supplier-template.xlsx`](sample-data/supplier-template.xlsx)
(24 example suppliers, mixed tiers) to see the full app populated.

### Other scripts

```bash
npm test    # scoring engine + upload validation unit tests (vitest)
npm run lint
npm run build
```

## Supplier upload format

`.xlsx` only, first sheet, header row with these exact column names (case-insensitive):

`supplierName`, `revenueGrowthRate`, `paymentDelinquencyRate`, `cashFlowStabilityScore`,
`onTimeDeliveryRate`, `orderFulfillmentRate`, `avgLeadTimeDays`, `defectRate`,
`customerReturnRate`, `customerRatingAvg`, `documentationComplianceRate`,
`regulatoryViolationsCount`, `certificationValidity`

One row per supplier. A new upload replaces the entire dataset. See
[`src/lib/uploadValidation.ts`](src/lib/uploadValidation.ts) for the exact validation rules and
[`src/lib/scoring.ts`](src/lib/scoring.ts) for each metric's valid range and scoring direction.

## Explicitly out of scope

- Authentication or multi-user accounts — one shared dataset, no login, by design.
- Multiple historical uploads / versioning — a new upload replaces the current dataset rather
  than being kept as history.
- Any real integration with a financial underwriting system.
- Real LLM/bot infrastructure — coaching messages are scripted templates.
- Anything beyond `.xlsx` upload — one file, one format, on purpose.
- **Stretch, not built:** new-supplier cold-start handling and a starter-eligible credit gate —
  see [`HACKATHON_PRODUCT_PD.md`](HACKATHON_PRODUCT_PD.md) for what these would involve.
