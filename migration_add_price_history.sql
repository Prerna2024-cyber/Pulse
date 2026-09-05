-- Migration: append-only price history.
--
-- market_data holds exactly one row per ticker — the latest reading, shared by
-- every user. That's the right shape for "what is it now", but it means there
-- is no series behind a ticker, which is why the dashboard's watchlist table
-- has no sparkline column. This table is that series.
--
-- Append-only on purpose: rows are never updated or deleted by the worker, so
-- a reading is a fact about a moment rather than a value that can be revised.
--
-- Run this AFTER schema.sql. Safe to re-run.
CREATE TABLE IF NOT EXISTS price_history (
    -- A surrogate key rather than (ticker, recorded_at): two writes landing in
    -- the same instant would collide on a composite key and fail the poll,
    -- and an append-only log has no reason to reject a duplicate moment.
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(15) NOT NULL REFERENCES tickers(ticker),
    price NUMERIC(12, 4) NOT NULL,
    volume BIGINT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL
);

-- The read this table exists for: "the last N points for one ticker, newest
-- first". Leading with ticker also serves any ticker + time-range query.
CREATE INDEX IF NOT EXISTS idx_price_history_ticker_recorded
    ON price_history (ticker, recorded_at DESC);

-- Time-only, for retention work — "delete everything older than N days" can't
-- use the composite index above, since that one leads with ticker. This table
-- grows on every poll forever, so pruning will eventually be needed.
CREATE INDEX IF NOT EXISTS idx_price_history_recorded
    ON price_history (recorded_at);
