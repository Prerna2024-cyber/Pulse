-- Migration: let each user set what "significant" means for them, instead of
-- everyone sharing the two constants in lib/significance.js. Run this AFTER
-- watchlist_schema.sql and the earlier migrations.
--
-- NOT NULL with a default equal to the old hardcoded values, so every existing
-- row keeps the behaviour it already had and the diff endpoint never has to
-- handle a missing threshold. That's the whole point of defaulting rather than
-- allowing NULL: a nullable column would push a "which threshold applies here"
-- decision into every read.
--
-- NUMERIC(5, 2) because a percentage wants a decimal place (1.5% is a
-- reasonable setting) and floats would make 2.00 store as 1.9999999. The
-- accepted range is enforced in lib/thresholds.js, not by a CHECK constraint,
-- so the API can return an explanation rather than a database error — but the
-- precision is a storage fact and belongs here.
ALTER TABLE users ADD COLUMN IF NOT EXISTS price_threshold_percent NUMERIC(5, 2) NOT NULL DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS volume_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 2;
