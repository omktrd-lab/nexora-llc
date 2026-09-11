import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/market-symbols";
import { fetchWithCache } from "@/lib/api-cache";

const BINANCE_DEPTH_URL = "https://api.binance.com/api/v3/depth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformSymbol = (
      searchParams.get("symbol") || "NXRUSDT"
    ).toUpperCase();
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 10, 5),
      20,
    );

    const { market, binanceSymbol, priceScalar } = resolveMarket(platformSymbol);

    const cacheKey = `depth:${binanceSymbol}:${limit}`;
    const data = await fetchWithCache(cacheKey, async () => {
      const url = new URL(BINANCE_DEPTH_URL);
      url.searchParams.set("symbol", binanceSymbol);
      url.searchParams.set("limit", String(limit));

      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        throw new Error(`Binance depth failed with status ${response.status}`);
      }
      return await response.json();
    }, 2000);

    const toEntry = ([priceStr, sizeStr]) => ({
      price: Number((Number(priceStr) * priceScalar).toFixed(8)),
      size: Number(Number(sizeStr).toFixed(4)),
    });

    const bids = (data.bids || []).map(toEntry);
    const asks = (data.asks || []).map(toEntry);

    const spread =
      bids.length && asks.length
        ? Number((asks[0].price - bids[0].price).toFixed(8))
        : 0;

    return NextResponse.json({
      symbol: platformSymbol,
      pair: `${market.base}/USDT`,
      bids,
      asks,
      spread,
      source: "binance-depth",
    });
  } catch {
    return NextResponse.json(
      { message: "Could not fetch order book." },
      { status: 502 },
    );
  }
}
