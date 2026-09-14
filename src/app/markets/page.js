"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
import { cachedFetch } from "@/lib/client-fetch-cache";
import {
  ArrowLeft,
  ArrowLeftRight,
  Bot,
  ChevronDown,
  Coins,
  Layers,
  LineChart,
  Lock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UPCOMING_FEATURES, formatMarketPrice } from "@/lib/market-symbols";

const POLL_INTERVAL_MS = 2000;

function ShapeMark({ seed }) {
  const shapeTypes = ["circle", "square", "rectangle", "diamond"];
  const hash = [...(seed || "default")].reduce(
    (total, c) => total + c.charCodeAt(0),
    0,
  );
  const shape = shapeTypes[hash % shapeTypes.length];
  const shapeClass = {
    circle: "size-3 rounded-full",
    square: "size-3 rounded-[2px]",
    rectangle: "h-2.5 w-4 rounded-[2px]",
    diamond: "size-3 rotate-45 rounded-[2px]",
  }[shape];

  return (
    <span
      aria-hidden="true"
      className={`border-foreground block border-2 bg-black ${shapeClass}`}
    />
  );
}

function AssetBadge({ symbol, isNative }) {
  const colors = {
    N: "bg-green-500/20 text-green-500",
    B: "bg-orange-500/20 text-orange-400",
    E: "bg-blue-500/20 text-blue-400",
    S: "bg-purple-500/20 text-purple-400",
    D: "bg-yellow-500/20 text-yellow-400",
    P: "bg-green-500/20 text-green-400",
    A: "bg-sky-500/20 text-sky-400",
    X: "bg-indigo-500/20 text-indigo-400",
    L: "bg-blue-600/20 text-blue-300",
  };
  const letter = symbol[0].toUpperCase();
  const colorClass = colors[letter] || "bg-zinc-700/40 text-zinc-300";

  return (
    <span
      className={`flex size-8 items-center justify-center rounded-full text-xs font-bold ${colorClass}`}
    >
      {letter}
    </span>
  );
}

function ChangeCell({ change }) {
  const positive = Number(change) >= 0;
  return (
    <div
      className={`flex items-center gap-1 font-mono text-xs font-medium ${
        positive ? "text-green-500" : "text-purple-500"
      }`}
    >
      {positive ? (
        <TrendingUp className="size-3 shrink-0" />
      ) : (
        <TrendingDown className="size-3 shrink-0" />
      )}
      {positive ? "+" : ""}
      {Number(change).toFixed(2)}%
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 border-b border-border px-4 py-3.5">
      <div className="size-8 rounded-full bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-2.5 w-16 rounded bg-muted" />
      </div>
      <div className="hidden h-3 w-20 rounded bg-muted sm:block" />
      <div className="h-3 w-14 rounded bg-muted" />
      <div className="hidden h-3 w-28 rounded bg-muted md:block" />
      <div className="hidden h-3 w-20 rounded bg-muted lg:block" />
      <div className="h-7 w-14 rounded bg-muted" />
    </div>
  );
}

