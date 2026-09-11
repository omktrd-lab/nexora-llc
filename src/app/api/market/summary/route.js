import { NextResponse } from "next/server";
import { MARKETS, BINANCE_PRICE_SCALAR, BINANCE_VOLUME_SCALAR } from "@/lib/market-symbols";
import { fetchWithCache } from "@/lib/api-cache";

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/24hr";

export async function GET() {
  try {
    // Fetch all 24h ticker data for all unique Binance symbols we need
    const uniqueBinanceSymbols = [
      ...new Set(MARKETS.map((m) => m.binanceSymbol)),
    ];

    // Binance supports fetching multiple tickers with ?symbols=[...] param
    const symbolsParam = JSON.stringify(uniqueBinanceSymbols);

    const rawData = await fetchWithCache("summary:24hr", async () => {
      const url = new URL(BINANCE_TICKER_URL);
      url.searchParams.set("symbols", symbolsParam);

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`Binance 24hr ticker failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Unexpected Binance response format");
      }
      return data;
    }, 2000);

    // Map Binance symbol → raw ticker
    const binanceMap = Object.fromEntries(
      rawData.map((ticker) => [ticker.symbol, ticker]),
    );

    const markets = MARKETS.map((market) => {
      const raw = binanceMap[market.binanceSymbol];
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
      const change24h = Number(raw.priceChangePercent);

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
      source: "binance-24hr",
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Could not fetch market summary.", error: error.message },
      { status: 502 },
    );
  }
}
