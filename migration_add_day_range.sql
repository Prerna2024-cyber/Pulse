-- Migration: store the day's opening reference and its high/low alongside the
-- latest price, so a watchlist row can show where the current price sits in
-- the day's range rather than just the number on its own. Run this AFTER
-- watchlist_schema.sql and the earlier migrations.
--
-- All four are nullable, for the same reason day_change is (see
-- migration_add_day_change.sql): a quote can arrive without them — before the
-- first print of the session, or when upstream simply omits a field. A missing
-- high must render as "unknown", never as 0. A stock is not trading at zero.
--
-- Both fetchers supply all four:
--   * Twelve Data /quote     -> open, previous_close, high, low (as strings)
--   * Indian Stock Market API /stock?symbol=  (NOT /stock/list, which omits
--     them entirely — see worker/indianStockApi.js) -> open, previous_close,
--     day_high, day_low (as numbers under res=num)
--
-- previous_close is stored even though the UI prefers `open` in the same slot:
-- it's the baseline day_change is measured against, it costs nothing to keep,
-- and it's what the row falls back to when a session hasn't opened yet.
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS day_open NUMERIC(12, 4);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS previous_close NUMERIC(12, 4);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS day_high NUMERIC(12, 4);
ALTER TABLE market_data ADD COLUMN IF NOT EXISTS day_low NUMERIC(12, 4);
