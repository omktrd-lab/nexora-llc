const BASE_PRICE_USD = 7;
const VIRTUAL_INITIAL_SUPPLY = 100_000;
const CURVE_SLOPE = 0.00005;
const BTC_BETA = 0.35;
const BTC_TREND_LIMIT_PERCENT = 20;
const DEFAULT_KES_PER_USD = 130;
const NETWORK_FEE_RATE = 0.01;
const NXR_REFERENCE_SYMBOL = "UNIUSDT";
const NXR_REFERENCE_URL = "https://api.binance.com/api/v3/ticker/price";
const NXR_REFERENCE_SCALAR = Number(
  process.env.NEXT_PUBLIC_BINANCE_PRICE_SCALAR || 1.02,
);

let cachedKesPerUsd = DEFAULT_KES_PER_USD;
let lastKesRateFetch = 0;
const KES_RATE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getKesPerUsd() {
  const now = Date.now();
  if (cachedKesPerUsd && now - lastKesRateFetch < KES_RATE_CACHE_DURATION) {
    return cachedKesPerUsd;
  }

  try {
    const response = await fetch(
      "https://cdn.jsdelivr.net/gh/irfanokr/currency-api@main/v1/currencies/usd.json",
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
      },
    );
    const data = await response.json();
    const kesRate = data?.usd?.kes;
    if (Number.isFinite(kesRate) && kesRate > 0) {
      cachedKesPerUsd = kesRate;
      lastKesRateFetch = now;
      return kesRate;
    }
  } catch (error) {
    console.warn("Failed to fetch USD/KES rate, using fallback:", error);
  }

  return DEFAULT_KES_PER_USD;
}

export function getKesPerUsdSync() {
  return cachedKesPerUsd;
}

