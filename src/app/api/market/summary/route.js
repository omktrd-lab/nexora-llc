import { NextResponse } from "next/server";
import { MARKETS, BINANCE_PRICE_SCALAR, BINANCE_VOLUME_SCALAR } from "@/lib/market-symbols";
import { fetchWithCache } from "@/lib/api-cache";

const MEXC_TICKER_URL = "https://api.mexc.com/api/v3/ticker/24hr";
const MEXC_KLINE_URL = "https://api.mexc.com/api/v3/klines";

async function fetchMexcTicker(symbol) {
  const url = new URL(MEXC_TICKER_URL);
  url.searchParams.set("symbol", symbol);

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`MEXC 24hr ticker failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Unexpected MEXC response format");
  }

  return data;
}

async function fetchMexcKlines(symbol, limit = 180, interval = "15m", priceScalar = 1) {
  const url = new URL(MEXC_KLINE_URL);
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`MEXC klines failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    return [];
  }

  return payload.map((entry) => {
    const [openTime, open, high, low, close, volume] = entry;
    const toPrice = (v) => Number((Number(v) * priceScalar).toFixed(8));
    return {
      time: Math.floor(openTime / 1000),
      open: toPrice(open),
      high: toPrice(high),
      low: toPrice(low),
      close: toPrice(close),
      volume: Number((Number(volume)).toFixed(4)),
    };
  });
}

function calculateChange24h(bars) {
  if (!bars.length) return 0;
  const lastBar = bars.at(-1);
  const firstBar = bars[0];
  const firstValue = Number(firstBar.open || lastBar.close || 0);
  return firstValue > 0 ? ((lastBar.close - firstValue) / firstValue) * 100 : 0;
}

export async function GET() {
  try {
    // Fetch both ticker data and klines for all markets
    const [rawMap, klinesMap] = await Promise.all([
      fetchWithCache("summary:mexc:24hr", async () => {
        const entries = await Promise.all(
          [...new Set(MARKETS.map((m) => m.binanceSymbol))].map(async (symbol) => {
            try {
              const data = await fetchMexcTicker(symbol);
              return [symbol, data];
            } catch {
              return [symbol, null];
            }
          }),
        );
        return Object.fromEntries(entries.filter(([, value]) => value));
      }, 2000),
      fetchWithCache("summary:mexc:klines", async () => {
        const entries = await Promise.all(
          [...new Set(MARKETS.map((m) => m.binanceSymbol))].map(async (symbol) => {
            try {
              const data = await fetchMexcKlines(symbol, 180, "15m");
              return [symbol, data];
            } catch {
              return [symbol, []];
            }
          }),
        );
        return Object.fromEntries(entries);
      }, 2000),
    ]);

    const markets = MARKETS.map((market) => {
      const raw = rawMap[market.binanceSymbol];
      const klines = klinesMap[market.binanceSymbol] || [];
      const priceScalar = market.useScalar ? BINANCE_PRICE_SCALAR : 1;
      const volumeScalar = market.useScalar ? BINANCE_VOLUME_SCALAR : 1;

      if (!raw) {
        return {
          symbol: market.symbol,
          base: market.base,
          name: market.name,
          isNative: market.isNative,
          decimals: market.decimals,
          price: 0,
          change24h: 0,
          high24h: 0,
          low24h: 0,
          volume24h: 0,
          quoteVolume24h: 0,
          error: true,
        };
      }

      const price = Number(raw.lastPrice) * priceScalar;
      const high24h = Number(raw.highPrice) * priceScalar;
      const low24h = Number(raw.lowPrice) * priceScalar;
      const quoteVolume24h = Number(raw.quoteVolume) * priceScalar * volumeScalar;
      
      // Calculate change24h from klines for accuracy
      const change24h = klines.length > 0 ? calculateChange24h(klines) : Number(raw.priceChangePercent || 0);

      return {
        symbol: market.symbol,
        base: market.base,
        name: market.name,
        isNative: market.isNative,
        decimals: market.decimals,
        price: Number(price.toFixed(8)),
        change24h: Number(change24h.toFixed(2)),
        high24h: Number(high24h.toFixed(8)),
        low24h: Number(low24h.toFixed(8)),
        volume24h: Number((Number(raw.volume) * volumeScalar).toFixed(2)),
        quoteVolume24h: Number(quoteVolume24h.toFixed(2)),
      };
    });

    return NextResponse.json({
      markets,
      source: "mexc-24hr",
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Could not fetch market summary.", error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
