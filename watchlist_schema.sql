-- users
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- tickers: static reference/catalog data, powers search & browse
-- this is what makes "search by company name" and "browse by sector" possible
CREATE TABLE tickers (
    ticker VARCHAR(15) PRIMARY KEY,
    company_name VARCHAR(120) NOT NULL,
    sector VARCHAR(50)
);

-- speeds up ILIKE '%name%' search and exact sector filtering
CREATE INDEX idx_tickers_company_name ON tickers (company_name);
CREATE INDEX idx_tickers_sector ON tickers (sector);

-- watchlist_items: which tickers a user is tracking
CREATE TABLE watchlist_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(15) NOT NULL REFERENCES tickers(ticker),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, ticker)
);

-- speeds up the worker's "which tickers does anyone care about" query
-- and doubles as the "trending" query (most-added tickers)
CREATE INDEX idx_watchlist_ticker ON watchlist_items (ticker);

-- market_data: latest known value per ticker, shared across all users
-- row count stays bounded by unique tickers, NOT user count
CREATE TABLE market_data (
    ticker VARCHAR(15) PRIMARY KEY REFERENCES tickers(ticker),
    price NUMERIC(12, 4) NOT NULL,
    volume BIGINT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL
);

-- snapshots: what each user last saw, per ticker
-- composite PK doubles as the index used for both lookups and upserts
CREATE TABLE snapshots (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticker VARCHAR(15) NOT NULL REFERENCES tickers(ticker),
    price NUMERIC(12, 4) NOT NULL,
    volume BIGINT NOT NULL,
    seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, ticker)
);

-- ================================
-- Example queries this schema is built to support
-- ================================

-- 1. Search by company name (beginner-friendly search)
SELECT ticker, company_name, sector
FROM tickers
WHERE company_name ILIKE '%' || $1 || '%'
LIMIT 10;

-- 2. Browse by sector
SELECT ticker, company_name
FROM tickers
WHERE sector = $1;

-- 3. Trending / most-watched tickers
SELECT ticker, COUNT(*) AS watcher_count
FROM watchlist_items
GROUP BY ticker
ORDER BY watcher_count DESC
LIMIT 10;

-- 4. Worker: get every ticker being tracked by anyone, deduped
SELECT DISTINCT ticker FROM watchlist_items;

-- 5. Backend: get one user's watchlist joined with live prices + names
SELECT w.ticker, t.company_name, m.price, m.volume, m.fetched_at
FROM watchlist_items w
JOIN tickers t ON t.ticker = w.ticker
JOIN market_data m ON m.ticker = w.ticker
WHERE w.user_id = $1;

-- 6. Backend: upsert a user's snapshot after they view their watchlist
INSERT INTO snapshots (user_id, ticker, price, volume, seen_at)
VALUES ($1, $2, $3, $4, now())
ON CONFLICT (user_id, ticker)
DO UPDATE SET price = EXCLUDED.price,
              volume = EXCLUDED.volume,
              seen_at = EXCLUDED.seen_at;
