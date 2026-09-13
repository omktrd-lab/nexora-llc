import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/market-symbols";
import { fetchWithCache } from "@/lib/api-cache";

const MEXC_KLINE_URL = "https://api.mexc.com/api/v3/klines";
const MEXC_TICKER_URL = "https://api.mexc.com/api/v3/ticker/24hr";
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

async function fetchMexcTicker24h(symbol, useCache = true) {
  const url = new URL(MEXC_TICKER_URL);
  url.searchParams.set("symbol", symbol);

  const response = await fetch(url, {
    cache: useCache ? "no-store" : "no-store",
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`MEXC 24hr ticker failed with status ${response.status}`);
  }

  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Unexpected MEXC ticker response format");
  }

  return data;
}

function getSymbolBasedVariation(symbol, originalChange) {
  const absChange = Math.abs(originalChange);
  const sign = Math.sign(originalChange) || 1;
  
  // Stablecoins should remain at 0.00%
  const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD'];
  if (stablecoins.some(stable => symbol.includes(stable))) {
    return 0;
  }
  
  // If already >= 0.05%, use the real value
  if (absChange >= 0.05) return originalChange;
  
  // Generate a deterministic value between 0.01 and 0.05 based on symbol
  const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = 0.01 + ((hash % 4) * 0.01); // 0.01, 0.02, 0.03, or 0.04
  
  return sign * variation;
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

    // For NXRUSDT, use UNIUSDT ticker directly with small lag offset
    if (platformSymbol === "NXRUSDT" && type !== "history") {
      try {
        const ticker24h = await fetchMexcTicker24h(binanceSymbol);
        const latestBar = bars.at(-1);
        
        // Use UNI values directly with small lag offset
        const uniPrice = Number(ticker24h.lastPrice);
        const price = uniPrice - 0.05; // Small price lag
        const high24h = Number(ticker24h.highPrice) - 0.05;
        const low24h = Number(ticker24h.lowPrice) - 0.05;
        const quoteVolume24h = Number(ticker24h.quoteVolume); // No volume lag for stability
        let change24h = Number(ticker24h.priceChangePercent) - 0.1; // Slight change lag

        // Apply symbol-based variation for tiny values
        change24h = getSymbolBasedVariation(platformSymbol, change24h);

        // Format change24h with appropriate precision
        const change24hFormatted = Math.abs(change24h) < 0.01 
          ? change24h.toFixed(4) 
          : change24h.toFixed(2);
        
        // If still 0.00 after formatting, show more precision
        const finalChange24h = Number(change24hFormatted) === 0 
          ? Number(change24h.toFixed(4)) 
          : Number(change24hFormatted);

        if (type === "latest") {
          if (!latestBar) {
            return NextResponse.json(
              { message: "No latest MEXC candle available." },
              { status: 204 },
            );
          }
          return NextResponse.json({
            pair: pairLabel,
            symbol: platformSymbol,
            source: "mexc-24hr-ticker",
            bar: latestBar,
            price: Number(price.toFixed(8)),
            change24h: finalChange24h,
            high24h: Number(high24h.toFixed(8)),
            low24h: Number(low24h.toFixed(8)),
            volume24h: Number(quoteVolume24h.toFixed(2)),
            timestamp: latestBar.time,
          });
        }

        // Default ticker for NXRUSDT
        return NextResponse.json({
          pair: pairLabel,
          symbol: platformSymbol,
          source: "mexc-24hr-ticker",
          price: Number(price.toFixed(8)),
          change24h: finalChange24h,
          high24h: Number(high24h.toFixed(8)),
          low24h: Number(low24h.toFixed(8)),
          volume24h: Number(quoteVolume24h.toFixed(2)),
          timestamp: Math.floor(Date.now() / 1000),
        });
      } catch (error) {
        console.warn("MEXC 24h ticker failed for NXRUSDT, falling back to kline stats:", error instanceof Error ? error.message : error);
        // Fall through to kline-based calculation
      }
    }

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
          { message: "No latest MEXC candle available." },
          { status: 204 },
        );
      }

      // Use MEXC 24h ticker for stable metrics
      const ticker24h = await fetchMexcTicker24h(binanceSymbol);
      let change24h = Number(ticker24h.priceChangePercent);
      
      // Apply symbol-based variation for tiny values
      change24h = getSymbolBasedVariation(platformSymbol, change24h);
      
      const change24hFormatted = Math.abs(change24h) < 0.01 
        ? change24h.toFixed(4) 
        : change24h.toFixed(2);
      
      // If still 0.00 after formatting, show more precision
      const finalChange24h = Number(change24hFormatted) === 0 
        ? Number(change24h.toFixed(4)) 
        : Number(change24hFormatted);
      
      return NextResponse.json({
        pair: pairLabel,
        symbol: platformSymbol,
        source: "mexc-24hr-ticker",
        bar: latestBar,
        price: Number(ticker24h.lastPrice),
        change24h: finalChange24h,
        high24h: Number(ticker24h.highPrice),
        low24h: Number(ticker24h.lowPrice),
        volume24h: Number(ticker24h.quoteVolume),
        timestamp: latestBar.time,
      });
    }

    // Default: use MEXC 24h ticker for stable metrics
    const ticker24h = await fetchMexcTicker24h(binanceSymbol);
    let change24h = Number(ticker24h.priceChangePercent);
    
    // Apply symbol-based variation for tiny values
    change24h = getSymbolBasedVariation(platformSymbol, change24h);
    
    const change24hFormatted = Math.abs(change24h) < 0.01 
      ? change24h.toFixed(4) 
      : change24h.toFixed(2);
    
    // If still 0.00 after formatting, show more precision
    const finalChange24h = Number(change24hFormatted) === 0 
      ? Number(change24h.toFixed(4)) 
      : Number(change24hFormatted);
    
    return NextResponse.json({
      pair: pairLabel,
      symbol: platformSymbol,
      source: "mexc-24hr-ticker",
      price: Number(ticker24h.lastPrice),
      change24h: finalChange24h,
      high24h: Number(ticker24h.highPrice),
      low24h: Number(ticker24h.lowPrice),
      volume24h: Number(ticker24h.quoteVolume),
      timestamp: Math.floor(Date.now() / 1000),
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
