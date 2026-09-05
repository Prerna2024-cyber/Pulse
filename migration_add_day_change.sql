-- Migration: store the day's change alongside the latest price, so the
-- watchlist can colour a price (green up / red down) without inventing a
-- baseline. Run this AFTER schema.sql and migration_add_exchange.sql, since
-- the tables already exist in Railway.
--
-- Both upstream APIs already return these per quote and we were discarding
-- them: the Indian Stock Market API sends `change`/`percent_change` as numbers
-- (res=num), Twelve Data sends the same two fields as strings.
--
-- Nullable on purpose: a quote can arrive with no usable change figure (market
-- hasn't printed yet, or upstream omits it). A missing change has to render as
-- "no colour", never as a misleading flat 0.00%.
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS day_change NUMERIC(12, 4);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS day_change_percent NUMERIC(8, 4);
