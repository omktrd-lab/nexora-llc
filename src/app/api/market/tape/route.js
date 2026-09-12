import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";
import { BINANCE_PRICE_SCALAR } from "@/lib/market-symbols";

const MEXC_URL = "https://api.mexc.com/api/v3/ticker/24hr";
const STOCKS = [
  ["TSLA", "Tesla"],
  ["AAPL", "Apple"],
  ["SPY", "S&P 500"],
  ["GC=F", "Gold"],
];

async function stockQuote(symbol, label) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const closes =
    result?.indicators?.quote?.[0]?.close?.filter(Number.isFinite) || [];
  const price = Number(result?.meta?.regularMarketPrice || closes.at(-1));
  const previous = Number(result?.meta?.chartPreviousClose || closes.at(-2));
  return {
    symbol,
    label,
    price,
    change24h: previous ? ((price - previous) / previous) * 100 : 0,
    market: "traditional",
  };
}

export async function GET() {
  try {
    const data = await fetchWithCache(
      "market:tape",
      async () => {
        const symbols = ["BTCUSDT", "SOLUSDT", "ETHUSDT", "UNIUSDT"];

        let crypto = [];
        try {
          const cryptoData = await Promise.all(
            symbols.map(async (symbol) => {
              const url = new URL(MEXC_URL);
              url.searchParams.set("symbol", symbol);

              const cryptoResponse = await fetch(url, {
                cache: "no-store",
                signal: AbortSignal.timeout(6_000),
              });

              if (!cryptoResponse.ok) {
                throw new Error(`MEXC tape fetch failed for ${symbol}: ${cryptoResponse.status}`);
              }

              const quote = await cryptoResponse.json();
              if (!quote || typeof quote !== "object") return null;

              const isNxr = quote.symbol === "UNIUSDT";
              return {
                symbol: isNxr ? "NXR" : quote.symbol.replace("USDT", ""),
                label: isNxr ? "Nexora" : quote.symbol.replace("USDT", ""),
                price: Number(quote.lastPrice) * (isNxr ? BINANCE_PRICE_SCALAR : 1),
                change24h: Number(quote.priceChangePercent),
                market: "crypto",
              };
            }),
          );

          crypto = cryptoData.filter(Boolean);
        } catch (cryptoError) {
          console.warn("Market tape crypto feed failed; serving partial market data.", cryptoError);
        }

        const traditional = await Promise.allSettled(
          STOCKS.map(([symbol, label]) => stockQuote(symbol, label)),
        );

        return [
          ...crypto,
          ...traditional
            .filter((item) => item.status === "fulfilled")
            .map((item) => item.value),
        ];
      },
      15_000,
    );
    return NextResponse.json({ markets: data, timestamp: Date.now() });
  } catch (error) {
    return NextResponse.json(
      {
        markets: [],
        timestamp: Date.now(),
        message: "Could not load market ticker.",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 200 },
    );
  }
}
