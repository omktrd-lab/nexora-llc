"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Bot,
  ChevronDown,
  CircleDollarSign,
  CircleHelp,
  Landmark,
  Lock,
  Search,
  ShieldCheck,
  Waves,
} from "lucide-react";
import { account } from "@/lib/appwrite";
import { cachedFetch } from "@/lib/client-fetch-cache";
import { NxrMarketChart } from "@/components/nxr-market-chart";

const ARENA_MARKETS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const shortPair = (symbol) => `${symbol.replace("USDT", "")}/USDT`;
const routeNotation = (symbol) => `${(symbol || "").replace("USDT", "")}→USDT`;
const strategyCode = (strategy) => {
  if (!strategy) return "ARB-01";
  const s = strategy.toLowerCase();
  if (s.includes("mean")) return "MR-02";
  if (s.includes("spread") || s.includes("cross")) return "ARB-01";
  if (s.includes("liquid") || s.includes("rebalance")) return "LR-03";
  if (s.includes("momentum") || s.includes("fade")) return "MF-04";
  return "ST-01";
};
const money = (value) =>
  `$${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function BotsPage() {
  const router = useRouter();
  const [arena, setArena] = useState(null);
  const [selected, setSelected] = useState("BTCUSDT");

  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await cachedFetch("/api/bots", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (active) setArena(data);
      } catch {
        // Preserve the last execution state during a transient refresh miss.
      }
    }
    refresh();
    const interval = window.setInterval(refresh, 1_500);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function applyRewards() {
      try {
        await account.get();
        const jwt = await account.createJWT();
        await fetch("/api/bots", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt.jwt}` },
        });
      } catch {
        // The arena remains public even when there is no current session.
      }
    }
    const initial = window.setTimeout(() => active && applyRewards(), 4_000);
    const interval = window.setInterval(() => active && applyRewards(), 30_000);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  const selectedActivity = useMemo(
    () =>
      (arena?.executions || []).filter((entry) => entry.symbol === selected),
    [arena, selected],
  );
  const winRate = arena
    ? (arena.wins / Math.max(1, arena.wins + arena.losses)) * 100
    : 0;

  return (
    <main className="bots-arena flex min-h-screen flex-col bg-[#090a0c] pb-8 text-white lg:h-svh lg:min-h-0 lg:overflow-hidden lg:pb-0">
      <header className="terminal-header hidden h-14 shrink-0 items-center border-b border-[#27272a] px-4 lg:flex">
        <div className="flex items-center gap-8">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5"
          >
            <span className="grid size-7 place-items-center rounded bg-white text-xs font-black text-black">
              N
            </span>
            <span className="text-sm font-bold tracking-wide">NEXORA</span>
          </button>
          <nav className="flex items-center gap-4 overflow-x-auto text-xs whitespace-nowrap text-zinc-500">
            <button
              type="button"
              onClick={() => router.push("/?focus=buy")}
              className="transition-colors hover:text-white"
            >
              Buy Crypto
            </button>
            <button
              onClick={() => router.push("/markets")}
              className="transition-colors hover:text-white"
            >
              Markets
            </button>
            <button
              onClick={() => router.push("/fund")}
              className="transition-colors hover:text-white"
            >
              Deposit KES
            </button>
            <button
              onClick={() => router.push("/")}
              className="transition-colors hover:text-white"
            >
              Trade <ChevronDown className="inline size-3" />
            </button>
            {["Futures", "Margin", "Earn"].map((item) => (
              <button
                key={item}
                className="group flex items-center gap-1 transition-colors hover:text-zinc-200"
              >
                <span>{item}</span>
                <Lock className="size-2.5 opacity-60" />
                <span className="rounded bg-zinc-800 px-1 text-[8px] text-zinc-400">
                  SOON
                </span>
              </button>
            ))}
            <button className="flex items-center gap-1 font-medium text-white">
              <Bot className="size-3.5 text-[#22c55e]" /> Bots
            </button>
            <button className="group flex items-center gap-1 transition-colors hover:text-zinc-200">
              <span>Launchpad</span>
              <Lock className="size-2.5 opacity-60" />
              <span className="rounded bg-zinc-800 px-1 text-[8px] text-zinc-400">
                SOON
              </span>
            </button>
            <button
              onClick={() => router.push("/portfolio")}
              className="transition-colors hover:text-white"
            >
              Portfolio
            </button>
            <button
              onClick={() => router.push("/referrals")}
              className="transition-colors hover:text-white"
            >
              Referrals
            </button>
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex w-44 items-center gap-2 rounded bg-[#1a1b1f] px-3 py-2 text-xs text-zinc-500">
            <Search className="size-3.5" /> Search markets
          </div>
          <button className="text-zinc-500">
            <Bell className="size-4" />
          </button>
          <button className="text-zinc-500">
            <CircleHelp className="size-4" />
          </button>
          <button
            onClick={() => router.push("/portfolio")}
            className="grid size-7 place-items-center rounded-full border border-zinc-500 text-[10px] font-bold"
          >
            N
          </button>
        </div>
      </header>

      <header className="flex h-12 items-center justify-between px-4 lg:hidden">
        <button
          onClick={() => router.push("/")}
          className="text-xs font-bold tracking-wide"
        >
          NEXORA
        </button>
        <span className="flex items-center gap-1 text-[10px] text-[#22c55e]">
          <Activity className="size-3" /> BOTS
        </span>
        <button
          onClick={() => router.push("/portfolio")}
          className="text-[10px] text-zinc-400"
        >
          Portfolio
        </button>
      </header>

      <section className="shrink-0 px-4 py-5 lg:border-b lg:border-[#27272a] lg:py-3">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div>
            <h1 className="mt-1 text-lg font-semibold tracking-tight">
              Cross-market liquidity strategies / high frequency trading bots
            </h1>
          </div>
          <div className="grid grid-cols-3 gap-x-6 text-right text-[10px] sm:flex">
            <Stat label="Active" value={arena?.activePositions?.length || 0} />
            <Stat label="Win rate" value={`${winRate.toFixed(1)}%`} good />
            <Stat
              label="Net P/L"
              value={money(arena?.totalBotPnlUsd)}
              good={Number(arena?.totalBotPnlUsd) >= 0}
            />
          </div>
          <div className="hidden min-w-0 flex-1 items-center justify-between gap-6 text-[10px] text-zinc-500 lg:flex">
            <span>
              Pool <strong className="font-mono font-normal text-zinc-300">{money(arena?.liquidityPoolUsd || 233000)}</strong>
            </span>
            <span>
              Reserve <strong className="font-mono font-normal text-zinc-300">{money(arena?.privateReserveUsd || 1400000)}</strong>
            </span>
            <span>
              Distribution <strong className="font-mono font-normal text-[#22c55e]">{money(arena?.holderDistributionUsd)}</strong>
            </span>
            <span className="font-mono text-zinc-400">
              {arena?.executions?.length || 0} events
            </span>
          </div>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 overflow-hidden lg:border-b lg:border-[#27272a] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <div className="hidden grid-cols-2 border-b border-[#27272a] lg:grid">
            {ARENA_MARKETS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => setSelected(symbol)}
                className={`min-w-0 border-r border-b border-[#27272a] text-left ${selected === symbol ? "ring-1 ring-[#22c55e]/60 ring-inset" : ""}`}
              >
                <NxrMarketChart
                  symbol={symbol}
                  showBook={false}
                  showTape={false}
                  chartHeightOverride={205}
                />
              </button>
            ))}
          </div>
          <div className="bots-mobile-chart lg:hidden">
            <div className="flex overflow-x-auto px-3">
              {ARENA_MARKETS.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelected(symbol)}
                  className={`shrink-0 px-3 py-2 text-[10px] font-semibold ${selected === symbol ? "border-b border-[#22c55e] text-[#22c55e]" : "text-zinc-500"}`}
                >
                  {shortPair(symbol)}
                </button>
              ))}
            </div>
            <NxrMarketChart
              symbol={selected}
              compact
              showBook={false}
              showTape={false}
              chartHeightOverride={265}
            />
          </div>
        </div>
        <ArenaSidebar
          selected={selected}
          arena={arena}
          activity={selectedActivity}
        />
      </section>

      <div className="hidden shrink-0 lg:block">
        <ArenaTape arena={arena} />
      </div>

      <section className="grid gap-y-5 px-4 py-6 md:grid-cols-3 lg:hidden">
        <Pool
          icon={Waves}
          label="Nexora liquidity pool"
          value={money(arena?.liquidityPoolUsd || 233000)}
          detail="Holder liquidity · steady inflow"
          tone="text-[#22c55e]"
        />
        <Pool
          icon={Landmark}
          label="Private reserve"
          value={money(arena?.privateReserveUsd || 1400000)}
          detail="Strategy credit and settlement"
          tone="text-white"
        />
        <Pool
          icon={CircleDollarSign}
          label="Holder distribution"
          value={money(arena?.holderDistributionUsd)}
          detail="Allocated through NXR ownership"
          tone="text-[#22c55e]"
        />
      </section>

      <section className="px-4 py-5 lg:hidden">
        <div className="flex items-center justify-between py-2 text-[10px] font-semibold tracking-[.16em] text-zinc-500 uppercase">
          <span>Execution ledger</span>
          <span>{arena?.executions?.length || 0} events</span>
        </div>
        <div className="max-h-52 overflow-auto">
          {(arena?.executions || []).slice(0, 18).map((entry, idx) => (
            <LedgerRow key={`${entry.id || entry.positionId}-${entry.type || ""}-${idx}`} entry={entry} />
          ))}
        </div>
      </section>
      <div className="lg:hidden">
        <ArenaTape arena={arena} />
      </div>
    </main>
  );
}

