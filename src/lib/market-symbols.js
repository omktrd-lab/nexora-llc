/**
 * Centralized market configuration for all supported trading pairs.
 * NXR uses UNIUSDT as the Binance anchor with a price scalar applied.
 * All other pairs fetch raw Binance data with no transformation.
 */

export const MARKETS = [
  {
    symbol: "NXRUSDT",
    base: "NXR",
    name: "Nexora Token",
    binanceSymbol: "UNIUSDT",
    useScalar: true,
    decimals: 4,
    isNative: true,
  },
  {
    symbol: "BTCUSDT",
    base: "BTC",
    name: "Bitcoin",
    binanceSymbol: "BTCUSDT",
    useScalar: false,
    decimals: 2,
    isNative: false,
  },
  {
    symbol: "ETHUSDT",
    base: "ETH",
    name: "Ethereum",
    binanceSymbol: "ETHUSDT",
    useScalar: false,
    decimals: 2,
    isNative: false,
  },
  {
    symbol: "SOLUSDT",
    base: "SOL",
    name: "Solana",
    binanceSymbol: "SOLUSDT",
    useScalar: false,
    decimals: 3,
    isNative: false,
  },
  {
    symbol: "DOGEUSDT",
    base: "DOGE",
    name: "Dogecoin",
    binanceSymbol: "DOGEUSDT",
    useScalar: false,
    decimals: 5,
    isNative: false,
  },
  {
    symbol: "USDCUSDT",
    base: "USDC",
    name: "USD Coin",
    binanceSymbol: "USDCUSDT",
    useScalar: false,
    decimals: 4,
    isNative: false,
  },
  {
    symbol: "BNBUSDT",
    base: "BNB",
    name: "BNB",
    binanceSymbol: "BNBUSDT",
    useScalar: false,
    decimals: 3,
    isNative: false,
  },
  {
    symbol: "ADAUSDT",
    base: "ADA",
    name: "Cardano",
    binanceSymbol: "ADAUSDT",
    useScalar: false,
    decimals: 4,
    isNative: false,
  },
  {
    symbol: "XRPUSDT",
    base: "XRP",
    name: "XRP",
    binanceSymbol: "XRPUSDT",
    useScalar: false,
    decimals: 4,
    isNative: false,
  },
  {
    symbol: "AVAXUSDT",
    base: "AVAX",
    name: "Avalanche",
    binanceSymbol: "AVAXUSDT",
    useScalar: false,
    decimals: 3,
    isNative: false,
  },
  {
    symbol: "LINKUSDT",
    base: "LINK",
    name: "Chainlink",
    binanceSymbol: "LINKUSDT",
    useScalar: false,
    decimals: 3,
    isNative: false,
  },
];

/** Lookup map from platform symbol → market config */
export const MARKET_MAP = Object.fromEntries(
  MARKETS.map((market) => [market.symbol, market]),
);

/** The default Binance price scalar for NXR's UNI anchor */
export const BINANCE_PRICE_SCALAR = Number(
  process.env.NEXT_PUBLIC_BINANCE_PRICE_SCALAR || 1.02,
);

/** The default Binance volume scalar */
export const BINANCE_VOLUME_SCALAR = Number(
  process.env.NEXT_PUBLIC_BINANCE_VOLUME_SCALAR || 1,
);

/**
 * Resolve Binance symbol and scalars for a given platform symbol.
 * Falls back to NXR (UNIUSDT + scalar) for unknown symbols.
 */
export function resolveMarket(platformSymbol) {
  const market = MARKET_MAP[platformSymbol] ?? MARKET_MAP["NXRUSDT"];
  return {
    market,
    binanceSymbol: market.binanceSymbol,
    priceScalar: market.useScalar ? BINANCE_PRICE_SCALAR : 1,
    volumeScalar: market.useScalar ? BINANCE_VOLUME_SCALAR : 1,
  };
}

/**
 * Format a price value based on market decimal precision.
 * Handles very small prices using scientific notation fallback.
 */
export function formatMarketPrice(price, decimals = 4) {
  if (typeof price !== "number" || !Number.isFinite(price)) return "--";
  if (decimals >= 8 && price < 0.00001) {
    return `$${price.toExponential(4)}`;
  }
  return `$${price.toFixed(decimals)}`;
}

/**
 * Roadmap features for Tier-1 exchange capabilities.
 * Displayed in the top navigation bar and mobile bottom nav with coming soon status.
 */
export const UPCOMING_FEATURES = [
  {
    id: "futures",
    name: "Futures",
    badge: "100x",
    tagline: "Perpetual Contracts with up to 100x Leverage",
    description:
      "Trade high-speed USDT-margined and coin-margined perpetual contracts with deep liquidity, ultra-tight spreads, and multi-collateral cross-margin risk controls.",
    highlights: [
      { label: "Max Leverage", val: "100x" },
      { label: "Margin Mode", val: "Cross & Isolated" },
      { label: "Execution", val: "Sub-millisecond" },
      { label: "Settlement", val: "Instant Real-Time" },
    ],
    status: "Private Testnet",
    eta: "Coming Soon",
  },
  {
    id: "margin",
    name: "Margin",
    badge: "5x",
    tagline: "Spot Margin Trading with Auto-Borrow Power",
    description:
      "Amplify your spot positions with flexible borrowing, automated collateral protection, and competitive hourly interest tiers.",
    highlights: [
      { label: "Borrow Power", val: "Up to 5x" },
      { label: "Interest Rate", val: "Dynamic Hourly" },
      { label: "Collateral", val: "Multi-Asset" },
      { label: "Liquidation Buffer", val: "Tiered Risk" },
    ],
    status: "In Development",
    eta: "Coming Soon",
  },
  {
    id: "earn",
    name: "Earn",
    badge: "180%",
    tagline: "High-Yield Staking & Flexible Crypto Savings",
    description:
      "Put your idle crypto to work with institutional proof-of-stake validators, automated compounding, and daily yield distributions.",
    highlights: [
      { label: "Est. APY", val: "Up to 180%" },
      { label: "Distributions", val: "Daily Payout" },
      { label: "Redemptions", val: "Instant Access" },
      { label: "Fees", val: "0% Deposit Fee" },
    ],
    status: "Auditing Contracts",
    eta: "Coming Soon",
  },
  {
    id: "bots",
    name: "Bots",
    badge: "AI",
    tagline: "Algorithmic & AI-Powered Grid Trading Bots",
    description:
      "Automate your trading strategy 24/7 with Spot Grid, DCA (Dollar-Cost Averaging), and Martingale bots that execute without manual intervention.",
    highlights: [
      { label: "Strategies", val: "Grid, DCA, Rebalance" },
      { label: "Backtesting", val: "180-day Historical" },
      { label: "Uptime", val: "24/7 Cloud Executed" },
      { label: "Bot Fees", val: "Free for Traders" },
    ],
    status: "Backtesting Engine",
    eta: "Coming Soon",
  },
  {
    id: "launchpad",
    name: "Launchpad",
    badge: "IEO",
    tagline: "Exclusive Access to Premier Web3 Token Launches",
    description:
      "Participate in early-stage initial exchange offerings (IEOs) with guaranteed tiered allocation models for Nexora ($NXR) token holders.",
    highlights: [
      { label: "Allocation Model", val: "Tiered NXR Staking" },
      { label: "Due Diligence", val: "Tier-1 Vetted" },
      { label: "Vesting", val: "Smart Contract Escrow" },
      { label: "Distribution", val: "Fair Launch" },
    ],
    status: "Project Onboarding",
    eta: "Coming Soon",
  },
];
