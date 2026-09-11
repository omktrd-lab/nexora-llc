const BASE_PRICE_USD = 7;
const VIRTUAL_INITIAL_SUPPLY = 100_000;
const CURVE_SLOPE = 0.00005;
const BTC_BETA = 0.35;
const BTC_TREND_LIMIT_PERCENT = 20;
const KES_PER_USD = 130;
const NETWORK_FEE_RATE = 0.001;
const NXR_REFERENCE_SYMBOL = "UNIUSDT";
const NXR_REFERENCE_URL = "https://api.binance.com/api/v3/ticker/price";
const NXR_REFERENCE_SCALAR = Number(
  process.env.NEXT_PUBLIC_BINANCE_PRICE_SCALAR || 1.02,
);

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
    const url = new URL(NXR_REFERENCE_URL);
    url.searchParams.set("symbol", NXR_REFERENCE_SYMBOL);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1_500);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      const referencePrice = Number(payload?.price);
      if (
        !response.ok ||
        !Number.isFinite(referencePrice) ||
        referencePrice <= 0
      ) {
        throw new Error("Invalid NXR reference price.");
      }
      return {
        ...fallback,
        priceUsd: referencePrice * NXR_REFERENCE_SCALAR,
        source: "uni-usdt-reference",
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.warn(
      "Binance NXR price fetch failed; using curve fallback.",
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

export function calculateSwapQuote({
  kesAmount,
  circulatingSupply = VIRTUAL_INITIAL_SUPPLY,
  btc24hChangePercent = 0,
} = {}) {
  assertFiniteNonNegative(kesAmount, "KES amount");
  const feeKes = Math.max(0.01, kesAmount * NETWORK_FEE_RATE);
  const netKes = kesAmount - feeKes;
  const usdAmount = kesAmount / KES_PER_USD;
  const netUsdAmount = netKes / KES_PER_USD;
  const { priceUsd, btcBetaAdjustment, supplyBeyondBaseline } =
    getCurrentNxrPrice({ circulatingSupply, btc24hChangePercent });
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
    exchangeRateKesPerUsd: KES_PER_USD,
    networkFeeRate: NETWORK_FEE_RATE,
    circulatingSupply,
  };
}

export function calculateUsdSwapQuote({
  usdAmount,
  circulatingSupply = VIRTUAL_INITIAL_SUPPLY,
  btc24hChangePercent = 0,
  currentPriceUsd,
} = {}) {
  assertFiniteNonNegative(usdAmount, "USDT amount");
  const feeUsd = Math.max(0.01 / KES_PER_USD, usdAmount * NETWORK_FEE_RATE);
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
  KES_PER_USD,
  NETWORK_FEE_RATE,
});