function MobileMarketRow({ market, onTrade }) {
  return (
    <div className="border-b border-border px-4 py-3.5 last:border-b-0">
      <div className="grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 overflow-hidden">
        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
          <AssetBadge symbol={market.base} isNative={market.isNative} />
          <div className="min-w-0">
            <span className="truncate text-sm font-semibold text-foreground">
              {market.base}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">/USDT</span>
            {market.isNative && (
              <span className="shrink-0 rounded bg-green-500/20 px-1 py-0.5 text-[8px] font-bold text-green-500">
                NXR
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {market.name}
          </p>
        </div>
        <p className="shrink-0 whitespace-nowrap font-mono text-sm font-medium text-foreground tabular-nums">
          {formatMarketPrice(market.price, market.decimals)}
        </p>
      </div>
      <div className="mt-3 flex min-h-[24px] items-center justify-between pl-11">
        <div className="min-w-0 overflow-hidden">
        </div>
        <button
          type="button"
          onClick={onTrade}
          className="shrink-0 rounded border border-border px-3 py-1.5 text-[10px] font-semibold tracking-wide text-foreground uppercase transition-colors hover:border-green-500 hover:bg-green-500 hover:text-black"
        >
          Trade
        </button>
      </div>
    </div>
  );
}

function MobileFeatureView({ feature, onClose, onGoToMarkets }) {
  if (!feature) return null;
  const Icon = feature.icon || Lock;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background pb-16 text-foreground">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-muted px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-bold tracking-wide"
        >
          <ArrowLeft className="size-4" />
          <span>Markets</span>
        </button>
        <span className="flex items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-green-500 uppercase">
          <Lock className="size-2.5" />
          Coming Soon
        </span>
      </div>

      {/* Main full viewport content */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-8">
        <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-zinc-800 bg-muted text-green-500 shadow-2xl">
          <Icon className="size-8" />
        </div>

        <div className="mb-6 text-center">
          <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-muted px-3 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-green-500 uppercase">
              NEXORA {feature.name.toUpperCase()}
            </span>
            <span className="py-0.2 rounded bg-zinc-800 px-1.5 font-mono text-[8px] text-muted-foreground">
              {feature.badge}
            </span>
          </div>
          <h1 className="mb-2 text-xl leading-snug font-bold tracking-tight text-foreground">
            {feature.tagline}
          </h1>
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
        </div>

        {/* Highlights */}
        <div className="mb-6 grid grid-cols-2 gap-2.5">
          {feature.highlights.map((h, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-muted p-3 text-left"
            >
              <p className="mb-1 text-[9px] tracking-wider text-muted-foreground uppercase">
                {h.label}
              </p>
              <p className="font-mono text-xs font-semibold text-foreground">
                {h.value}
              </p>
            </div>
          ))}
        </div>

        {/* Phase Status */}
        <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-muted px-4 py-2.5 text-xs">
          <span className="text-muted-foreground">Current Phase:</span>
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            {feature.status}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-green-500 py-2.5 text-xs font-bold tracking-wider text-black uppercase shadow-md transition-colors hover:bg-green-500/90"
          >
            Stay on Markets
          </button>
          <button
            type="button"
            onClick={onGoToMarkets}
            className="w-full rounded-md border border-border bg-muted py-2.5 text-xs font-medium tracking-wider text-foreground uppercase transition-colors hover:text-foreground"
          >
            Go to Trading Terminal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState(null);

  useEffect(() => {
    account
      .get()
      .then((u) => setUser(u))
      .catch(() => router.replace("/auth"));
  }, [router]);

  useEffect(() => {
    let inFlight = false;
    const fetchSummary = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await cachedFetch("/api/market/summary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setMarkets(data.markets || []);
        }
      } catch {
        // Keep existing data on failure
      } finally {
        inFlight = false;
        setLoading(false);
      }
    };

    fetchSummary();
    const id = setInterval(fetchSummary, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const displayName = user?.name || user?.email || "Nexora participant";
  const avatarSeed = user?.$id || displayName;

  function goToTrade(symbol) {
    router.push(`/trade?market=${symbol}`);
  }

  return (
    <main
      className="min-h-screen pb-24 md:pb-0"
      style={{ background: "#090a0c", color: "#f5f5f5" }}
    >
      {/* ── Desktop Header ── */}
      <header
        className="relative z-20 hidden h-14 items-center gap-8 border-b px-4 lg:flex"
        style={{ background: "#0d0d0f", borderColor: "#16181d" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex size-7 items-center justify-center rounded text-xs font-black"
            style={{ background: "#f5f5f5", color: "#090a0c" }}
          >
            N
          </div>
          <span className="text-sm font-bold tracking-wide">NEXORA</span>
        </div>

        <nav className="flex items-center gap-4 overflow-x-auto text-xs whitespace-nowrap text-zinc-500">
          <button
            onClick={() => router.push("/trade?focus=buy")}
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Buy Crypto
          </button>
          <button className="font-medium text-white">Markets</button>
          <button
            onClick={() => router.push("/trade")}
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Trade
          </button>
          {UPCOMING_FEATURES.map((feat) => (
            <button
              key={feat.id}
              type="button"
              onClick={() =>
                toast.info(`${feat.name} — Coming Soon`, {
                  description: feat.description,
                })
              }
              className="group flex shrink-0 items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-300"
              title={`${feat.name} — Coming Soon`}
            >
              <span>{feat.name}</span>
              <Lock className="size-2.5 opacity-60 transition-opacity group-hover:opacity-100" />
              <span className="py-0.2 rounded bg-zinc-800/90 px-1 text-[8px] font-semibold text-muted-foreground transition-colors group-hover:bg-emerald-950/40 group-hover:text-emerald-400">
                SOON
              </span>
            </button>
          ))}
          <button className="text-zinc-400 transition-colors hover:text-white">
            Portfolio
          </button>
          <button
            onClick={() => router.push("/referrals")}
            className="text-zinc-400 transition-colors hover:text-white"
          >
            Referrals
          </button>
        </nav>

        <div className="ml-auto">
          <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <SheetTrigger
              render={
                <button
                  type="button"
                  aria-label="Open profile"
                  className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
                />
              }
            >
              <Avatar className="border border-zinc-700 bg-black">
                <AvatarFallback className="bg-black">
                  <ShapeMark seed={avatarSeed} />
                </AvatarFallback>
              </Avatar>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(22rem,85vw)]">
              <SheetHeader>
                <SheetTitle>Profile</SheetTitle>
                <SheetDescription>Manage your Nexora account.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div className="markets-page-content mx-auto max-w-6xl px-0 py-0 md:px-4 md:py-6">
        {/* Back + Title */}
        <div className="markets-page-title mb-0 flex items-center gap-3 px-4 py-4 md:mb-6 md:px-0 md:py-0">
          <button
            onClick={() => router.push("/trade")}
            className="flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Terminal
          </button>
          <span className="text-zinc-700">/</span>
          <h1 className="text-sm font-semibold text-foreground">Markets</h1>
        </div>

        {/* Phone-native market list: price gets its own right-aligned column,
            while change and the trade action get a dedicated second line. */}
        <div
          className="markets-mobile-list overflow-hidden border border-border bg-card md:hidden"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            <span>Markets</span>
            <span>Live prices</span>
          </div>
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : markets.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              Could not load market data. Retrying…
            </div>
          ) : (
            markets.map((market) => (
              <MobileMarketRow
                key={market.symbol}
                market={market}
                onTrade={() => goToTrade(market.symbol)}
              />
            ))
          )}
        </div>

        {/* Table header */}
        <div
          className="hidden rounded-t-lg border border-b-0 border-border bg-card md:block"
        >
          <div
            className="grid items-center gap-4 border-b border-border px-4 py-2.5 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
            style={{
              gridTemplateColumns: "1fr 1fr 80px 1fr 1fr 80px",
            }}
          >
            <span>Asset</span>
            <span className="text-right">Price</span>
            <span className="text-right">24h %</span>
            <span className="hidden text-right md:block">24h High / Low</span>
            <span className="hidden text-right lg:block">Volume (USDT)</span>
            <span className="text-right">Trade</span>
          </div>
        </div>

        {/* Rows */}
        <div
          className="hidden overflow-hidden rounded-b-lg border border-border bg-card md:block"
        >
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : markets.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-500">
              Could not load market data. Retrying…
            </div>
          ) : (
            markets.map((market, idx) => (
              <div
                key={market.symbol}
                className="grid cursor-pointer items-center gap-4 border-b border-border px-4 py-3.5 transition-colors hover:bg-muted/50"
                style={{
                  gridTemplateColumns: "1fr 1fr 80px 1fr 1fr 80px",
                }}
                onClick={() => goToTrade(market.symbol)}
              >
                {/* Asset name + icon */}
                <div className="flex min-w-0 items-center gap-3">
                  <AssetBadge symbol={market.base} isNative={market.isNative} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">
                        {market.base}
                      </span>
                      {market.isNative && (
                        <span className="hidden rounded bg-green-500/20 px-1 py-0.5 text-[8px] font-bold tracking-wide text-green-500 uppercase sm:inline">
                          NATIVE
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {market.name}
                    </p>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="font-mono text-sm font-medium text-foreground tabular-nums">
                    {formatMarketPrice(market.price, market.decimals)}
                  </p>
                </div>

                {/* High / Low */}
                <div className="hidden text-right md:block">
                  <p className="font-mono text-[11px] text-green-500 tabular-nums">
                    {formatMarketPrice(market.high24h, market.decimals)}
                  </p>
                  <p className="font-mono text-[11px] text-purple-500 tabular-nums">
                    {formatMarketPrice(market.low24h, market.decimals)}
                  </p>
                </div>

                {/* Volume */}
                <div className="hidden text-right lg:block">
                  <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {market.quoteVolume24h >= 1_000_000
                      ? `$${(market.quoteVolume24h / 1_000_000).toFixed(2)}M`
                      : market.quoteVolume24h >= 1_000
                        ? `$${(market.quoteVolume24h / 1_000).toFixed(2)}K`
                        : `$${market.quoteVolume24h.toFixed(2)}`}
                  </p>
                </div>

                {/* Trade button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goToTrade(market.symbol);
                    }}
                    className="rounded border border-border px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase transition-colors hover:border-green-500 hover:bg-green-500 hover:text-black"
                  >
                    Trade
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="fixed right-0 bottom-0 left-0 z-40 grid h-14 grid-cols-6 items-center border-t border-border bg-background px-1 md:hidden"
      >
        {/* 1. Trade */}
        <button
          type="button"
          onClick={() => router.push("/trade")}
          className="flex w-full flex-col items-center justify-center py-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftRight className="mb-0.5 size-4" />
          <span className="tracking-tight uppercase">Trade</span>
        </button>

        {/* 2. Markets */}
        <button
          type="button"
          onClick={() => setActiveFeature(null)}
          className={`flex w-full flex-col items-center justify-center py-1 text-[9px] transition-colors ${
            !activeFeature
              ? "font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LineChart className="mb-0.5 size-4" />
          <span className="tracking-tight uppercase">Markets</span>
        </button>

        {/* 3. Futures (Coming Soon) */}
        <button
          type="button"
          onClick={() => setActiveFeature(UPCOMING_FEATURES[0])}
          className={`relative flex w-full flex-col items-center justify-center py-1 text-[9px] transition-colors ${
            activeFeature?.id === "futures"
              ? "text-green-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="relative mb-0.5">
            <TrendingUp className="size-4" />
            <Lock className="absolute -top-1 -right-1.5 size-2 text-muted-foreground" />
          </div>
          <span className="tracking-tight uppercase">Futures</span>
        </button>

        {/* 4. Earn (Coming Soon) */}
        <button
          type="button"
          onClick={() => setActiveFeature(UPCOMING_FEATURES[2])}
          className={`relative flex w-full flex-col items-center justify-center py-1 text-[9px] transition-colors ${
            activeFeature?.id === "earn"
              ? "text-green-500"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="relative mb-0.5">
            <Coins className="size-4" />
            <Lock className="absolute -top-1 -right-1.5 size-2 text-muted-foreground" />
          </div>
          <span className="tracking-tight uppercase">Earn</span>
        </button>

        {/* 5. Referrals */}
        <button
          type="button"
          onClick={() => router.push("/referrals")}
          className="flex w-full flex-col items-center justify-center py-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Users className="mb-0.5 size-4" />
          <span className="tracking-tight uppercase">Referrals</span>
        </button>

        {/* 6. Profile */}
        <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                aria-label="Open profile"
                className="flex w-full flex-col items-center justify-center py-1 text-[9px] text-muted-foreground transition-colors hover:text-foreground"
              >
                <User className="mb-0.5 size-4" />
                <span className="tracking-tight uppercase">Profile</span>
              </button>
            }
          />
          <SheetContent side="right" className="w-[min(22rem,85vw)]">
            <SheetHeader>
              <SheetTitle>Profile</SheetTitle>
              <SheetDescription>Manage your Nexora account.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </nav>

      {/* Full Viewport Coming Soon Screen on Mobile (No modals, no cards) */}
      {activeFeature && (
        <MobileFeatureView
          feature={activeFeature}
          onClose={() => setActiveFeature(null)}
          onGoToMarkets={() => router.push("/trade")}
        />
      )}
    </main>
  );
}
