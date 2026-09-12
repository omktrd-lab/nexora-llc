import { NextResponse } from "next/server";
import { resolveMarket } from "@/lib/market-symbols";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVWMA,
  calculateATR,
} from "@/lib/indicators";

const MEXC_KLINE_URL = "https://api.mexc.com/api/v3/klines";

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
  limit = 200,
  interval = "15m",
  priceScalar = 1,
  volumeScalar = 1,
) {
  const url = new URL(MEXC_KLINE_URL);
  url.searchParams.set("symbol", binanceSymbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`MEXC klines failed with status ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload)
    ? payload.map((entry) =>
        transformMexcKline(entry, priceScalar, volumeScalar),
      )
    : [];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformSymbol = (
      searchParams.get("symbol") || "NXRUSDT"
    ).toUpperCase();
    const interval = searchParams.get("interval") || "15m";
    const limit = Number(searchParams.get("limit")) || 200;
    const indicators = searchParams.get("indicators")?.split(",") || [
      "sma",
      "ema",
      "rsi",
      "macd",
      "bollinger",
      "vwma",
      "atr",
    ];

    const { market, binanceSymbol, priceScalar, volumeScalar } =
      resolveMarket(platformSymbol);

    const bars = await fetchMexcKlines(
      binanceSymbol,
      limit,
      interval,
      priceScalar,
      volumeScalar,
    );

    if (!bars.length) {
      return NextResponse.json({ bars: [], indicators: {} });
    }

    const closes = bars.map((bar) => bar.close);
    const highs = bars.map((bar) => bar.high);
    const lows = bars.map((bar) => bar.low);
    const volumes = bars.map((bar) => bar.volume);
    const timestamps = bars.map((bar) => bar.time);

    const indicatorData = {};

    // Simple Moving Averages
    if (indicators.includes("sma")) {
      indicatorData.sma7 = calculateSMA(closes, 7).map((val, i) => ({
        time: timestamps[6 + i],
        value: val,
      }));
      indicatorData.sma25 = calculateSMA(closes, 25).map((val, i) => ({
        time: timestamps[24 + i],
        value: val,
      }));
      indicatorData.sma50 = calculateSMA(closes, 50).map((val, i) => ({
        time: timestamps[49 + i],
        value: val,
      }));
      indicatorData.sma200 = calculateSMA(closes, 200).map((val, i) => ({
        time: timestamps[199 + i],
        value: val,
      }));
    }

    // Exponential Moving Averages
    if (indicators.includes("ema")) {
      indicatorData.ema12 = calculateEMA(closes, 12).map((val, i) => ({
        time: timestamps[11 + i],
        value: val,
      }));
      indicatorData.ema26 = calculateEMA(closes, 26).map((val, i) => ({
        time: timestamps[25 + i],
        value: val,
      }));
      indicatorData.ema50 = calculateEMA(closes, 50).map((val, i) => ({
        time: timestamps[49 + i],
        value: val,
      }));
    }

    // RSI
    if (indicators.includes("rsi")) {
      indicatorData.rsi14 = calculateRSI(closes, 14).map((val, i) => ({
        time: timestamps[15 + i],
        value: val,
      }));
    }

    // MACD
    if (indicators.includes("macd")) {
      const macdData = calculateMACD(closes, 12, 26, 9);
      const startIndex = 26 + 8;
      indicatorData.macd = macdData.macd.map((val, i) => ({
        time: timestamps[startIndex + i],
        value: val,
      }));
      indicatorData.macdSignal = macdData.signal.map((val, i) => ({
        time: timestamps[startIndex + 9 + i],
        value: val,
      }));
      indicatorData.macdHistogram = macdData.histogram.map((val, i) => ({
        time: timestamps[startIndex + 9 + i],
        value: val,
      }));
    }

    // Bollinger Bands
    if (indicators.includes("bollinger")) {
      const bbData = calculateBollingerBands(closes, 20, 2);
      indicatorData.bollingerUpper = bbData.upper.map((val, i) => ({
        time: timestamps[19 + i],
        value: val,
      }));
      indicatorData.bollingerMiddle = bbData.middle.map((val, i) => ({
        time: timestamps[19 + i],
        value: val,
      }));
      indicatorData.bollingerLower = bbData.lower.map((val, i) => ({
        time: timestamps[19 + i],
        value: val,
      }));
    }

    // Volume Weighted Moving Average
    if (indicators.includes("vwma")) {
      indicatorData.vwma20 = calculateVWMA(closes, volumes, 20).map(
        (val, i) => ({
          time: timestamps[19 + i],
          value: val,
        }),
      );
    }

    // Average True Range
    if (indicators.includes("atr")) {
      indicatorData.atr14 = calculateATR(highs, lows, closes, 14).map(
        (val, i) => ({
          time: timestamps[15 + i],
          value: val,
        }),
      );
    }

    return NextResponse.json({
      bars,
      indicators: indicatorData,
      interval,
      symbol: platformSymbol,
      binanceSymbol: market.binanceSymbol,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Could not fetch indicators", error: error.message },
      { status: 502 },
    );
  }
}
