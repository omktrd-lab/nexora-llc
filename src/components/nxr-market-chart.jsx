"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  createChart,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from "lightweight-charts";
import {
  Crosshair,
  Eraser,
  Minus,
  MoveUpRight,
  MousePointer2,
  PencilLine,
  Square,
  Type,
} from "lucide-react";
import { MARKET_MAP, formatMarketPrice } from "@/lib/market-symbols";
import { cachedFetch } from "@/lib/client-fetch-cache";

const POLL_INTERVAL_MS = 300;
const DESKTOP_CHART_HEIGHT = 500;
const MOBILE_CHART_HEIGHT = 330;
const UP_CANDLE_COLOR = "#22c55e";
const DOWN_CANDLE_COLOR = "#a855f7";
const UP_VOLUME_COLOR = "rgba(34, 197, 94, 0.48)";
const DOWN_VOLUME_COLOR = "rgba(168, 85, 247, 0.45)";
const HISTORY_LIMIT = 2000;

const timeframes = [
  { label: "1m", interval: "1m" },
  { label: "5m", interval: "5m" },
  { label: "15m", interval: "15m" },
  { label: "1H", interval: "1h" },
  { label: "4H", interval: "4h" },
  { label: "1D", interval: "1d" },
];

const DRAWING_TOOLS = [
  { id: "cursor", label: "Cursor", icon: MousePointer2 },
  { id: "trend", label: "Trend line", icon: MoveUpRight },
  { id: "horizontal", label: "Horizontal line", icon: Minus },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "note", label: "Text note", icon: Type },
  { id: "freehand", label: "Freehand", icon: PencilLine },
];

function normalizeChartColor(colorValue) {
  const safeValue = (colorValue || "").trim();
  if (!safeValue || safeValue === "var()") return "#000000";

  const unsupportedFormats = ["oklch(", "oklab(", "color(", "hsl(", "hsla("];
  if (
    unsupportedFormats.some((format) =>
      safeValue.toLowerCase().includes(format),
    )
  ) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return "#000000";
    context.fillStyle = "#ffffff";
    try {
      context.fillStyle = safeValue;
      const normalized = context.fillStyle;
      if (normalized && normalized !== "rgba(0, 0, 0, 0)") return normalized;
    } catch {
      // Fall back to a known-safe palette below.
    }
    return "#000000";
  }

  return safeValue;
}

function resolveThemeColor(tokenName) {
  const rootStyles = getComputedStyle(document.documentElement);
  const rawColor = rootStyles.getPropertyValue(tokenName).trim();
  return normalizeChartColor(rawColor || "#000000");
}

function readThemeTokens() {
  return {
    background: resolveThemeColor("--background"),
    foreground: resolveThemeColor("--foreground"),
    border: resolveThemeColor("--border"),
    up: UP_CANDLE_COLOR,
    down: DOWN_CANDLE_COLOR,
  };
}

function getMarketDecimals(symbol) {
  return MARKET_MAP[symbol]?.decimals ?? 4;
}

function getChartPriceFormat(symbol) {
  const precision = getMarketDecimals(symbol);
  return {
    type: "price",
    precision,
    minMove: 10 ** -precision,
  };
}

function formatPrice(price, symbol = "NXRUSDT") {
  const decimals = getMarketDecimals(symbol);
  return formatMarketPrice(price, decimals);
}

async function fetchMarketBars(
  type = "history",
  interval = "15m",
  symbol = "NXRUSDT",
) {
  const params = new URLSearchParams({ type, interval, symbol });
  if (type === "history") params.set("limit", String(HISTORY_LIMIT));
  const response = await cachedFetch(`/api/market/ticker?${params}`, {
    cache: "no-store",
  });
  if (!response.ok) return [];

  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.bars)) return payload.bars;
  if (payload && payload.bar) return [payload.bar];
  return [];
}

