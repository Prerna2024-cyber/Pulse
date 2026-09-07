# Pulse

**Know what actually changed, not just what moved.**

Live: https://pulse-rouge-five.vercel.app

Most watchlists answer "what is this stock worth right now?" Pulse answers a
different question: *what has meaningfully changed since you last looked?*

That distinction drove every design decision below.

---

## The core idea

Market data is shared and overwritten on every poll. But every user carries
their own **snapshot** of what they last saw.

Opening What Changed diffs the current price against that personal snapshot,
flags only moves past a threshold — ±2% price or 2× the usual volume by
default, and each user can raise or lower that bar — and reports them in plain
language — *"Tata Consultancy Services jumped 3.0% since
you last checked"* — rather than as a row of numbers to interpret. Then it
advances the snapshot, so the next visit measures from that moment.

Two users checking the same stock at different times see different answers.
That's the point.

---

## Architecture

```
Browser ──► Frontend (Vercel)
                │
                ▼
            API (Railway) ──► Postgres (Railway)
                                   ▲
            Worker (Railway) ──────┘
                │
        ┌───────┴────────┐
        ▼                ▼
  Cloudflare Worker   Twelve Data
  (NSE/BSE)           (NASDAQ)
```

Four services. The **worker** runs independently of anyone using the app —
it keeps the database stocked so a page load reads what's already there
instead of waiting on an upstream API.

**Stack:** React + Vite, Node/Express, PostgreSQL, a self-hosted Cloudflare
Worker proxying Indian market data.

---

## Database design

Five tables, each with one job.

| Table | Holds | Grows with |
|---|---|---|
| `users` | username, preferred market | users |
| `tickers` | 213 companies, 27 sectors, exchange | catalog size |
| `watchlist_items` | who tracks what | users × their picks |
| `market_data` | latest price/OHL per ticker | **unique tickers only** |
| `snapshots` | what each user last saw | users × their picks |
| `price_history` | append-only price log | time × tracked tickers |

Three decisions worth naming:

**`market_data` holds one row per ticker, regardless of user count.** A stock
followed by a thousand users is still one row and one API call. This is the
piece that doesn't need redesigning as usage grows.

**`snapshots` uses a composite primary key `(user_id, ticker)`**, not a
surrogate id. That's what makes the `ON CONFLICT DO UPDATE` upsert clean —
exactly one row per user-per-ticker, so the table never grows from repeat
visits.

**Markets are separated logically, not physically.** India (NSE/BSE) and US
(NASDAQ) share one schema, distinguished by an `exchange` column and filtered
per user's `preferred_market`. Adding a third market means one more value, not
a duplicate set of tables. An India user never sees AAPL; a US user never sees
TCS — the separation happens in the `WHERE` clause.

---

## Backend

### Ingestion

The worker polls the **deduplicated set of tracked tickers**
(`SELECT DISTINCT ticker FROM watchlist_items`), not the catalog. Browsing all
213 companies costs nothing; a ticker only starts consuming quota once someone
tracks it.

Each market polls on its own interval, sized to its own constraint:

- **India** — every 60s, through a self-hosted Cloudflare Worker with no quota
- **US** — every 5 min, to stay inside Twelve Data's 800 credits/day

These were originally coupled to one loop, which meant India ran at the
US-safe cadence for no reason. Splitting them let each market run at the pace
its own limits allow.

### Market-hours polling

The worker doesn't poll a market that isn't trading. Polling a closed market
fetches the same frozen price repeatedly — it costs quota and returns nothing
new.

This started as a UI feature and became an ingestion optimisation:

| | Before | After |
|---|---|---|
| India | 8,640 req/day | 2,280 |
| US | 864 credits/day | 237 |

The poll window runs to **close + 5 minutes**, deliberately wider than the
UI's "open" state, so the final reading captures the settled closing price
rather than one from just before the bell. Both are asserted against the same
constant so they can't drift.

### Resilience

Most of this came from real failures during the build, not hypotheticals.

- **Fetch timeouts.** A missing timeout once hung the worker for five minutes
  with no error. Both data sources now abort after 15s.
- **Dropped database connections.** An idle connection dropped overnight and
  killed the process, because an unhandled `pool` error terminates Node. A
  pool-level handler now logs and recovers; the worker has since survived two
  full outages unattended and resumed on its own.
- **Process guards.** `unhandledRejection` and `uncaughtException` are caught
  and logged. Surviving an uncaught exception is normally wrong — but only
  because something is expected to restart you. `exitOnUncaught` is a flag:
  false when unsupervised, true on Railway.
- **Quota exhaustion degrades honestly.** Twelve Data returns HTTP 200 with an
  `Information` field when over quota rather than an error status, so the code
  checks for that explicitly instead of trusting `res.ok`. It logs, skips, and
  the UI's staleness warning does the rest.
- **Per-ticker isolation.** One bad symbol used to fail an entire batch and
  lose every quote in it. Fetches now succeed or fail individually.
- **Unstorable values are rejected before the write.** `Number.isFinite`
  isn't enough: `1e15` is finite and still overflows `NUMERIC(12,4)`, and
  Postgres *accepts* `NaN` and renders it as the literal string "NaN". Values
  are range-checked against the real column bounds. An unusable price drops
  that ticker; an out-of-range optional field is nulled, since `null` already
  means "unknown" everywhere else.
- **Environment variables are parsed, not coerced.** `setInterval(fn, NaN)`
  coerces to ~1ms — a typo in a poll interval would have hammered both
  upstream APIs and the database, measured at 86 fires in 100ms. Every numeric
  env var is now range-checked with a loud fallback.

### Honesty about data

The app never states something it can't verify.

