import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/market-symbols";
import { fetchWithCache } from "@/lib/api-cache";

const BINANCE_TRADES_URL = "https://api.binance.com/api/v3/trades";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformSymbol = (
      searchParams.get("symbol") || "NXRUSDT"
    ).toUpperCase();
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 5),
      50,
    );

    const { market, binanceSymbol, priceScalar } = resolveMarket(platformSymbol);

    const cacheKey = `trades:${binanceSymbol}:${limit}`;
    const data = await fetchWithCache(cacheKey, async () => {
      const url = new URL(BINANCE_TRADES_URL);
      url.searchParams.set("symbol", binanceSymbol);
      url.searchParams.set("limit", String(limit));

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`Binance trades failed with status ${response.status}`);
      }

      return await response.json();
    }, 2000);
    if (!Array.isArray(data)) {
      return NextResponse.json({ trades: [], symbol: platformSymbol });
    }

    const trades = data
      .slice()
      .reverse() // most recent first
      .map((trade) => {
        const price = Number((Number(trade.price) * priceScalar).toFixed(8));
        const size = Number(Number(trade.qty).toFixed(4));
        const time = new Date(trade.time);
        return {
          id: String(trade.id),
          price,
          size,
          side: trade.isBuyerMaker ? "Sell" : "Buy",
          time: time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          }),
        };
      });

    return NextResponse.json({
      symbol: platformSymbol,
      pair: `${market.base}/USDT`,
      trades,
      source: "binance-trades",
    });
  } catch {
    return NextResponse.json(
      { message: "Could not fetch recent trades." },
      { status: 502 },
    );
  }
}
