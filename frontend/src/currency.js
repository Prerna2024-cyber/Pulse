// One source for which symbol a price carries, so the app shell (which knows
// the signed-in user's market) and the landing ticker (which knows only an
// exchange, since nobody has signed in yet) can't drift apart.
//
// Exchange -> market mirrors EXCHANGES_BY_MARKET in lib/market.js, duplicated
// rather than imported because frontend/ is its own package.
const SYMBOL_BY_MARKET = { India: '₹', US: '$' };
const MARKET_BY_EXCHANGE = { NSE: 'India', BSE: 'India', NASDAQ: 'US' };

export function currencyForMarket(market) {
  return SYMBOL_BY_MARKET[market] || '';
}

export function currencyForExchange(exchange) {
  return currencyForMarket(MARKET_BY_EXCHANGE[exchange]);
}
