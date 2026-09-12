"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";

const BOT_PROFIT_STORAGE_KEY = "nexora.bot-profit-state";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_PROFIT_RATE = 0.5;

function usd(value) {
  const amount = Number(value || 0);
  const digits = Math.abs(amount) >= 1 ? 2 : Math.abs(amount) >= 0.01 ? 4 : 6;
  return `$${amount.toFixed(digits)}`;
}

function readBotProfitState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BOT_PROFIT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeBotProfitState(state) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOT_PROFIT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota issues.
  }
}

function calculateLocalBotProfitAccrual({ nxrBalance, priceUsd, lastAccrualAt, now = Date.now() }) {
  const nxr = Math.max(0, Number(nxrBalance || 0));
  const safePrice = Math.max(0, Number(priceUsd || 0));
  const nowMs = new Date(now).getTime();
  const lastMs = new Date(lastAccrualAt || now).getTime();
  const validLastMs = Number.isFinite(lastMs) ? Math.min(lastMs, nowMs) : nowMs;
  const elapsedMs = Math.max(0, nowMs - validLastMs);
  const nxrValueUsd = nxr * safePrice;
  const weeklyProfitUsd = nxrValueUsd * WEEKLY_PROFIT_RATE;
  const rewardUsd = Number((weeklyProfitUsd * (elapsedMs / WEEK_MS)).toFixed(8));
  return {
    rewardUsd: rewardUsd > 0 ? rewardUsd : 0,
    nextAccrualAt: new Date(nowMs).toISOString(),
  };
}

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState(null);
  const [error, setError] = useState("");
  const [syncState, setSyncState] = useState("live");
  const retryDelayRef = useRef(5_000);
  const retryTimerRef = useRef(null);
  const previousBotProfitRef = useRef(null);
  const clientBotProfitRef = useRef(null);
  const [liveBotProfitSinceOpen, setLiveBotProfitSinceOpen] = useState(0);

  useEffect(() => {
    let active = true;

    function resolveAuthoritativeBotProfit({ nextPortfolio, localState, now }) {
      const nxrBalance = Number(nextPortfolio.nxrBalance || 0);
      const priceUsd = Number(nextPortfolio.priceUsd || 0);
      const localBase = Number(localState?.botProfitUsdt ?? nextPortfolio.botProfitUsdt ?? 0);
      const lastAccrualAt = localState?.botProfitAccrualAt || new Date(now).toISOString();
      const accrual = calculateLocalBotProfitAccrual({
        nxrBalance,
        priceUsd,
        lastAccrualAt,
        now,
      });
      const localWithAccrual = localBase + accrual.rewardUsd;
      const serverTotal = Number(nextPortfolio.botProfitUsdt || 0);
      const authoritativeTotal = Math.max(serverTotal, localWithAccrual);
      const authoritativeState = {
        botProfitUsdt: authoritativeTotal,
        botProfitAccrualAt: new Date(now).toISOString(),
        nxrBalance,
        priceUsd,
      };

      clientBotProfitRef.current = authoritativeState;
      writeBotProfitState(authoritativeState);

      const previousBotProfit = previousBotProfitRef.current;
      const delta =
        previousBotProfit === null
          ? 0
          : Math.max(0, authoritativeTotal - previousBotProfit);
      previousBotProfitRef.current = authoritativeTotal;
      setLiveBotProfitSinceOpen(delta);

      return { ...nextPortfolio, botProfitUsdt: authoritativeTotal };
    }

    function applyLocalBotProfitEstimate(nextPortfolio) {
      if (!nextPortfolio || typeof window === "undefined") return nextPortfolio;
      const now = Date.now();
      const localState = clientBotProfitRef.current || readBotProfitState();
      return resolveAuthoritativeBotProfit({
        nextPortfolio,
        localState,
        now,
      });
    }

    function retainLastKnownPortfolio() {
      const fallbackState = clientBotProfitRef.current || readBotProfitState();
      if (!fallbackState) return;
      const now = Date.now();
      const accrual = calculateLocalBotProfitAccrual({
        nxrBalance: Number(fallbackState.nxrBalance || 0),
        priceUsd: Number(fallbackState.priceUsd || 0),
        lastAccrualAt: fallbackState.botProfitAccrualAt || new Date(now).toISOString(),
        now,
      });
      const nextState = {
        ...fallbackState,
        botProfitUsdt: Number(fallbackState.botProfitUsdt || 0) + accrual.rewardUsd,
        botProfitAccrualAt: accrual.nextAccrualAt,
      };
      clientBotProfitRef.current = nextState;
      writeBotProfitState(nextState);
      setPortfolio((currentPortfolio) =>
        currentPortfolio
          ? { ...currentPortfolio, botProfitUsdt: nextState.botProfitUsdt }
          : {
              botProfitUsdt: nextState.botProfitUsdt,
              nxrBalance: nextState.nxrBalance,
              priceUsd: nextState.priceUsd,
              usdtBalance: 0,
              nxrValueUsd: nextState.nxrBalance * nextState.priceUsd,
              costBasisKnown: false,
              totalPnlUsd: 0,
              balanceKes: 0,
              totalDepositedKes: 0,
              totalDepositedKnown: false,
              realisedPnlUsd: 0,
              unrealisedPnlUsd: 0,
            },
      );
    }

    async function syncBotRewards() {
      try {
        await account.get();
        const jwt = await account.createJWT();
        const response = await fetch("/api/bots", {
          method: "POST",
          headers: { Authorization: `Bearer ${jwt.jwt}` },
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.message || "Could not sync bot rewards.");
        }
      } catch {
        // Preserve the current page state if the rewards sync misses.
      }
    }

    async function load() {
      try {
        await account.get();
        const jwt = await account.createJWT();
        const response = await fetch("/api/portfolio", {
          headers: { Authorization: `Bearer ${jwt.jwt}` },
          cache: "no-store",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (!active) return;

        const localState = clientBotProfitRef.current || readBotProfitState();
        const nextPortfolio = resolveAuthoritativeBotProfit({
          nextPortfolio: result,
          localState,
          now: Date.now(),
        });
        setPortfolio(nextPortfolio);
        setSyncState("live");
        retryDelayRef.current = 5_000;
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      } catch (loadError) {
        if (!active) return;
        const fallbackState = clientBotProfitRef.current || readBotProfitState();
        if (fallbackState) {
          retainLastKnownPortfolio();
          setSyncState("reconnecting");
          retryTimerRef.current = setTimeout(() => {
            retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30_000);
            load();
          }, retryDelayRef.current);
          return;
        }
        setSyncState("offline");
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load portfolio.",
        );
      }
    }

    const existingState = readBotProfitState();
    if (existingState) {
      clientBotProfitRef.current = existingState;
    }

    load();
    syncBotRewards();
    const loadInterval = setInterval(load, 5_000);
    const rewardInterval = setInterval(() => {
      if (!clientBotProfitRef.current) return;
      const current = clientBotProfitRef.current;
      const now = Date.now();
      const accrual = calculateLocalBotProfitAccrual({
        nxrBalance: current.nxrBalance,
        priceUsd: current.priceUsd,
        lastAccrualAt: current.botProfitAccrualAt,
        now,
      });
      const nextState = {
        ...current,
        botProfitUsdt: Number(current.botProfitUsdt || 0) + accrual.rewardUsd,
        botProfitAccrualAt: accrual.nextAccrualAt,
      };
      clientBotProfitRef.current = nextState;
      writeBotProfitState(nextState);
      setPortfolio((currentPortfolio) =>
        currentPortfolio
          ? { ...currentPortfolio, botProfitUsdt: nextState.botProfitUsdt }
          : currentPortfolio,
      );
      const previousBotProfit = previousBotProfitRef.current;
      const delta =
        previousBotProfit === null
          ? 0
          : Math.max(0, nextState.botProfitUsdt - previousBotProfit);
      previousBotProfitRef.current = nextState.botProfitUsdt;
      setLiveBotProfitSinceOpen(delta);
    }, 5_000);
    const syncInterval = setInterval(syncBotRewards, 5 * 60 * 1000);

    return () => {
      active = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      clearInterval(loadInterval);
      clearInterval(rewardInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const pnl = Number(portfolio?.totalPnlUsd || 0);
  return (
    <main className="min-h-screen bg-[#090a0c] pb-20 text-white">
      <header className="flex h-14 items-center px-4">
        <button
          onClick={() => router.push("/trade")}
          className="text-xs text-zinc-500 hover:text-white"
        >
          ← Trade
        </button>
        <span className="ml-4 text-sm font-semibold">Portfolio</span>
      </header>
      <section className="px-5 pt-8">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : !portfolio ? (
          <p className="text-sm text-zinc-500">Loading portfolio…</p>
        ) : (
          <>
            {syncState !== "live" && (
              <div className="mb-3 inline-flex items-center rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[.18em] text-amber-300">
                {syncState === "reconnecting"
                  ? "Reconnecting • last good state"
                  : "Portfolio offline"}
              </div>
            )}
            <p className="text-[10px] font-bold tracking-[.2em] text-zinc-500 uppercase">
              Portfolio value
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {usd(portfolio.nxrValueUsd + portfolio.usdtBalance)}
            </p>
            {portfolio.costBasisKnown ? (
              <p
                className={`mt-2 text-sm ${pnl >= 0 ? "text-[#22c55e]" : "text-[#a855f7]"}`}
              >
                {pnl >= 0 ? "+" : ""}
                {usd(pnl)} total P/L
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-500">
                P/L tracking begins with your next NXR purchase.
              </p>
            )}
            <div className="mt-12 space-y-7">
              <Asset
                label="NXR"
                value={`${Number(portfolio.nxrBalance).toFixed(4)} NXR`}
                detail={`${usd(portfolio.nxrValueUsd)} · ${usd(portfolio.priceUsd)} each`}
              />
              <Asset
                label="USDT"
                value={usd(portfolio.usdtBalance)}
                detail="Available after NXR sales"
              />
              <Asset
                label="Bot profits"
                value={usd(portfolio.botProfitUsdt)}
                detail={
                  liveBotProfitSinceOpen > 0
                    ? `Live ${usd(liveBotProfitSinceOpen)} while open`
                    : "Accrued from NXR participation"
                }
              />
              <Asset
                label="KES"
                value={`KES ${Number(portfolio.balanceKes).toLocaleString()}`}
                detail="Available funding balance"
              />
            </div>
            <div className="mt-12 grid grid-cols-2 gap-y-7">
              <Metric
                label="NXR cost basis"
                value={
                  portfolio.costBasisKnown ? usd(portfolio.costBasisUsd) : "—"
                }
              />
              <Metric
                label="Total funded"
                value={
                  portfolio.totalDepositedKnown
                    ? `KES ${Number(portfolio.totalDepositedKes).toLocaleString()}`
                    : "—"
                }
              />
              <Metric
                label="Unrealised P/L"
                value={
                  portfolio.costBasisKnown
                    ? usd(portfolio.unrealisedPnlUsd)
                    : "—"
                }
              />
              <Metric
                label="Realised P/L"
                value={usd(portfolio.realisedPnlUsd)}
              />
              <Metric
                label="Return"
                value={
                  portfolio.costBasisKnown && portfolio.costBasisUsd > 0
                    ? `${((portfolio.unrealisedPnlUsd / portfolio.costBasisUsd) * 100).toFixed(4)}%`
                    : "—"
                }
              />
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Asset({ label, value, detail }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-xs text-zinc-500">{detail}</p>
      </div>
      <p className="font-mono text-sm">{value}</p>
    </div>
  );
}
function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[10px] tracking-wider text-zinc-500 uppercase">
        {label}
      </p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}