async function fetchLiveOrderbook(symbol = "NXRUSDT") {
  try {
    const response = await cachedFetch(
      `/api/market/orderbook?symbol=${symbol}&limit=8`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchLiveTrades(symbol = "NXRUSDT") {
  try {
    const response = await cachedFetch(
      `/api/market/trades?symbol=${symbol}&limit=10`,
      { cache: "no-store" },
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.trades || null;
  } catch {
    return null;
  }
}

export function NxrMarketChart({
  compact = false,
  externalTickerData = null,
  symbol = "NXRUSDT",
  showBook = true,
  showTape = true,
  chartHeightOverride,
}) {
  const market = MARKET_MAP[symbol] ?? MARKET_MAP["NXRUSDT"];
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const latestCandleRef = useRef(null);
  const pollInFlightRef = useRef(false);
  const indicatorSeriesRef = useRef({});
  const symbolRef = useRef(symbol);

  const [ticker, setTicker] = useState(null);
  const [priceDirection, setPriceDirection] = useState("steady");
  const [timeframe, setTimeframe] = useState("15m");
  const [orderbook, setOrderbook] = useState(null);
  const [recentTrades, setRecentTrades] = useState(null);
  const [activeIndicators, setActiveIndicators] = useState({
    sma7: true,
    sma25: false,
    sma50: false,
    ema12: false,
    ema26: false,
    rsi14: false,
    macd: true,
    bollinger: false,
  });
  const [indicatorData, setIndicatorData] = useState(null);
  const [drawingTool, setDrawingTool] = useState("cursor");
  const [drawings, setDrawings] = useState([]);
  const [draftDrawing, setDraftDrawing] = useState(null);
  const [tapeMarkets, setTapeMarkets] = useState([]);
  const chartHeight =
    chartHeightOverride ??
    (compact ? MOBILE_CHART_HEIGHT : DESKTOP_CHART_HEIGHT);

  // Keep symbolRef in sync for use inside intervals/closures
  useEffect(() => {
    symbolRef.current = symbol;
  }, [symbol]);

  // Sync external ticker data
  useEffect(() => {
    if (externalTickerData) {
      setTicker(externalTickerData);
      setPriceDirection(
        Number(externalTickerData.change24h) >= 0 ? "up" : "down",
      );
    }
  }, [externalTickerData]);

  useEffect(() => {
    let active = true;
    async function loadTape() {
      try {
        const response = await cachedFetch("/api/market/tape", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setTapeMarkets(data.markets || []);
      } catch {
        // The chart remains available if the secondary market feed is delayed.
      }
    }
    loadTape();
    const interval = window.setInterval(loadTape, 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Fetch indicators when active set or timeframe changes
  useEffect(() => {
    const fetchIndicators = async () => {
      try {
        const activeKeys = [];
        if (
          activeIndicators.sma7 ||
          activeIndicators.sma25 ||
          activeIndicators.sma50
        )
          activeKeys.push("sma");
        if (activeIndicators.ema12 || activeIndicators.ema26)
          activeKeys.push("ema");
        if (activeIndicators.rsi14) activeKeys.push("rsi");
        if (activeIndicators.macd) activeKeys.push("macd");
        if (activeIndicators.bollinger) activeKeys.push("bollinger");
        if (activeKeys.length === 0) {
          setIndicatorData(null);
          return;
        }

        const response = await cachedFetch(
          `/api/market/indicators?interval=${timeframe}&limit=200&indicators=${activeKeys.join(",")}&symbol=${symbol}`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const data = await response.json();
          setIndicatorData(data.indicators);
        }
      } catch {
        // Keep existing data on fetch failure
      }
    };

    fetchIndicators();
  }, [activeIndicators, timeframe, symbol]);

  // Apply indicator data to chart series
  useEffect(() => {
    if (!indicatorData || !chartRef.current) return;

    const refs = indicatorSeriesRef.current;

    const safeSetData = (series, data) => {
      if (!series || !Array.isArray(data) || data.length === 0) return;

      const validData = data.filter(
        (point) =>
          point &&
          typeof point.time === "number" &&
          typeof point.value === "number" &&
          !isNaN(point.time) &&
          !isNaN(point.value),
      );

      if (validData.length === 0) return;

      try {
        series.setData(validData);
      } catch {
        // Silent: indicator data mismatch on symbol switch
      }
    };

    safeSetData(refs.sma7, indicatorData.sma7);
    safeSetData(refs.sma25, indicatorData.sma25);
    safeSetData(refs.sma50, indicatorData.sma50);
    safeSetData(refs.ema12, indicatorData.ema12);
    safeSetData(refs.ema26, indicatorData.ema26);
    safeSetData(refs.bollingerUpper, indicatorData.bollingerUpper);
    safeSetData(refs.bollingerMiddle, indicatorData.bollingerMiddle);
    safeSetData(refs.bollingerLower, indicatorData.bollingerLower);
  }, [indicatorData]);

  // Build/rebuild chart when symbol or timeframe changes
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return undefined;

    const tokens = readThemeTokens();
    const width = Math.max(container.clientWidth || 320, 320);
    const priceFormat = getChartPriceFormat(symbol);
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { color: tokens.background },
        textColor: tokens.foreground,
      },
      grid: {
        vertLines: { color: "rgba(17, 17, 17, 0.10)", style: LineStyle.Dotted },
        horzLines: { color: "rgba(17, 17, 17, 0.10)", style: LineStyle.Dotted },
      },
      crosshair: {
        vertLine: { color: tokens.border },
        horzLine: { color: tokens.border },
      },
      rightPriceScale: {
        borderColor: tokens.border,
        ticksVisible: true,
        entireTextOnly: true,
        autoScale: true,
        scaleMargins: {
          top: 0.06,
          bottom: 0.24,
        },
      },
      timeScale: {
        borderColor: tokens.border,
        timeVisible: true,
        secondsVisible: false,
      },
      width,
      height: chartHeight,
    });

    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      priceFormat,
      upColor: tokens.up,
      downColor: tokens.down,
      borderUpColor: tokens.up,
      borderDownColor: tokens.down,
      wickUpColor: tokens.up,
      wickDownColor: tokens.down,
      priceLineColor: tokens.foreground,
      wickVisible: true,
      borderVisible: true,
      lastValueVisible: false,
      thinBars: false,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.79, bottom: 0.04 },
      borderVisible: false,
    });

    // Create indicator series
    const createIndicatorSeries = (key, color, lineWidth = 1) => {
      const lineSeries = chart.addSeries(LineSeries, {
        priceFormat,
        color,
        lineWidth,
        priceLineVisible: false,
        lastValueVisible: true,
      });
      indicatorSeriesRef.current[key] = lineSeries;
      return lineSeries;
    };

    createIndicatorSeries("sma7", "#f59e0b", 1);
    createIndicatorSeries("sma25", "#3b82f6", 1);
    createIndicatorSeries("sma50", "#ef4444", 1);
    createIndicatorSeries("ema12", "#10b981", 1);
    createIndicatorSeries("ema26", "#8b5cf6", 1);
    createIndicatorSeries("bollingerUpper", "#6366f1", 1);
    createIndicatorSeries("bollingerMiddle", "#a1a1aa", 1);
    createIndicatorSeries("bollingerLower", "#6366f1", 1);

    const currentSymbol = symbolRef.current;

    const hydrateHistory = async () => {
      const bars = await fetchMarketBars("history", timeframe, currentSymbol);
      if (!bars.length) return;

      series.setData(bars);
      volumeSeries.setData(
        bars.map((bar) => ({
          time: bar.time,
          value: bar.volume,
          color: bar.close >= bar.open ? UP_VOLUME_COLOR : DOWN_VOLUME_COLOR,
        })),
      );
      seriesRef.current = series;
      volumeSeriesRef.current = volumeSeries;
      latestCandleRef.current = bars.at(-1);
      chart.timeScale().applyOptions({
        barSpacing: 7,
        minBarSpacing: 4,
        rightOffset: 8,
        timeVisible: true,
        secondsVisible: false,
      });

      const latestTicker = await cachedFetch(
        `/api/market/ticker?interval=${timeframe}&symbol=${currentSymbol}`,
        { cache: "no-store" },
      ).then((response) => (response.ok ? response.json() : null));

      if (latestTicker) {
        setTicker(latestTicker);
        setPriceDirection(
          Number(latestTicker.price) > Number(latestTicker.low24h)
            ? "up"
            : "down",
        );
      }
    };

    hydrateHistory();

    // Fetch initial orderbook & trades
    Promise.all([
      fetchLiveOrderbook(currentSymbol),
      fetchLiveTrades(currentSymbol),
    ]).then(([ob, trades]) => {
      if (ob) setOrderbook(ob);
      if (trades) setRecentTrades(trades);
    });

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!chartContainerRef.current) return;
      const nextWidth = Math.max(entry.contentRect.width || 320, 320);
      chart.applyOptions({ width: nextWidth, height: chartHeight });
    });
    resizeObserver.observe(container);

    // Polling: candle update + orderbook + trades every 3s
    const poll = async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;

      const sym = symbolRef.current;

      try {
        const [candleResponse, obData, tradesData] = await Promise.all([
          fetch(
            `/api/market/ticker?type=latest&interval=${timeframe}&symbol=${sym}`,
            {
              cache: "no-store",
            },
          ),
          fetchLiveOrderbook(sym),
          fetchLiveTrades(sym),
        ]);

        if (candleResponse.ok) {
          const payload = await candleResponse.json();
          const latestBar = payload?.bar;
          if (latestBar && seriesRef.current && volumeSeriesRef.current) {
            const previousPrice =
              latestCandleRef.current?.close ?? latestBar.close;
            seriesRef.current.update(latestBar);
            volumeSeriesRef.current.update({
              time: latestBar.time,
              value: latestBar.volume,
              color:
                latestBar.close >= latestBar.open
                  ? UP_VOLUME_COLOR
                  : DOWN_VOLUME_COLOR,
            });
            latestCandleRef.current = latestBar;
            setTicker({
              price: latestBar.close,
              change24h: payload.change24h,
              high24h: payload.high24h,
              low24h: payload.low24h,
              volume24h: payload.volume24h,
            });
            setPriceDirection(
              latestBar.close > previousPrice
                ? "up"
                : latestBar.close < previousPrice
                  ? "down"
                  : "steady",
            );
          }
        }

        if (obData) setOrderbook(obData);
        if (tradesData) setRecentTrades(tradesData);
      } catch {
        // Keep chart visible during transient feed failures
      } finally {
        pollInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(poll, 3000);

    return () => {
      window.clearInterval(intervalId);
      resizeObserver.disconnect();
      pollInFlightRef.current = false;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      latestCandleRef.current = null;
      indicatorSeriesRef.current = {};
      chart.remove();
      chartRef.current = null;
    };
  }, [chartHeight, timeframe, symbol]);

  const decimals = getMarketDecimals(symbol);
  const fmtPrice = (p) => formatPrice(p, symbol);

  function normalizedPoint(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    };
  }

  function beginDrawing(event) {
    if (drawingTool === "cursor") return;
    const point = normalizedPoint(event);
    if (drawingTool === "horizontal") {
      setDrawings((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          type: "horizontal",
          start: point,
          end: point,
        },
      ]);
      return;
    }
    if (drawingTool === "note") {
      setDrawings((current) => [
        ...current,
        { id: crypto.randomUUID(), type: "note", start: point, end: point },
      ]);
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDraftDrawing({
      type: drawingTool,
      start: point,
      end: point,
      points: [point],
    });
  }

  function moveDrawing(event) {
    if (!draftDrawing) return;
    const point = normalizedPoint(event);
    setDraftDrawing((current) =>
      current
        ? {
            ...current,
            end: point,
            points:
              current.type === "freehand"
                ? [...current.points, point]
                : current.points,
          }
        : null,
    );
  }

  function finishDrawing() {
    if (!draftDrawing) return;
    setDrawings((current) => [
      ...current,
      { ...draftDrawing, id: crypto.randomUUID() },
    ]);
    setDraftDrawing(null);
  }

  const drawingLayer = (drawing, key) => {
    const start = drawing.start;
    const end = drawing.end;
    const sx = `${start.x * 100}%`;
    const sy = `${start.y * 100}%`;
    const ex = `${end.x * 100}%`;
    const ey = `${end.y * 100}%`;
    const style = {
      stroke: "#f59e0b",
      strokeWidth: 1,
      fill: "none",
      vectorEffect: "non-scaling-stroke",
    };
    if (drawing.type === "horizontal")
      return (
        <line
          key={key}
          x1="0"
          y1={sy}
          x2="100%"
          y2={sy}
          {...style}
          strokeDasharray="4 3"
        />
      );
    if (drawing.type === "rectangle")
      return (
        <rect
          key={key}
          x={Math.min(start.x, end.x) * 100 + "%"}
          y={Math.min(start.y, end.y) * 100 + "%"}
          width={Math.abs(end.x - start.x) * 100 + "%"}
          height={Math.abs(end.y - start.y) * 100 + "%"}
          {...style}
          fill="rgba(245,158,11,.08)"
        />
      );
    if (drawing.type === "note")
      return (
        <text key={key} x={sx} y={sy} fill="#f59e0b" fontSize="2">
          Note
        </text>
      );
    if (drawing.type === "freehand")
      return (
        <polyline
          key={key}
          points={drawing.points
            .map((point) => `${point.x * 100},${point.y * 100}`)
            .join(" ")}
          vectorEffect="non-scaling-stroke"
          {...style}
        />
      );
    return <line key={key} x1={sx} y1={sy} x2={ex} y2={ey} {...style} />;
  };

  // Dynamic decimal format for orderbook entries
  const fmtBookPrice = (p) => {
    if (typeof p !== "number" || !Number.isFinite(p)) return "--";
    if (decimals >= 8 && p < 0.00001) return p.toExponential(4);
    return p.toFixed(decimals);
  };

  const spread = orderbook?.spread;
  const spreadDisplay =
    spread != null
      ? decimals >= 8 && spread < 0.00001
        ? spread.toExponential(4)
        : spread.toFixed(decimals)
      : "--";

  return (
    <section
      className={`terminal-market w-full ${compact ? "terminal-market-compact" : ""}`}
      aria-label={`${market.base} market chart`}
    >
      <header className="terminal-chart-head hidden flex-wrap items-end justify-between gap-3 px-4 pt-3 pb-2 lg:flex">
        <div className="flex items-baseline gap-2">
          <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            {market.base}/USDT
          </p>
          <p
            className={`font-mono text-xl font-semibold tracking-tight transition-colors ${
              priceDirection === "up"
                ? "text-green-500"
                : priceDirection === "down"
                  ? "text-purple-500"
                  : "text-foreground"
            }`}
          >
            {fmtPrice(ticker?.price)}
          </p>
        </div>
        <div className="text-muted-foreground flex gap-2 text-[10px]">
          <span className="bg-muted rounded px-2 py-1">
            24h{" "}
            {ticker
              ? `${ticker.change24h >= 0 ? "+" : ""}${Number(ticker.change24h).toFixed(2)}%`
              : "--"}
          </span>
          <span className="bg-muted rounded px-2 py-1">
            H: {ticker ? fmtPrice(ticker.high24h) : "--"}
          </span>
          <span className="bg-muted rounded px-2 py-1">
            L: {ticker ? fmtPrice(ticker.low24h) : "--"}
          </span>
          <span className="bg-muted rounded px-2 py-1">
            Vol{" "}
            {ticker
              ? `${(Number(ticker.volume24h) / 1_000_000).toFixed(2)}M`
              : "--"}
          </span>
        </div>
      </header>

      <header className="terminal-chart-head flex items-start justify-between gap-4 px-4 pt-3 pb-2 lg:hidden">
        <div className="flex items-baseline gap-2">
          <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
            {market.base}/USDT
          </p>
          <p
            className={`font-mono text-xl font-semibold ${priceDirection === "down" ? "text-purple-500" : "text-green-500"}`}
          >
            {fmtPrice(ticker?.price)}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[10px]">
            {ticker
              ? `${ticker.change24h >= 0 ? "+" : ""}${Number(ticker.change24h).toFixed(2)}% · 24h`
              : "Loading market"}
          </p>
        </div>
        <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-[9px] leading-4">
          <span className="text-muted-foreground">24h High</span>
          <span className="text-right font-mono">
            {ticker ? fmtPrice(ticker.high24h) : "--"}
          </span>
          <span className="text-muted-foreground">24h Low</span>
          <span className="text-right font-mono">
            {ticker ? fmtPrice(ticker.low24h) : "--"}
          </span>
          <span className="text-muted-foreground">24h Volume</span>
          <span className="text-right font-mono">
            {ticker
              ? `${(Number(ticker.volume24h) / 1_000_000).toFixed(2)}M`
              : "--"}
          </span>
        </div>
      </header>

      <div className="terminal-chart-tools text-muted-foreground flex items-center gap-4 border-y px-4 py-2 text-[11px]">
        <button className="text-foreground">Chart</button>
        {timeframes.map(({ label, interval }) => (
          <button
            key={interval}
            type="button"
            onClick={() => setTimeframe(interval)}
            className={
              timeframe === interval ? "text-foreground font-medium" : ""
            }
          >
            {label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({ ...prev, sma7: !prev.sma7 }))
            }
            className={
              activeIndicators.sma7 ? "text-foreground font-medium" : ""
            }
          >
            SMA7
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({ ...prev, sma25: !prev.sma25 }))
            }
            className={
              activeIndicators.sma25 ? "text-foreground font-medium" : ""
            }
          >
            SMA25
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({ ...prev, sma50: !prev.sma50 }))
            }
            className={
              activeIndicators.sma50 ? "text-foreground font-medium" : ""
            }
          >
            SMA50
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({ ...prev, ema12: !prev.ema12 }))
            }
            className={
              activeIndicators.ema12 ? "text-foreground font-medium" : ""
            }
          >
            EMA12
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({ ...prev, ema26: !prev.ema26 }))
            }
            className={
              activeIndicators.ema26 ? "text-foreground font-medium" : ""
            }
          >
            EMA26
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({
                ...prev,
                rsi14: !prev.rsi14,
              }))
            }
            className={
              activeIndicators.rsi14 ? "text-foreground font-medium" : ""
            }
          >
            RSI
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({ ...prev, macd: !prev.macd }))
            }
            className={
              activeIndicators.macd ? "text-foreground font-medium" : ""
            }
          >
            MACD
          </button>
          <button
            type="button"
            onClick={() =>
              setActiveIndicators((prev) => ({
                ...prev,
                bollinger: !prev.bollinger,
              }))
            }
            className={
              activeIndicators.bollinger ? "text-foreground font-medium" : ""
            }
          >
            BB
          </button>
        </span>
      </div>

      <div
        className={
          showBook && !compact
            ? "grid grid-cols-[minmax(0,1fr)_250px]"
            : "grid grid-cols-1"
        }
      >
        <div className="relative min-w-0 border-r bg-[#090a0c]">
          <aside
            className={`absolute top-0 left-0 z-20 flex flex-col items-center border-r border-[#27272a] bg-[#0d0d0f]/95 py-2 shadow-lg ${compact ? "w-8" : "w-10"}`}
            style={{ height: chartHeight }}
          >
            {DRAWING_TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                aria-label={label}
                onClick={() =>
                  setDrawingTool((current) => (current === id ? "cursor" : id))
                }
                className={`mb-0.5 grid size-7 place-items-center rounded transition-colors ${drawingTool === id ? "bg-[#27272a] text-amber-400" : "text-zinc-500 hover:bg-[#1b1b1f] hover:text-white"}`}
              >
                <Icon className="size-3.5" />
              </button>
            ))}
            <span className="my-1 h-px w-4 bg-[#27272a]" />
            <button
              type="button"
              title="Clear drawings"
              aria-label="Clear drawings"
              onClick={() => setDrawings([])}
              className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-[#1b1b1f] hover:text-white"
            >
              <Eraser className="size-4" />
            </button>
            <Crosshair className="mt-1 size-3.5 text-zinc-700" />
          </aside>
          <div
            ref={chartContainerRef}
            className="relative w-full min-w-0"
            style={{ height: chartHeight }}
          />
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className={`absolute inset-0 z-[5] h-full w-full ${drawingTool === "cursor" ? "pointer-events-none" : "cursor-crosshair"}`}
            onPointerDown={beginDrawing}
            onPointerMove={moveDrawing}
            onPointerUp={finishDrawing}
            aria-label="Chart drawing area"
          >
            {drawings.map((drawing) => drawingLayer(drawing, drawing.id))}
            {draftDrawing && drawingLayer(draftDrawing, "draft")}
          </svg>
          {activeIndicators.macd && (
            <MacdPane data={indicatorData} compact={compact} />
          )}
          {activeIndicators.rsi14 && (
            <RsiPane data={indicatorData} compact={compact} />
          )}
          {showTape && <MarketTape markets={tapeMarkets} />}
        </div>

        {/* Order Book + Recent Trades sidebar */}
        {showBook && (
          <div className="terminal-book p-3">
            <div className="text-muted-foreground mb-3 flex items-center justify-between text-[10px] font-semibold tracking-[0.16em] uppercase">
              <span>Order Book</span>
              <span>{spreadDisplay} spread</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-muted-foreground grid grid-cols-[1fr_auto] gap-2 text-[10px]">
                <span>Price (USDT)</span>
                <span>Size ({market.base})</span>
              </div>

              {/* Asks (sell side) — shown top, descending price */}
              {orderbook?.asks
                ?.slice(0, 5)
                .slice()
                .reverse()
                .map((ask, i) => (
                  <div
                    key={`ask-${i}-${ask.price}`}
                    className="terminal-ask grid grid-cols-[1fr_auto] gap-2 px-1 text-[11px] text-purple-500"
                  >
                    <span>{fmtBookPrice(ask.price)}</span>
                    <span>{ask.size}</span>
                  </div>
                ))}

              {/* Mid price */}
              <div className="my-2 flex items-center justify-between">
                <span
                  className={
                    priceDirection === "down"
                      ? "text-purple-500"
                      : "text-green-500"
                  }
                >
                  {fmtPrice(ticker?.price)}
                </span>
                {symbol === "NXRUSDT" && (
                  <span className="text-muted-foreground text-[10px]">
                    ≈ KES{" "}
                    {ticker?.price
                      ? (Number(ticker.price) * 130).toFixed(2)
                      : "--"}
                  </span>
                )}
              </div>

              {/* Bids (buy side) */}
              {orderbook?.bids?.slice(0, 5).map((bid, i) => (
                <div
                  key={`bid-${i}-${bid.price}`}
                  className="terminal-bid grid grid-cols-[1fr_auto] gap-2 px-1 text-[11px] text-green-500"
                >
                  <span>{fmtBookPrice(bid.price)}</span>
                  <span>{bid.size}</span>
                </div>
              ))}
            </div>

            {/* Recent Trades */}
            <div className="mt-5 border-t pt-3">
              <div className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-[0.16em] uppercase">
                Recent trades
              </div>
              <div className="space-y-1.5">
                {(recentTrades || []).slice(0, 8).map((trade) => (
                  <div
                    key={trade.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-2 text-[10px]"
                  >
                    <span
                      className={
                        trade.side === "Buy"
                          ? "text-green-500"
                          : "text-purple-500"
                      }
                    >
                      {fmtBookPrice(trade.price)}
                    </span>
                    <span className="text-muted-foreground">{trade.size}</span>
                    <span className="text-muted-foreground">{trade.time}</span>
                  </div>
                ))}
                {!recentTrades && (
                  <p className="text-muted-foreground text-[10px]">
                    Loading trades…
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function MarketTape({ markets }) {
  const quote = (market) => {
    const price = Number(market.price || 0);
    if (price >= 1_000)
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };
  const items = [...markets, ...markets];
  return (
    <div
      className="market-tape border-t border-[#27272a] bg-[#0c0d10]"
      aria-label="Live market ticker"
    >
      <div className="market-tape-track">
        {items.map((market, index) => {
          const up = Number(market.change24h) >= 0;
          return (
            <span
              className="market-tape-item"
              key={`${market.symbol}-${index}`}
            >
              <b>{market.symbol}</b>
              <span>{quote(market)}</span>
              <span className={up ? "text-[#22c55e]" : "text-[#a855f7]"}>
                {up ? "+" : ""}
                {Number(market.change24h).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function MacdPane({ data, compact }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const height = compact ? 100 : 128;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const chart = createChart(container, {
      autoSize: true,
      width: Math.max(container.clientWidth || 280, 280),
      height,
      layout: { background: { color: "#090a0c" }, textColor: "#71717a" },
      grid: {
        vertLines: {
          color: "rgba(113, 113, 122, 0.16)",
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: "rgba(113, 113, 122, 0.16)",
          style: LineStyle.Dotted,
        },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        scaleMargins: { top: 0.15, bottom: 0.12 },
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: !compact,
        secondsVisible: false,
      },
    });
    const histogram = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
      priceFormat: { type: "price", precision: 5, minMove: 0.00001 },
    });
    const macd = chart.addSeries(LineSeries, {
      color: "#60a5fa",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const signal = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chartRef.current = chart;
    seriesRef.current = { histogram, macd, signal };
    const observer = new ResizeObserver(([entry]) =>
      chart.applyOptions({
        width: Math.max(entry.contentRect.width || 280, 280),
        height,
      }),
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [height, compact]);

  useEffect(() => {
    if (!seriesRef.current || !data) return;
    const valid = (points) =>
      Array.isArray(points)
        ? points.filter(
            (point) =>
              Number.isFinite(point?.time) && Number.isFinite(point?.value),
          )
        : [];
    const histogram = valid(data.macdHistogram).map((point) => ({
      ...point,
      color:
        point.value >= 0
          ? "rgba(34, 197, 94, 0.52)"
          : "rgba(168, 85, 247, 0.55)",
    }));
    seriesRef.current.histogram.setData(histogram);
    seriesRef.current.macd.setData(valid(data.macd));
    seriesRef.current.signal.setData(valid(data.macdSignal));
  }, [data]);

  const latest = data?.macd?.at(-1)?.value;
  const signal = data?.macdSignal?.at(-1)?.value;
  return (
    <div className="relative border-t border-[#27272a] bg-[#090a0c]">
      <div className="pointer-events-none absolute top-2 left-3 z-10 flex items-center gap-2 text-[9px] font-medium">
        <span className="text-zinc-500">MACD 12 26 9</span>
        <span className="text-blue-400">
          {Number.isFinite(latest) ? latest.toFixed(4) : "--"}
        </span>
        <span className="text-amber-400">
          {Number.isFinite(signal) ? signal.toFixed(4) : "--"}
        </span>
      </div>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}

function RsiPane({ data, compact }) {
  const containerRef = useRef(null);
  const seriesRef = useRef(null);
  const height = compact ? 92 : 116;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const chart = createChart(container, {
      autoSize: true,
      width: Math.max(container.clientWidth || 280, 280),
      height,
      layout: { background: { color: "#090a0c" }, textColor: "#71717a" },
      grid: {
        vertLines: {
          color: "rgba(113, 113, 122, 0.16)",
          style: LineStyle.Dotted,
        },
        horzLines: {
          color: "rgba(113, 113, 122, 0.16)",
          style: LineStyle.Dotted,
        },
      },
      rightPriceScale: {
        borderColor: "#27272a",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "#27272a",
        timeVisible: !compact,
        secondsVisible: false,
      },
    });
    const rsi = chart.addSeries(LineSeries, {
      color: "#a855f7",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    rsi.createPriceLine({
      price: 70,
      color: "rgba(168, 85, 247, 0.45)",
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      axisLabelVisible: false,
    });
    rsi.createPriceLine({
      price: 30,
      color: "rgba(34, 197, 94, 0.45)",
      lineStyle: LineStyle.Dashed,
      lineWidth: 1,
      axisLabelVisible: false,
    });
    seriesRef.current = rsi;
    const observer = new ResizeObserver(([entry]) =>
      chart.applyOptions({
        width: Math.max(entry.contentRect.width || 280, 280),
        height,
      }),
    );
    observer.observe(container);
    return () => {
      observer.disconnect();
      chart.remove();
      seriesRef.current = null;
    };
  }, [compact, height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const points = Array.isArray(data?.rsi14)
      ? data.rsi14.filter(
          (point) =>
            Number.isFinite(point?.time) && Number.isFinite(point?.value),
        )
      : [];
    seriesRef.current.setData(points);
  }, [data]);

  const value = data?.rsi14?.at(-1)?.value;
  return (
    <div className="relative border-t border-[#27272a] bg-[#090a0c]">
      <div className="pointer-events-none absolute top-2 left-3 z-10 flex gap-2 text-[9px] font-medium">
        <span className="text-zinc-500">RSI 14</span>
        <span className="text-purple-400">
          {Number.isFinite(value) ? value.toFixed(2) : "--"}
        </span>
      </div>
      <div ref={containerRef} className="w-full" style={{ height }} />
    </div>
  );
}
