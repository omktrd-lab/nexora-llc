import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/market-symbols";
import { fetchWithCache } from "@/lib/api-cache";

const MEXC_KLINE_URL = "https://api.mexc.com/api/v3/klines";
const SUPPORTED_INTERVALS = new Set(["1m", "5m", "15m", "1h", "4h", "1d"]);

function transformMexcKline(klinesEntry, priceScalar, volumeScalar) {
  const [openTime, open, high, low, close, volume] = klinesEntry;
  const time = Math.floor(openTime / 1000);
  const toPrice = (v) => Number((Number(v) * priceScalar).toFixed(8));

  return {
    time,
    open: toPrice(open),
    high: toPrice(high),
    low: toPrice(low),
    close: toPrice(close),
    volume: Number((Number(volume) * volumeScalar).toFixed(4)),
  };
}

async function fetchMexcKlines(
  binanceSymbol,
  limit = 50,
  interval = "15m",
  priceScalar = 1,
  volumeScalar = 1,
) {
  const cacheKey = `klines:${binanceSymbol}:${interval}:${limit}`;
  const rawData = await fetchWithCache(cacheKey, async () => {
    const pages = [];
    let endTime;
    let remaining = limit;

    while (remaining > 0) {
      const pageLimit = Math.min(1000, remaining);
      const url = new URL(MEXC_KLINE_URL);
      url.searchParams.set("symbol", binanceSymbol);
      url.searchParams.set("interval", interval);
      url.searchParams.set("limit", String(pageLimit));
      if (endTime != null) url.searchParams.set("endTime", String(endTime));

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        throw new Error(`MEXC klines failed with status ${response.status}`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload) || payload.length === 0) break;

      pages.unshift(payload);
      remaining -= payload.length;
      endTime = Number(payload[0][0]) - 1;
      if (payload.length < pageLimit) break;
    }

    return pages.flat().slice(-limit);
  }, 2000);

  return rawData.map((entry) =>
    transformMexcKline(entry, priceScalar, volumeScalar),
  );
}

function buildTickerStats(bars) {
  if (!bars.length) {
    return {
      price: 0,
      change24h: 0,
      high24h: 0,
      low24h: 0,
      volume24h: 0,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  const lastBar = bars.at(-1);
  const firstBar = bars[0];
  const firstValue = Number(firstBar.open || lastBar.close || 0);
  const change24h =
    firstValue > 0 ? ((lastBar.close - firstValue) / firstValue) * 100 : 0;
  const high24h = Math.max(...bars.map((bar) => bar.high));
  const low24h = Math.min(...bars.map((bar) => bar.low));
  const volume24h = bars.reduce((sum, bar) => {
    const avgPrice = (Number(bar.open) + Number(bar.close)) / 2;
    return sum + Number(bar.volume || 0) * avgPrice;
  }, 0);

  return {
    price: lastBar.close,
    change24h: Number(change24h.toFixed(2)),
    high24h,
    low24h,
    volume24h: Number(volume24h.toFixed(2)),
    timestamp: lastBar.time,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformSymbol = (
      searchParams.get("symbol") || "NXRUSDT"
    ).toUpperCase();
    const type = searchParams.get("type") || "ticker";
    const requestedInterval = searchParams.get("interval") || "15m";
    const interval = SUPPORTED_INTERVALS.has(requestedInterval)
      ? requestedInterval
      : "1m";
    const requestedLimit = Number(searchParams.get("limit"));
    const historyLimit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.floor(requestedLimit), 50), 2000)
      : 2000;

    const { market, binanceSymbol, priceScalar, volumeScalar } =
      resolveMarket(platformSymbol);

    const bars = await fetchMexcKlines(
      binanceSymbol,
      type === "history" ? historyLimit : 180,
      interval,
      priceScalar,
      volumeScalar,
    );

    const pairLabel = `${market.base}/USDT`;

    if (type === "history") {
      const stats = buildTickerStats(bars);
      return NextResponse.json({
        pair: pairLabel,
        symbol: platformSymbol,
        source: "mexc-proxy",
        bars,
        ...stats,
      });
    }

    if (type === "latest") {
      const latestBar = bars.at(-1);
      if (!latestBar) {
        return NextResponse.json(
          { message: "No latest Binance candle available." },
          { status: 204 },
        );
      }

      const stats = buildTickerStats(
        await fetchBinanceKlines(
          binanceSymbol,
          historyLimit,
          interval,
          priceScalar,
          volumeScalar,
        ),
      );
      return NextResponse.json({
        pair: pairLabel,
        symbol: platformSymbol,
        source: "mexc-proxy",
        bar: latestBar,
        price: latestBar.close,
        change24h: stats.change24h,
        high24h: stats.high24h,
        low24h: stats.low24h,
        volume24h: stats.volume24h,
        timestamp: latestBar.time,
      });
    }

    // Default: full ticker stats
    const stats = buildTickerStats(bars);
    return NextResponse.json({
      pair: pairLabel,
      symbol: platformSymbol,
      source: "mexc-proxy",
      ...stats,
    });
  } catch (error) {
    console.error("MEXC market proxy failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        message: "Could not read the MEXC market proxy feed.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
