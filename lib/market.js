// Maps a user's chosen market onto the exchange codes tickers.exchange uses,
// so search/browse/watchlist queries can scope with a plain WHERE exchange = ANY(...).
// India spans two exchanges (NSE/BSE); US is NASDAQ only, per migration_add_exchange.sql.

export const EXCHANGES_BY_MARKET = {
  India: ['NSE', 'BSE'],
  US: ['NASDAQ'],
};

export const VALID_MARKETS = Object.keys(EXCHANGES_BY_MARKET);

export function exchangesForMarket(market) {
  const exchanges = EXCHANGES_BY_MARKET[market];
  if (!exchanges) {
    throw new Error(`Unknown preferred_market "${market}" (expected one of: ${VALID_MARKETS.join(', ')})`);
  }
  return exchanges;
}