function assertFiniteNonNegative(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number.`);
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getBtcBetaAdjustment(btc24hChangePercent = 0) {
  const sanitizedTrend = Number.isFinite(Number(btc24hChangePercent))
    ? Number(btc24hChangePercent)
    : 0;
  const boundedTrend = clamp(
    sanitizedTrend,
    -BTC_TREND_LIMIT_PERCENT,
    BTC_TREND_LIMIT_PERCENT,
  );
  return BASE_PRICE_USD * BTC_BETA * (boundedTrend / 100);
}

export function getCurrentNxrPrice({
  circulatingSupply = VIRTUAL_INITIAL_SUPPLY,
  btc24hChangePercent = 0,
} = {}) {
  const safeSupply = Number.isFinite(Number(circulatingSupply))
    ? Math.max(0, Number(circulatingSupply))
    : VIRTUAL_INITIAL_SUPPLY;
  assertFiniteNonNegative(safeSupply, "Circulating supply");
  const supplyBeyondBaseline = Math.max(
    0,
    safeSupply - VIRTUAL_INITIAL_SUPPLY,
  );
  const btcBetaAdjustment = getBtcBetaAdjustment(btc24hChangePercent);

  return {
    priceUsd:
      BASE_PRICE_USD + CURVE_SLOPE * supplyBeyondBaseline + btcBetaAdjustment,
    btcBetaAdjustment,
    supplyBeyondBaseline,
  };
}

export async function getExecutableNxrPrice(options = {}) {
  const fallback = getCurrentNxrPrice(options);
  try {
    // Fetch UNIUSDT from MEXC for swap pricing
    const mexcUrl = "https://api.mexc.com/api/v3/ticker/price?symbol=UNIUSDT";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1_500);

    try {
      const response = await fetch(mexcUrl, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      const uniPrice = Number(payload?.price);
      if (
        !response.ok ||
        !Number.isFinite(uniPrice) ||
        uniPrice <= 0
      ) {
        throw new Error("Invalid MEXC UNIUSDT price.");
      }
      return {
        ...fallback,
        priceUsd: uniPrice * NXR_REFERENCE_SCALAR,
        source: "mexc-uni-usdt",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.warn(
      "MEXC UNIUSDT price fetch failed; using curve fallback.",
      error instanceof Error ? error.message : error,
    );
    return { ...fallback, source: "curve-fallback" };
  }
}

export function calculateNxrReceived({ usdAmount, currentPriceUsd }) {
  assertFiniteNonNegative(usdAmount, "USD amount");
  assertFiniteNonNegative(currentPriceUsd, "Current NXR price");

  if (usdAmount === 0) return 0;
  if (currentPriceUsd === 0) {
    throw new Error("Current NXR price must be greater than zero.");
  }

  return (
    (-currentPriceUsd +
      Math.sqrt(currentPriceUsd ** 2 + 2 * CURVE_SLOPE * usdAmount)) /
    CURVE_SLOPE
  );
}

export async function calculateSwapQuote({
  kesAmount,
  circulatingSupply = VIRTUAL_INITIAL_SUPPLY,
  btc24hChangePercent = 0,
  livePriceUsd = null,
} = {}) {
  assertFiniteNonNegative(kesAmount, "KES amount");
  const kesPerUsd = await getKesPerUsd();
  const feeKes = Math.max(0.01, kesAmount * NETWORK_FEE_RATE);
  const netKes = kesAmount - feeKes;
  const usdAmount = kesAmount / kesPerUsd;
  const netUsdAmount = netKes / kesPerUsd;
  
  // Use live market price if provided, otherwise fall back to curve model
  let priceUsd, btcBetaAdjustment, supplyBeyondBaseline;
  if (livePriceUsd && Number.isFinite(livePriceUsd) && livePriceUsd > 0) {
    priceUsd = livePriceUsd;
    btcBetaAdjustment = 0;
    supplyBeyondBaseline = 0;
  } else {
    const curvePrice = getCurrentNxrPrice({ circulatingSupply, btc24hChangePercent });
    priceUsd = curvePrice.priceUsd;
    btcBetaAdjustment = curvePrice.btcBetaAdjustment;
    supplyBeyondBaseline = curvePrice.supplyBeyondBaseline;
  }
  
  const nxrReceived = calculateNxrReceived({
    usdAmount: netUsdAmount,
    currentPriceUsd: priceUsd,
  });
  const averagePriceUsd =
    nxrReceived > 0 ? netUsdAmount / nxrReceived : priceUsd;
  const priceImpact = nxrReceived > 0 ? averagePriceUsd / priceUsd - 1 : 0;

  return {
    kesAmount,
    feeKes,
    netKes,
    usdAmount,
    netUsdAmount,
    nxrReceived,
    priceUsd,
    averagePriceUsd,
    priceImpact,
    btcBetaAdjustment,
    supplyBeyondBaseline,
    exchangeRateKesPerUsd: kesPerUsd,
    networkFeeRate: NETWORK_FEE_RATE,
    circulatingSupply,
  };
}

export async function calculateUsdSwapQuote({
  usdAmount,
  circulatingSupply = VIRTUAL_INITIAL_SUPPLY,
  btc24hChangePercent = 0,
  currentPriceUsd,
} = {}) {
  assertFiniteNonNegative(usdAmount, "USDT amount");
  const kesPerUsd = await getKesPerUsd();
  const feeUsd = Math.max(0.01 / kesPerUsd, usdAmount * NETWORK_FEE_RATE);
  const netUsdAmount = usdAmount - feeUsd;
  const {
    priceUsd: curvePriceUsd,
    btcBetaAdjustment,
    supplyBeyondBaseline,
  } = getCurrentNxrPrice({ circulatingSupply, btc24hChangePercent });
  const priceUsd = Number.isFinite(currentPriceUsd)
    ? currentPriceUsd
    : curvePriceUsd;
  const nxrReceived = calculateNxrReceived({
    usdAmount: netUsdAmount,
    currentPriceUsd: priceUsd,
  });
  const averagePriceUsd =
    nxrReceived > 0 ? netUsdAmount / nxrReceived : priceUsd;

  return {
    usdAmount,
    feeUsd,
    netUsdAmount,
    nxrReceived,
    priceUsd,
    averagePriceUsd,
    priceImpact: nxrReceived > 0 ? averagePriceUsd / priceUsd - 1 : 0,
    btcBetaAdjustment,
    supplyBeyondBaseline,
    exchangeRateKesPerUsd: kesPerUsd,
    networkFeeRate: NETWORK_FEE_RATE,
    circulatingSupply,
  };
}

export const NXR_PRICING = Object.freeze({
  BASE_PRICE_USD,
  VIRTUAL_INITIAL_SUPPLY,
  CURVE_SLOPE,
  BTC_BETA,
  BTC_TREND_LIMIT_PERCENT,
  DEFAULT_KES_PER_USD,
  NETWORK_FEE_RATE,
});
