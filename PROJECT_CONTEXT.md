# Pulse — Smart Market Watchlist (Groww Code 2026)

## What this is
A watchlist app that doesn't just show stock prices — it tells the user what's
*meaningfully changed* since they last checked, in plain language. Built for
Groww's Code 2026 hackathon (72-hour build, judged on engineering judgment
and trade-offs, not feature count).

## Stack
- Frontend: React
- Backend: Node.js + Express
- Database: PostgreSQL
- Optional: Redis cache in front of market_data for scale

## Core idea: "meaningful change"
Don't just show raw price deltas. A change is meaningful if:
1. Price moved beyond a threshold (e.g. ±2%) since the user's last visit
2. Volume is significantly higher than usual (e.g. 2x+ the last known volume)
Each flagged change should come with a plain-language reason, not just a
number — e.g. "TCS jumped 3% since you last checked" rather than "+3.0%".

## Database schema (see schema.sql in this folder)
Five tables, each with a specific job:
- `users` — minimal auth, just a username is enough for the hackathon
- `tickers` — reference data (ticker, company_name, sector) — powers
  search-by-name and browse-by-sector, since users are stock-market beginners
  and shouldn't need to know ticker symbols
- `watchlist_items` — which tickers each user tracks (user_id + ticker,
  unique together)
- `market_data` — latest price/volume per ticker, ONE ROW PER TICKER,
  shared across all users. This table's size depends on unique tickers
  tracked, not user count — that's the key scaling insight.
- `snapshots` — what each user last saw, per ticker (composite PK:
  user_id + ticker). This is what makes "what changed since you checked"
  possible — compare current market_data against the user's snapshot,
  show the diff, then overwrite the snapshot with current values.

## System flow
1. A worker polls a market data API on an interval, for the deduped set of
   tickers anyone is tracking (`SELECT DISTINCT ticker FROM watchlist_items`),
   and upserts into `market_data`.
2. When a user opens their watchlist, the backend joins `watchlist_items` +
   `tickers` + `market_data` for their tickers, compares against their
   `snapshots` row per ticker, runs the significance logic, returns what
   changed with plain-language reasons, and then updates their snapshot to
   current values.

## Build order (do NOT start with the frontend)
1. Database schema (done — see schema.sql)
2. Ingestion worker (poll API, upsert into market_data) — test standalone
   with fake/hardcoded tickers first
3. Significance/diff logic — pure function, unit-testable with fake data
   before any real data exists
4. Backend CRUD for watchlist_items (add/remove/list tickers per user)
5. The diff endpoint that ties 2+3+4 together
6. Frontend — watchlist view + a distinct "what changed" view (not just a
   table with numbers)
7. Staleness handling — show "as of" timestamps, never silently show stale
   data as fresh

## UX priorities (the differentiator, since users are beginners)
- Search by company name, not ticker symbol (resolve name -> ticker)
- Plain-language change summaries, not raw percentages
- Visual signals use icon + color together, never color alone
- Mobile-first — most beginners will try this on a phone
- Loading/empty/error states should feel considered, not blank or raw
- Auth can be minimal (username only) — explicitly a scoped-down trade-off,
  not a gap, and worth saying so in the README/pitch

## Submission requirements (don't forget)
- Source code (zip or git repo) + README with setup instructions
- A 100-word pitch: what was built, how, and the thinking behind key choices
- It has to actually run
