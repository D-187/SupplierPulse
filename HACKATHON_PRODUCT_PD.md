# Supplier Health Score — Hackathon Product PD

**Format note:** This is deliberately leaner than a full enterprise PRD — scoped so every requirement below is buildable in a hackathon timeframe, and no requirement exists "for completeness" without earning its place. Anything not listed as Core is explicitly Stretch or Out of scope, on purpose.

---

## 1. One-paragraph pitch

Suppliers upload their performance data as a spreadsheet. The app scores each supplier across four categories (financial reliability, operations, quality, compliance), gives them a health tier, and routes them to either "eligible for a financial product" or "needs coaching support" — with a live-adjustable scoring model so judges can see the logic work, not just a static result.

---

## 2. Core features (must build — this is the demo)

| # | Feature | What "done" looks like |
|---|---|---|
| 1 | **Excel upload** | User uploads the supplier data template; a backend endpoint parses and validates it; bad files return a specific error list, not a crash |
| 2 | **Scoring engine** | Pure, testable functions compute 4 weighted category sub-scores → 1 overall score → tier (Healthy / Watch / At-risk) |
| 3 | **Dashboard** | Table of all uploaded suppliers, tier badge, sortable/filterable |
| 4 | **Supplier detail view** | Category breakdown, weakest metric called out, routing outcome shown plainly |
| 5 | **Live weight admin panel** | Sliders for the 4 category weights; tiers recompute instantly — this is the single highest-impact demo moment, prioritize it |
| 6 | **Rule-based coaching message** | For Watch/At-risk suppliers, a scripted (not LLM-generated) message naming their weakest metric |

---

## 3. Stretch features (only after Core is fully working)

| # | Feature | Why it's stretch, not core |
|---|---|---|
| 1 | **New-supplier cold-start handling** (a supplier with no financial history gets scored on Operations/Quality/Compliance only) | Real, defensible product thinking — but it's an extra code path and extra test data; add only once Core is demo-stable |
| 2 | **Starter-eligible gate** (growth + unique-buyer + quality checks for new suppliers, gating a small credit product) | The most interesting idea in this project, but the most code — a good "if we had one more day" answer in Q&A even if unbuilt |

Do not start either stretch item until every Core feature works end-to-end on the actual upload file. A demo with 6 solid features beats a demo with 8 half-working ones.

---

## 4. Proposed tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | One codebase, real backend endpoint via Route Handlers, fast to demo locally and to deploy |
| Styling | Tailwind CSS | Fast, no design system overhead needed for a hackathon |
| Charts | Recharts | Simple trend/breakdown visuals, minimal setup |
| Excel parsing | `xlsx` (SheetJS) | Standard, well-documented, runs server-side in the Route Handler |
| Database | **Postgres, hosted on Supabase** | Real persistence, reachable from a deployed live link (not just your laptop) — free tier is plenty for a hackathon dataset size |
| ORM / DB access | **Prisma** | Type-safe queries that match the `Supplier` / `MetricSnapshot` types already defined in the build spec; works cleanly with a Supabase connection string |
| State | React Context (client-side) over data fetched from the DB via API routes | Scoring still recomputes live in the browser (Section 2, feature 5) — the DB just means that data survives a refresh and a redeploy |
| Deployment | Vercel | Pairs naturally with Next.js; one command to get a live URL for judges |

This is a proposal, not a decision — confirm or swap before we lock it in and start the build.

**What changes now that there's a real DB, concretely:**
- On a successful upload, the parsed `Supplier[]` and `MetricSnapshot[]` rows are written to Postgres, not just held in browser memory.
- The dashboard, detail, and admin pages read from the DB (via small API routes) instead of from upload-response JSON sitting in Context — so refreshing the page, or judges opening the deployed link fresh, still shows the data.
- **Single shared dataset, on purpose:** there's no per-user login, so a new upload replaces the current dataset rather than creating per-user history. That's a deliberate hackathon-scope simplification, not an oversight — call it out if a judge asks.
- You'll need a `.env.local` file holding the Supabase connection string — this is a secret, never commit it to a public GitHub repo (a common hackathon mistake that's easy to avoid).

---

## 5. End-to-end requirements (acceptance criteria)

- `npm run dev` boots cleanly; app opens on an upload screen when the database is empty.
- Uploading the real template file populates the dashboard from that file's contents, and **writes it to Postgres** — not just to in-memory state.
- Refreshing the page, or reopening the deployed URL later, still shows the uploaded data (this is the concrete proof the DB is actually working, not just present in the stack).
- Uploading a broken file shows specific, readable errors and writes nothing to the database.
- Every supplier on the dashboard has a working detail page.
- Moving a weight slider on the admin panel visibly changes tier counts, live, no reload (this recompute stays client-side against data already fetched — it should not re-query the DB on every slider tick).
- At least one Watch/At-risk supplier shows a coaching message tied to their actual weakest metric.
- The app runs successfully once deployed to Vercel with the Supabase connection string set as an environment variable, not hardcoded.
- No console errors during a full click-through of every screen.

---

## 6. Explicitly out of scope (say this out loud to judges, don't apologize for it)

- Authentication or multi-user accounts — one shared dataset, no login, by design (see Section 4's note on this).
- Multiple historical uploads / versioning — a new upload replaces the current dataset rather than being kept as history.
- Any real integration with a financial underwriting system.
- Real LLM/bot infrastructure — coaching messages are scripted templates.
- Anything beyond `.xlsx` upload — one file, one format, on purpose.

---

## 7. Repository and GitHub constraints

You'll be pushing this to GitHub, so the build needs to respect GitHub's real limits, not just work locally. GitHub hard-blocks any single file over 100MB, and starts warning at 50MB; repos are recommended to stay well under 1GB total. For this project specifically:

- **`.gitignore` must exclude, from the very first commit:** `node_modules/`, `.next/`, `.env`, `.env.local`, and any other env file holding the Supabase connection string. These are the two things that blow up repo size and leak secrets, respectively — `node_modules` alone is routinely hundreds of MB and is never supposed to be committed; it's regenerated by `npm install` on any machine from `package.json`.
- **No secrets in the repo, ever.** The Supabase connection string goes in `.env.local` (gitignored locally) and in Vercel's environment variable settings for the deployed version — never hardcoded in a committed file. If this accidentally gets committed once, rotating the Supabase credentials is safer than trying to scrub git history under hackathon time pressure.
- **Keep the sample/test Excel file small.** The template we built (a few dozen rows) is fine — don't let a "more realistic" test file balloon into hundreds of suppliers with many periods just for testing; it adds nothing to the demo and adds repo weight.
- **No demo video/GIF committed to the repo.** If your hackathon submission wants a demo video, host it externally (Loom, YouTube, unlisted is fine) and link it from the README — video files are exactly the kind of asset that quietly hits the 100MB wall.
- **No committed build output.** `.next/` (Next.js's build folder) is regenerated on every build and should never be committed — this is covered by the `.gitignore` line above, but worth understanding *why*: committing it doubles your repo size for zero benefit, since Vercel rebuilds it fresh on deploy anyway.

Practical rule of thumb: if a file was generated by running a command (`npm install`, `npm run build`) rather than written by a person or Claude Code, it almost certainly shouldn't be committed.

---

## 8. Next step

Confirm this scope (Core list especially — cut or add anything here before we move on). Once confirmed: lock the tech stack in Section 4, then hand this file to Claude Code to start the build.
