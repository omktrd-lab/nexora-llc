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
    // Fetch ticker data for all markets
    const rawMap = await fetchWithCache("summary:mexc:24hr", async () => {
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
    }, 2000);

    const markets = MARKETS.map((market) => {
      const raw = rawMap[market.binanceSymbol];

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

      // Use MEXC values directly for all markets
      let price = Number(raw.lastPrice);
      let high24h = Number(raw.highPrice);
      let low24h = Number(raw.lowPrice);
      let quoteVolume24h = Number(raw.quoteVolume);
      let change24h = Number(raw.priceChangePercent || 0);
      let volume24h = Number(raw.volume);
      
      // Apply lag offset only to NXRUSDT
      if (market.symbol === "NXRUSDT") {
        price = price - 0.05;
        high24h = high24h - 0.05;
        low24h = low24h - 0.05;
        quoteVolume24h = quoteVolume24h * 0.98;
        change24h = change24h - 0.1;
      }

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
        volume24h: Number(volume24h.toFixed(2)),
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