- **Missing is not zero.** A stock with no day-change figure isn't "flat", it's
  unknown — the UI renders nothing rather than `0.00%`. (`Number(null)` is `0`,
  which is exactly how this class of bug gets shipped.)
- **Stale is visibly stale.** Prices older than 10 minutes show an amber
  timestamp with a warning icon. But staleness is **market-aware** — outside
  trading hours nothing is expected to be written, so no warning fires. Without
  that, the UI would contradict itself: one panel saying "the market is closed,
  this is normal" beside another saying "something is wrong".
- **Last session is labelled as such.** When the market is closed, O/H/L
  figures are from the previous session, and the UI says so — but only if the
  reading was genuinely taken at or after that day's bell. A worker that died
  at Friday lunchtime reports `2d ago`, because calling that "Friday's close"
  would be quietly wrong.
- **Open vs previous close.** Both are stored; the UI prefers `open` and
  relabels to `PC` when only the previous close is known. Printing yesterday's
  close under an "Open" heading would misinform.

### Testing

74 tests, Node's built-in runner, no extra dependencies.

The significance engine is a **pure function** — no database, no network — so
it was written and fully tested before any real data existed.

One test is worth calling out: the market schedule exists in two copies
(backend `lib/` and frontend `src/`, because Vite's dev server can't reach
outside its root, and widening `server.fs.allow` would expose `.env`). A drift
between them would show "Live" in the UI while the worker sat idle — a
contradiction with no error anywhere. The suite compares both copies across a
year of timestamps, ~28,000 comparisons, and fails on any disagreement.

---

## Beginner-first decisions

- **Search by company name, not ticker.** Typing "tata" finds TCS. A beginner
  knows the company, not the symbol.
- **Browse by sector.** 27 sectors across both markets.
- **Plain language over numbers.** The whole premise.
- **Icon plus colour, never colour alone.** Direction is carried by ▲/▼ and a
  signed percentage independently of red/green. Screen readers get the same
  information via visually-hidden text.
- **`prefers-reduced-motion` respected throughout.** Worth noting *how* one bug
  here was found: the reduced-motion rule was written in the right block but a
  later declaration won on file order, so the pulsing dot kept animating for
  exactly the users who'd asked it not to. Reading the CSS wouldn't have caught
  it; emulating the setting in a headless browser did.

---

## What it deliberately doesn't do

- **No charts.** A chart asks the user to interpret. Pulse's premise is that
  interpretation is the app's job. (`price_history` is being collected and the
  retention index exists — the groundwork is there, the chart isn't.)
- **No portfolio value.** It tracks watchlists, not holdings. There are no
  quantities or cost basis anywhere in the schema, so a "total value" would be
  a number with nothing behind it.
- **No buy/sell suggestions.** Detecting that something moved is a different
  question from whether it's worth buying. Conflating them would be both wrong
  and, in India, unregistered advice.
- **Minimal auth.** Username only, no password. This is a watchlist demo, not
  an account system — the effort went into the significance engine instead.
  A real deployment would need sessions; the API currently trusts a username
  in the path.

---

## Known limits

Named rather than hidden:

- **Trading holidays aren't handled.** The market-hours check is weekday plus
  time window, so a holiday incorrectly reports as open. Documented at the top
  of `marketHours.js`.
- **US ticker ceiling is 8.** Twelve Data's per-minute limit (8 credits) binds
  before the daily one. The architecture would scale with a paid key — the
  quota is the constraint, not the design.
- **Indian prices may differ slightly from official NSE figures.** The upstream
  source is Yahoo Finance-backed and can disagree with the exchange by small
  margins. Surfaced honestly rather than presented as more precise than it is.
- **`price_history` has no retention.** ~1.4 MB/day at current scale. Both
  indexes needed for pruning already exist; nothing prunes yet.
- **Search can't use its index.** `ILIKE '%q%'` has a leading wildcard, so it
  sequential-scans. Fine against a 213-row catalog, not fine at 10,000.

---

## Running locally

```bash
npm install
cd frontend && npm install && cd ..
```

`.env` in the repo root:

```
DATABASE_URL=postgresql://user:password@host:port/dbname
INDIAN_STOCK_API_BASE_URL=https://stock-api.prerna-pulse.workers.dev
TWELVE_DATA_API_KEY=your_key
```

A free Twelve Data key covers the US side. The Indian endpoint is already
deployed and needs no key.

Schema, in order:

```
watchlist_schema.sql
migration_add_exchange.sql
migration_add_day_change.sql
migration_add_price_history.sql
migration_add_day_range.sql
migration_add_thresholds.sql
seed_tickers_200.sql
```

The seed is idempotent — safe to re-run.

Three processes:

```bash
npm run server                # API on :3000
npm run worker                # ingestion loop
cd frontend && npm run dev    # UI on :5173
```

```bash
npm test                      # 145 tests
```

**Demoing outside market hours:** the worker only polls while a market is open,
so a newly added ticker won't get a price until the next session. Set
`IGNORE_MARKET_HOURS=true` to force polling. Similarly, What Changed only flags
moves past the thresholds that user is on — with markets closed it will
correctly report that nothing changed. Nudge a tracked price in `market_data`
past their `price_threshold_percent` (2% by default) to see it fire, or drop
the bar from the What Changed panel's **Adjust** control.

---

## Scoped for later

- **A bilingual explainer** — the plain-language principle applied to
  terminology, so a first-time investor can ask what "volume" means in English
  or Hindi without leaving the app.
- **News.** Answering *why* something moved, not just that it did.
- **Sparklines**, once enough history has accumulated.

None were built. Shipping a working core mattered more than finishing three
more features partially.