function Stat({ label, value, good = false }) {
  return (
    <div>
      <p className="text-zinc-600 uppercase">{label}</p>
      <p
        className={`mt-1 font-mono text-xs ${good ? "text-[#22c55e]" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}
function Pool({ icon: Icon, label, value, detail, tone }) {
  return (
    <div className="px-0 py-1">
      <p className="flex items-center gap-2 text-[10px] font-bold tracking-[.15em] text-zinc-500 uppercase">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className={`mt-2 font-mono text-xl font-semibold ${tone}`}>{value}</p>
      <p className="mt-1 text-[10px] text-zinc-500">{detail}</p>
    </div>
  );
}
function ArenaSidebar({ selected, arena, activity }) {
  const [tab, setTab] = useState("market");

  const openPositions = useMemo(
    () => (arena?.activePositions || []).filter((p) => p.symbol === selected),
    [arena, selected],
  );

  const activePosition = openPositions[0] || null;

  const currentSpread = useMemo(() => {
    if (activePosition) return activePosition.spreadBps.toFixed(1);
    const last = activity.find((a) => a.symbol === selected);
    return (last?.spreadBps || 6.4).toFixed(1);
  }, [activePosition, activity, selected]);

  const capitalCommitted = useMemo(
    () => openPositions.reduce((acc, p) => acc + (p.capitalUsd || 0), 0),
    [openPositions],
  );

  const displayedHistory = useMemo(() => {
    const list = tab === "market" ? activity : arena?.executions || [];
    return list.slice(0, 8);
  }, [tab, activity, arena]);

  return (
    <aside className="flex h-full max-h-[580px] select-none flex-col overflow-hidden">
      {/* ── TOP LAYER: Selected Market Snapshot ── */}
        <div className="shrink-0 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[#22c55e]" />
            </span>
            <span className="font-mono text-xs font-bold tracking-wide text-white">
              {shortPair(selected)}
            </span>
            <span className="font-mono text-[9px] text-zinc-400">
              {strategyCode(activePosition?.strategy)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-zinc-500">SPREAD</span>
            <span className="font-semibold text-zinc-200">
              {currentSpread} bps
            </span>
          </div>
        </div>

        {/* Snapshot Metrics Grid */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center font-mono">
          <div className="px-2 py-1.5">
            <p className="text-[8px] tracking-wider text-zinc-500 uppercase">
              Committed
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-white">
              {capitalCommitted > 0 ? money(capitalCommitted) : "$0.00"}
            </p>
          </div>
          <div className="px-2 py-1.5">
            <p className="text-[8px] tracking-wider text-zinc-500 uppercase">
              Positions
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-zinc-300">
              {openPositions.length ? `${openPositions.length} Live` : "0 Open"}
            </p>
          </div>
          <div className="px-2 py-1.5">
            <p className="text-[8px] tracking-wider text-zinc-500 uppercase">
              Model
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#22c55e]">
              {strategyCode(activePosition?.strategy)}
            </p>
          </div>
        </div>
      </div>

      {/* ── MIDDLE LAYER: Active Execution ── */}
      <div className="shrink-0 p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-[0.16em] text-zinc-500 uppercase">
            Active Execution
          </span>
          <span className="font-mono text-[9px] text-zinc-400">
            {activePosition ? "ROUTING IN-FLIGHT" : "IDLE"}
          </span>
        </div>

        {activePosition ? (
          <div className="p-2.5 font-mono">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">
                {routeNotation(activePosition.symbol)}
              </span>
              <span className="font-semibold text-white">
                {money(activePosition.capitalUsd)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-400">
              <span className="truncate">{activePosition.strategy}</span>
              <span className="text-zinc-300">
                entry: {activePosition.spreadBps} bps
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-2/3 animate-pulse bg-[#22c55e]" />
              </div>
              <span className="text-[8px] font-bold tracking-wider text-[#22c55e]">
                EXECUTING
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-3.5 text-center">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Activity className="size-3 animate-pulse text-zinc-500" />
              <span className="font-mono text-[10px] text-zinc-300">
                Scanning spread routes…
              </span>
            </div>
            <p className="mt-1 font-mono text-[8px] text-zinc-600">
              Threshold: ≥ 3.0 bps · Latency: ~12ms
            </p>
          </div>
        )}
      </div>

      {/* ── BOTTOM LAYER: Recent Completed Executions ── */}
      <div className="flex min-h-0 flex-1 flex-col lg:bg-[#0c0d10]">
        <div className="flex shrink-0 items-center justify-between px-3.5 py-2">
          <span className="text-[9px] font-bold tracking-[0.16em] text-zinc-500 uppercase">
            Execution Ledger
          </span>
          <div className="flex items-center gap-1 font-mono text-[9px]">
            <button
              type="button"
              onClick={() => setTab("market")}
              className={`px-1.5 py-0.5 transition-colors ${tab === "market" ? "text-white underline underline-offset-4" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {shortPair(selected).split("/")[0]}
            </button>
            <button
              type="button"
              onClick={() => setTab("all")}
              className={`px-1.5 py-0.5 transition-colors ${tab === "all" ? "text-white underline underline-offset-4" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              All
            </button>
          </div>
        </div>

        {/* Ledger Column Headers */}
        <div className="grid shrink-0 grid-cols-[48px_56px_40px_38px_1fr] items-center gap-1 px-3 py-1.5 font-mono text-[8px] tracking-wider text-zinc-600 uppercase">
          <span>Time</span>
          <span>Route</span>
          <span>Model</span>
          <span>Side</span>
          <span className="text-right">Net P/L</span>
        </div>

        {/* Ledger Rows */}
        <div className="overflow-y-auto font-mono lg:divide-y lg:divide-[#16171d]/60">
          {displayedHistory.length ? (
            displayedHistory.map((entry, idx) => {
              const positive = Number(entry.pnlUsd) >= 0;
              const timeStr = new Date(entry.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              return (
                <div
                  key={`${entry.id || entry.positionId}-${entry.type || ""}-${idx}`}
                  className="grid grid-cols-[48px_56px_40px_38px_1fr] items-center gap-1 px-3 py-1.5 text-[9px] transition-colors hover:bg-[#13151c]"
                >
                  <span className="text-[8px] text-zinc-500">{timeStr}</span>
                  <span className="font-medium text-zinc-300">
                    {routeNotation(entry.symbol)}
                  </span>
                  <span className="text-[8px] text-zinc-500">
                    {strategyCode(entry.strategy)}
                  </span>
                  <span
                    className={
                      entry.type === "OPEN"
                        ? "text-[8px] text-amber-400"
                        : "text-[8px] text-zinc-400"
                    }
                  >
                    {entry.type}
                  </span>
                  <span
                    className={`text-right font-semibold ${
                      entry.type === "OPEN"
                        ? "text-zinc-600"
                        : positive
                          ? "text-[#22c55e]"
                          : "text-[#a855f7]"
                    }`}
                  >
                    {entry.type === "OPEN"
                      ? `${entry.spreadBps}b`
                      : `${positive ? "+" : ""}${money(entry.pnlUsd)}`}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-[10px] text-zinc-600">
              No recent executions
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function LedgerRow({ entry }) {
  const positive = Number(entry.pnlUsd) >= 0;
  return (
    <div className="grid grid-cols-[68px_80px_70px_1fr_auto] items-center gap-2 border-t border-[#18191d] px-4 py-2 font-mono text-[10px] hover:bg-[#101217]">
      <span className="text-[9px] text-zinc-600">
        {new Date(entry.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </span>
      <span className="font-semibold text-zinc-300">
        {routeNotation(entry.symbol)}
      </span>
      <span className="text-[9px] text-zinc-500">
        {strategyCode(entry.strategy)}
      </span>
      <span className="truncate text-[9px] text-zinc-500">
        {entry.type === "OPEN"
          ? "Routing liquidity"
          : entry.status || "Completed"}
      </span>
      <span
        className={`text-right font-semibold ${
          entry.type === "OPEN"
            ? "text-zinc-500"
            : positive
              ? "text-[#22c55e]"
              : "text-[#a855f7]"
        }`}
      >
        {entry.type === "OPEN"
          ? money(entry.capitalUsd)
          : `${positive ? "+" : ""}${money(entry.pnlUsd)}`}
      </span>
    </div>
  );
}
function ArenaTape({ arena }) {
  const items = [
    ...(arena?.executions || []),
    ...(arena?.executions || []),
  ].slice(0, 32);
  return (
    <div className="market-tape">
      <div className="market-tape-track">
        {items.map((entry, index) => (
          <span className="market-tape-item" key={`${entry.id}-${index}`}>
            <b>{shortPair(entry.symbol)}</b>
            <span>{entry.strategy}</span>
            <span
              className={
                entry.type === "OPEN" || entry.pnlUsd >= 0
                  ? "text-[#22c55e]"
                  : "text-[#a855f7]"
              }
            >
              {entry.type === "OPEN"
                ? `${entry.spreadBps} bps`
                : `${entry.pnlUsd >= 0 ? "+" : ""}${money(entry.pnlUsd)}`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
