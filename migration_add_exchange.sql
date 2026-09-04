-- Migration: add multi-market support to an already-created tickers table
-- Run this AFTER schema.sql, since the tables already exist in Railway

ALTER TABLE tickers ADD COLUMN exchange VARCHAR(10) NOT NULL DEFAULT 'NSE';

-- speeds up "show me only Indian stocks" / "show me only US stocks" filtering
CREATE INDEX idx_tickers_exchange ON tickers (exchange);

-- example seed rows showing both markets (adjust/expand as needed)
-- INSERT INTO tickers (ticker, company_name, sector, exchange) VALUES
--   ('TCS', 'Tata Consultancy Services', 'IT', 'NSE'),
--   ('RELIANCE', 'Reliance Industries', 'Energy', 'NSE'),
--   ('AAPL', 'Apple Inc.', 'Technology', 'NASDAQ'),
--   ('TSLA', 'Tesla Inc.', 'Automotive', 'NASDAQ');

-- users pick one market on first login; every ticker search/browse/watchlist
-- action gets filtered to that market, so India and US users never see
-- each other's tickers, without needing separate databases
ALTER TABLE users ADD COLUMN preferred_market VARCHAR(10) NOT NULL DEFAULT 'India';
-- valid values: 'India' (maps to exchange IN ('NSE','BSE'))
--               'US'    (maps to exchange = 'NASDAQ')
