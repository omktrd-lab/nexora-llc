"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account } from "@/lib/appwrite";
import { cachedFetch } from "@/lib/client-fetch-cache";
import {
  ArrowLeft,
  ArrowLeftRight,
  Bell,
  Bot,
  ChevronDown,
  CircleHelp,
  Coins,
  CheckCircle2,
  Eye,
  EyeOff,
  Layers,
  LineChart,
  LoaderCircle,
  Lock,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NxrMarketChart } from "@/components/nxr-market-chart";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MARKETS,
  MARKET_MAP,
  UPCOMING_FEATURES,
  formatMarketPrice,
} from "@/lib/market-symbols";

const mobileNavItems = [
  { label: "Swap", icon: ArrowLeftRight },
  { label: "Markets", icon: LineChart },
  { label: "Referrals", icon: Users },
  { label: "Profile", icon: null },
];

function ShapeMark({ seed }) {
  const shapeTypes = ["circle", "square", "rectangle", "diamond"];
  const hash = [...(seed || "default")].reduce(
    (total, character) => total + character.charCodeAt(0),
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

/** Dropdown to select the active trading pair */
function TickerSelector({ activeSymbol, onSelectSymbol }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const market = MARKET_MAP[activeSymbol] ?? MARKET_MAP["NXRUSDT"];

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative mr-7 flex items-center gap-2 border-r pr-7"
    >
      <button
        type="button"
        className="flex items-center gap-2 transition-opacity hover:opacity-80"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="terminal-coin flex size-7 items-center justify-center rounded-full text-[10px] font-bold">
          {market.base[0]}
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold">{market.base}/USDT</p>
          <p className="text-muted-foreground text-[10px]">{market.name}</p>
        </div>
        <ChevronDown
          className={`ml-1 size-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-56 rounded border border-[#16181d] bg-[#0d0d0f] py-1 shadow-xl">
          {MARKETS.map((m) => (
            <button
              key={m.symbol}
              type="button"
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-[#16181d] ${
                m.symbol === activeSymbol
                  ? "text-foreground bg-[#16181d]"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                onSelectSymbol(m.symbol);
                setOpen(false);
              }}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#1c1c1f] text-[9px] font-bold text-white">
                {m.base[0]}
              </span>
              <span className="text-foreground font-medium">{m.base}/USDT</span>
              {m.isNative && (
                <span className="ml-auto rounded bg-green-500/20 px-1 py-0.5 text-[8px] font-semibold text-green-400">
                  NATIVE
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sidebar Market Pairs List — locked within the terminal layout below Place Order */
function SidebarMarketList({ activeSymbol, onSelectSymbol }) {
  const [summaryData, setSummaryData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let inFlight = false;
    const fetchSummary = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await cachedFetch("/api/market/summary", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.markets)) {
            setSummaryData(data.markets);
          }
        }
      } catch {
        // Keep existing on failure
      } finally {
        inFlight = false;
      }
    };

    fetchSummary();
    const id = setInterval(fetchSummary, 2000);
    return () => clearInterval(id);
  }, []);

  const merged = MARKETS.map((m) => {
    const live = summaryData.find((s) => s.symbol === m.symbol);
    return {
      ...m,
      price: live?.price ?? 0,
      change24h: live?.change24h ?? 0,
    };
  });

  const filtered = search.trim()
    ? merged.filter(
        (m) =>
          m.base.toLowerCase().includes(search.toLowerCase()) ||
          m.name.toLowerCase().includes(search.toLowerCase()),
      )
    : merged;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-[#16181d] bg-[#0d0d0f]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#16181d] bg-[#0d0d0f] px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-zinc-300 uppercase">
            Markets
          </span>
          <span className="py-0.2 rounded bg-zinc-800 px-1 font-mono text-[8px] text-zinc-400">
            {merged.length}
          </span>
        </div>
        <input
          type="text"
          placeholder="Filter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-20 rounded border border-transparent bg-[#16181d] px-2 py-0.5 text-[10px] text-white placeholder-zinc-500 focus:border-zinc-700 focus:outline-none"
        />
      </div>

      {/* Column Labels */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-[#16181d] bg-[#090a0c] px-3 py-1 text-[9px] font-semibold tracking-wider text-zinc-500 uppercase">
        <span>Pair</span>
        <span className="text-right">Price</span>
        <span className="w-12 text-right">24h%</span>
      </div>

      {/* Internal scrollable list — strictly locked within sidebar height */}
      <div className="min-h-0 flex-1 divide-y divide-white/[0.02] overflow-y-auto">
        {filtered.map((m) => {
          const isSelected = m.symbol === activeSymbol;
          const isPositive = m.change24h >= 0;
          return (
            <button
              key={m.symbol}
              type="button"
              onClick={() => onSelectSymbol(m.symbol)}
              className={`grid w-full grid-cols-[1fr_auto_auto] items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[#16181d] ${
                isSelected
                  ? "border-l-2 border-[#22c55e] bg-[#16181d]"
                  : "border-l-2 border-transparent"
              }`}
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-[11px] font-semibold text-white">
                  {m.base}
                </span>
                <span className="text-[9px] text-zinc-500">/USDT</span>
                {m.isNative && (
                  <span className="shrink-0 rounded bg-emerald-500/20 px-1 text-[7px] font-bold text-[#22c55e]">
                    NXR
                  </span>
                )}
              </div>
              <span className="text-right font-mono text-[11px] text-zinc-200 tabular-nums">
                {m.price > 0 ? formatMarketPrice(m.price, m.decimals) : "--"}
              </span>
              <span
                className={`w-12 text-right font-mono text-[10px] tabular-nums ${
                  isPositive ? "text-[#22c55e]" : "text-[#a855f7]"
                }`}
              >
                {isPositive ? "+" : ""}
                {Number(m.change24h).toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Full-viewport mobile feature surface — intentionally flat, not modal/card UI. */
function MobileFeatureView({ feature, onClose, onGoToMarkets }) {
  if (!feature) return null;
  const Icon = feature.icon || Lock;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-[#090a0c] pb-14 text-white">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          <span>Trading Terminal</span>
        </button>
        <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-[#22c55e] uppercase">
          <Lock className="size-2.5" />
          Coming Soon
        </span>
      </div>

      <div className="flex-1 px-5 pt-10 pb-8">
        <div className="mb-12">
          <div className="mb-5 flex items-center gap-3 text-[#22c55e]">
            <Icon className="size-5" />
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase">
              Nexora {feature.name}
            </span>
            <span className="text-zinc-600">/ {feature.badge}</span>
          </div>
          <h1 className="mb-3 text-3xl leading-tight font-semibold tracking-tight text-white">
            {feature.tagline}
          </h1>
          <p className="max-w-md text-sm leading-6 text-zinc-400">
            {feature.description}
          </p>
        </div>

        <div className="mb-10 grid grid-cols-2 gap-x-8 gap-y-7">
          {feature.highlights.map((h, i) => (
            <div key={i}>
              <p className="mb-1 text-[10px] tracking-wider text-zinc-500 uppercase">
                {h.label}
              </p>
              <p className="font-mono text-sm font-semibold text-white">
                {h.val}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-10 flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Current phase</span>
          <span className="flex items-center gap-1.5 font-medium text-zinc-200">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            {feature.status}
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs font-semibold tracking-wider uppercase">
          <button
            type="button"
            onClick={onClose}
            className="text-[#22c55e] transition-colors hover:text-white"
          >
            Return to trade
          </button>
          <button
            type="button"
            onClick={onGoToMarkets}
            className="text-zinc-500 transition-colors hover:text-white"
          >
            Spot markets
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [balanceKes, setBalanceKes] = useState(0);
  const [nxrBalance, setNxrBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isFundPanelOpen, setIsFundPanelOpen] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [tickerData, setTickerData] = useState(null);
  const [activeFeature, setActiveFeature] = useState(null);
  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [isBuyCryptoFocused, setIsBuyCryptoFocused] = useState(false);

  // Active trading pair — read from ?market= URL param on load
  const [activeSymbol, setActiveSymbol] = useState(() => {
    const urlMarket =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("market")
        : null;
    return MARKET_MAP[urlMarket?.toUpperCase()]
      ? urlMarket.toUpperCase()
      : "NXRUSDT";
  });

  // Keep activeSymbol in sync when query param changes
  useEffect(() => {
    const marketParam = searchParams.get("market");
    if (marketParam && MARKET_MAP[marketParam.toUpperCase()]) {
      setActiveSymbol(marketParam.toUpperCase());
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("focus") !== "buy") {
      setIsBuyCryptoFocused(false);
      return undefined;
    }

    setIsBuyCryptoFocused(true);
    const timeoutId = window.setTimeout(() => {
      setIsBuyCryptoFocused(false);
    }, 6000);
    return () => window.clearTimeout(timeoutId);
  }, [searchParams]);

  useEffect(() => {
    account
      .get()
      .then((currentUser) => {
        setUser(currentUser);
        setPhoneNumber(currentUser.prefs?.safaricomPhoneNumber || "");
        const savedBalance = Number(currentUser.prefs?.balanceKes || 0);
        setBalanceKes(savedBalance);
        setNxrBalance(Number(currentUser.prefs?.nxrBalance || 0));
        setUsdtBalance(Number(currentUser.prefs?.usdtBalance || 0));
        setIsFundPanelOpen(savedBalance <= 0);
        setCheckingSession(false);
      })
      .catch(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const referrerId = urlParams.get("ref");
        const authUrl = referrerId ? `/auth?ref=${referrerId}` : "/auth";
        router.replace(authUrl);
      });
  }, [router]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    async function loadPortfolioSummary() {
      try {
        const jwt = await account.createJWT();
        const response = await cachedFetch("/api/portfolio", {
          headers: { Authorization: `Bearer ${jwt.jwt}` },
          cache: "no-store",
        });
        if (!response.ok) return;
        const result = await response.json();
        if (active) setPortfolioSummary(result);
      } catch {
        // The trade screen remains usable if the portfolio summary is delayed.
      }
    }
    loadPortfolioSummary();
    const interval = setInterval(loadPortfolioSummary, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, balanceKes, nxrBalance]);

  // Poll ticker data for the active symbol every 800ms
  useEffect(() => {
    let inFlight = false;
    const fetchTicker = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(
          `/api/market/ticker?symbol=${activeSymbol}`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const data = await response.json();
          setTickerData(data);
        }
      } catch {
        // Keep existing data on fetch failure
      } finally {
        inFlight = false;
      }
    };

    fetchTicker();
    const interval = setInterval(fetchTicker, 2000);
    return () => clearInterval(interval);
  }, [activeSymbol]);

  useEffect(() => {
    function syncFundPanel(event) {
      if (
        event?.key === "nexoraFundPanelCollapsed" &&
        event.newValue === "true"
      ) {
        setIsFundPanelOpen(false);
      }
    }

    if (window.localStorage.getItem("nexoraFundPanelCollapsed") === "true") {
      setIsFundPanelOpen(false);
    }
    window.addEventListener("storage", syncFundPanel);
    return () => window.removeEventListener("storage", syncFundPanel);
  }, []);

  function handlePaymentComplete() {
    setIsFundPanelOpen(false);
    window.localStorage.setItem("nexoraFundPanelCollapsed", "true");
  }

  function handleOpenFundPanel() {
    setIsFundPanelOpen(true);
    setIsDepositOpen(true);
    window.localStorage.removeItem("nexoraFundPanelCollapsed");
  }

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await account.deleteSession("current");
    router.replace("/auth");
  }

  const displayName = user?.name || user?.email || "Nexora participant";
  const avatarSeed = user?.$id || displayName;
  const activeMarket = MARKET_MAP[activeSymbol] ?? MARKET_MAP["NXRUSDT"];

  if (checkingSession) {
    return <main className="bg-background min-h-screen" />;
  }

  return (
    <main className="terminal-shell bg-background relative isolate min-h-screen overflow-hidden pb-16 md:pb-0">
      {/* ── Desktop Header ── */}
      <header className="terminal-header relative z-20 hidden h-14 items-center border-b px-4 lg:flex">
        <div className="flex min-w-0 items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="terminal-logo flex size-7 items-center justify-center rounded text-xs font-black">
              N
            </div>
            <span className="text-sm font-bold tracking-wide">NEXORA</span>
          </div>
          <nav className="text-muted-foreground flex items-center gap-4 overflow-x-auto text-xs whitespace-nowrap">
            <button
              type="button"
              onClick={() => router.push("/?focus=buy")}
              className="text-foreground transition-colors hover:text-white"
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
            <button className="terminal-nav-active">
              Trade <ChevronDown className="ml-0.5 inline size-3" />
            </button>
            <button
              onClick={() => router.push("/bots")}
              className="flex shrink-0 items-center gap-1 text-zinc-500 transition-colors hover:text-white"
            >
              <Bot className="size-3" /> Bots
            </button>
            {UPCOMING_FEATURES.filter(
              (feat) => feat.id !== "bots" && feat.id !== "launchpad",
            ).map((feat) => (
              <button
                key={feat.id}
                type="button"
                onClick={() =>
                  toast.info(`${feat.name} — Coming Soon`, {
                    description: feat.description,
                  })
                }
                className="group flex shrink-0 items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-200"
                title={`${feat.name} — Coming Soon`}
              >
                <span>{feat.name}</span>
                <Lock className="size-2.5 opacity-60 transition-opacity group-hover:opacity-100" />
                <span className="py-0.2 rounded bg-zinc-800/90 px-1 text-[8px] font-semibold text-zinc-400 transition-colors group-hover:bg-emerald-950/40 group-hover:text-emerald-400">
                  SOON
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => router.push("/fund?view=withdraw")}
              className="transition-colors hover:text-white"
            >
              Withdraw
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
          <div className="terminal-search flex w-44 items-center gap-2 rounded px-3 py-2 text-xs text-zinc-500">
            <Search className="size-3.5" /> Search markets
          </div>
          <button className="text-muted-foreground">
            <Bell className="size-4" />
          </button>
          <button className="text-muted-foreground">
            <CircleHelp className="size-4" />
          </button>
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
              <Avatar className="border-foreground border bg-black">
                <AvatarFallback className="bg-black">
                  <ShapeMark seed={avatarSeed} />
                </AvatarFallback>
              </Avatar>
            </SheetTrigger>
            <ProfileSheet
              displayName={displayName}
              email={user?.email}
              phoneNumber={phoneNumber}
              onEditPhone={() => {
                setIsEditingPhone(true);
                setIsProfileOpen(false);
              }}
              avatarSeed={avatarSeed}
              onSignOut={signOut}
              isSigningOut={isSigningOut}
            />
          </Sheet>
        </div>
      </header>

      {/* ── Desktop Trading Terminal ── */}
      <section
        id="overview"
        aria-label="Nexora trading terminal"
        className="relative z-10 hidden lg:block"
      >
        {/* Ticker strip */}
        <div className="terminal-ticker flex h-[72px] items-center border-b px-4">
          <button className="text-muted-foreground mr-3">
            <Menu className="size-5" />
          </button>

          {/* Pair selector dropdown */}
          <TickerSelector
            activeSymbol={activeSymbol}
            onSelectSymbol={setActiveSymbol}
          />

          {/* 24h stats */}
          <div className="grid grid-cols-4 gap-x-8 text-xs">
            <MarketMetric
              label="Last price"
              value={
                tickerData
                  ? formatMarketPrice(tickerData.price, activeMarket.decimals)
                  : "--"
              }
              accent
            />
            <MarketMetric
              label="24h change"
              value={
                tickerData
                  ? `${tickerData.change24h >= 0 ? "+" : ""}${Number(tickerData.change24h).toFixed(2)}%`
                  : "--"
              }
              accent={tickerData?.change24h >= 0}
              isNegative={tickerData?.change24h < 0}
            />
            <MarketMetric
              label="24h high"
              value={
                tickerData
                  ? formatMarketPrice(tickerData.high24h, activeMarket.decimals)
                  : "--"
              }
            />
            <MarketMetric
              label="24h volume"
              value={
                tickerData
                  ? `${(Number(tickerData.volume24h) / 1_000_000).toFixed(2)}M USDT`
                  : "--"
              }
            />
          </div>
        </div>

        {/* Main grid: chart + order entry */}
        <div className="terminal-grid grid h-[calc(100svh-128px)] max-h-[calc(100svh-128px)] grid-cols-[minmax(0,1fr)_330px] overflow-hidden">
          <div className="flex h-full min-w-0 flex-col overflow-hidden border-r">
            <NxrMarketChart
              externalTickerData={tickerData}
              symbol={activeSymbol}
            />
            <div className="terminal-bottom-panel shrink-0 border-t px-4 py-3">
              <div className="mb-4 flex items-center gap-6 text-xs">
                <button className="terminal-tab-active">Open orders</button>
                <button className="text-muted-foreground">Order history</button>
                <button className="text-muted-foreground">Trade history</button>
                <button className="text-muted-foreground">Assets</button>
              </div>
              <p className="text-muted-foreground py-5 text-center text-xs">
                No open orders
              </p>
            </div>
          </div>

          <aside
            className={`terminal-order-entry relative flex h-full min-w-0 flex-col overflow-hidden border-l border-[#16181d] ${isBuyCryptoFocused ? "ring-2 ring-inset ring-[#22c55e]/70" : ""}`}
          >
            {isBuyCryptoFocused && (
              <Tooltip open>
                <TooltipTrigger
                  render={
                    <span
                      aria-label="NXR trading panel"
                      className="absolute top-3 right-3 z-30 size-2"
                    />
                  }
                />
                <TooltipContent>
                  <p className="font-semibold text-primary">Buy NXR here</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Use this panel to buy or sell NXR beside the live market chart.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            <div className="shrink-0">
              <div className="flex items-center justify-between border-b border-[#16181d] px-4 py-2.5">
                <span className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
                  Place order
                </span>
                <Settings className="text-muted-foreground size-3.5" />
              </div>
              <div className="p-3">
                {activeSymbol === "NXRUSDT" ? (
                  <SwapPanel
                    balanceKes={balanceKes}
                    nxrBalance={nxrBalance}
                    usdtBalance={usdtBalance}
                    onBalancesUpdated={({
                      balanceKes: nextKes,
                      nxrBalance: nextNxr,
                      usdtBalance: nextUsdt,
                    }) => {
                      setBalanceKes(nextKes);
                      setNxrBalance(nextNxr);
                      if (Number.isFinite(nextUsdt)) setUsdtBalance(nextUsdt);
                    }}
                  />
                ) : (
                  <div className="py-2.5 text-center">
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {activeMarket.base}/USDT orders are view-only.
                      <br />
                      Switch to{" "}
                      <button
                        className="font-semibold text-green-500 underline hover:no-underline"
                        onClick={() => setActiveSymbol("NXRUSDT")}
                      >
                        NXR/USDT
                      </button>{" "}
                      to trade.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Market Pairs List — locked within terminal layout below Place Order */}
            <SidebarMarketList
              activeSymbol={activeSymbol}
              onSelectSymbol={setActiveSymbol}
            />
          </aside>
        </div>
      </section>

      {/* ── Mobile Section ── */}
      <section className="mobile-trade-surface lg:hidden">
        <div className="flex items-start justify-between px-4 pt-4 pb-3">
          <button
            type="button"
            onClick={() => router.push("/portfolio")}
            className="text-left"
          >
            <p className="text-muted-foreground text-xs font-medium tracking-[.2em]">
              PORTFOLIO
            </p>
            <p
              className={`mt-1 text-sm font-semibold ${Number(portfolioSummary?.totalPnlUsd || 0) >= 0 ? "text-[#22c55e]" : "text-[#a855f7]"}`}
            >
              {portfolioSummary?.costBasisKnown
                ? `${Number(portfolioSummary.totalPnlUsd) >= 0 ? "+" : ""}$${Number(portfolioSummary.totalPnlUsd).toFixed(2)} P/L`
                : `${nxrBalance.toFixed(4)} NXR`}
            </p>
          </button>
          <div className="pt-1 text-right">
            <p className="text-muted-foreground text-[10px] font-bold tracking-[.16em]">
              NXR / USDT
            </p>
            <p className="mt-1 font-mono text-xs text-white">
              {tickerData?.lastPrice
                ? `$${Number(tickerData.lastPrice).toFixed(4)}`
                : "—"}
            </p>
          </div>
        </div>
        <NxrMarketChart
          compact
          externalTickerData={tickerData}
          symbol={activeSymbol}
        />
      </section>

      <div className="pointer-events-none fixed inset-x-0 top-16 bottom-20 z-20 flex items-center justify-center px-5 md:bottom-0">
        <div className="pointer-events-auto w-full max-w-lg">
          {(!phoneNumber || isEditingPhone) && (
            <PhoneNumberPrompt
              initialValue={isEditingPhone ? phoneNumber : ""}
              isEditing={isEditingPhone}
              onSaved={(savedNumber) => {
                setPhoneNumber(savedNumber);
                setIsEditingPhone(false);
              }}
              onCancel={() => setIsEditingPhone(false)}
            />
          )}
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="fixed right-0 bottom-0 left-0 z-40 grid h-14 grid-cols-6 items-center border-t border-[#16181d] bg-[#090a0c] px-1 md:hidden">
        {/* 1. Deposit */}
        <button
          type="button"
          onClick={() => router.push("/fund")}
          className="flex w-full flex-col items-center justify-center py-1 text-[9px] text-zinc-400 transition-colors hover:text-white"
        >
          <WalletCards className="mb-0.5 size-4" />
          <span className="tracking-tight uppercase">Deposit</span>
        </button>

        {/* 2. Trade */}
        <button
          type="button"
          onClick={() => {
            setActiveFeature(null);
            setIsSwapOpen(true);
          }}
          className={`flex w-full flex-col items-center justify-center py-1 text-[9px] transition-colors ${
            !activeFeature ? "text-[#22c55e]" : "text-zinc-400 hover:text-white"
          }`}
        >
          <ArrowLeftRight className="mb-0.5 size-4" />
          <span className="tracking-tight uppercase">Trade</span>
        </button>

        {/* 2. Markets */}
        <button
          type="button"
          onClick={() => {
            setActiveFeature(null);
            router.push("/markets");
          }}
          className="flex w-full flex-col items-center justify-center py-1 text-[9px] text-zinc-400 transition-colors hover:text-white"
        >
          <LineChart className="mb-0.5 size-4" />
          <span className="tracking-tight uppercase">Markets</span>
        </button>

        {/* 3. Bots */}
        <button
          type="button"
          onClick={() => {
            setActiveFeature(null);
            router.push("/bots");
          }}
          className="flex w-full flex-col items-center justify-center py-1 text-[9px] text-zinc-400 transition-colors hover:text-white"
        >
          <Bot className="mb-0.5 size-4" />
          <span className="tracking-tight uppercase">Bots</span>
        </button>

        {/* 4. Earn (Coming Soon) */}
        <button
          type="button"
          onClick={() => setActiveFeature(UPCOMING_FEATURES[2])}
          className={`relative flex w-full flex-col items-center justify-center py-1 text-[9px] transition-colors ${
            activeFeature?.id === "earn"
              ? "text-[#22c55e]"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <div className="relative mb-0.5">
            <Coins className="size-4" />
            <Lock className="absolute -top-1 -right-1.5 size-2 text-zinc-400" />
          </div>
          <span className="tracking-tight uppercase">Earn</span>
        </button>

        {/* 5. Profile */}
        <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <SheetTrigger
            render={
              <button
                type="button"
                aria-label="Open profile"
                className="flex w-full flex-col items-center justify-center py-1 text-[9px] text-zinc-400 transition-colors hover:text-white"
              >
                <Avatar className="border-foreground mb-0.5 size-4 border bg-black">
                  <AvatarFallback className="bg-black">
                    <ShapeMark seed={avatarSeed} />
                  </AvatarFallback>
                </Avatar>
                <span className="tracking-tight uppercase">Profile</span>
              </button>
            }
          />
          <ProfileSheet
            displayName={displayName}
            email={user?.email}
            phoneNumber={phoneNumber}
            balanceKes={balanceKes}
            nxrBalance={nxrBalance}
            isBalanceVisible={isBalanceVisible}
            setIsBalanceVisible={setIsBalanceVisible}
            onEditPhone={() => setIsEditingPhone(true)}
            onSignOut={signOut}
          />
        </Sheet>
      </nav>

      {/* Full Viewport Coming Soon Screen on Mobile (No modals, no cards) */}
      {activeFeature && (
        <MobileFeatureView
          feature={activeFeature}
          onClose={() => setActiveFeature(null)}
          onGoToMarkets={() => {
            setActiveFeature(null);
            router.push("/markets");
          }}
        />
      )}

      {/* ── Mobile Swap Sheet ── */}
      <Sheet open={isSwapOpen} onOpenChange={setIsSwapOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85svh] overflow-y-auto rounded-t-2xl"
        >
          <div className="px-4 pt-2 pb-6">
            <SwapPanel
              balanceKes={balanceKes}
              nxrBalance={nxrBalance}
              usdtBalance={usdtBalance}
              onBalancesUpdated={({
                balanceKes: nextKes,
                nxrBalance: nextNxr,
                usdtBalance: nextUsdt,
              }) => {
                setBalanceKes(nextKes);
                setNxrBalance(nextNxr);
                if (Number.isFinite(nextUsdt)) setUsdtBalance(nextUsdt);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function MarketMetric({ label, value, accent = false, isNegative = false }) {
  return (
    <div>
      <p className="text-muted-foreground mb-1 text-[10px]">{label}</p>
      <p
        className={`font-mono text-xs ${!accent && !isNegative ? "text-foreground" : ""}`}
        style={
          accent ? { color: isNegative ? "#a855f7" : "#22c55e" } : undefined
        }
      >
        {value}
      </p>
    </div>
  );
}

function maskPhoneNumber(phoneNumber) {
  return phoneNumber;
}

function SwapPanel({ balanceKes, nxrBalance, usdtBalance, onBalancesUpdated }) {
  const [side, setSide] = useState("buy");
  const [buyCurrency, setBuyCurrency] = useState("kes");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (side === "sell") {
      setQuote(null);
      setIsQuoting(false);
      return undefined;
    }
    const buyAmount = Number(amount);
    const availableBuyBalance =
      buyCurrency === "kes" ? balanceKes : usdtBalance;
    if (
      !Number.isFinite(buyAmount) ||
      buyAmount <= 0 ||
      buyAmount > availableBuyBalance
    ) {
      setQuote(null);
      setIsQuoting(false);
      return undefined;
    }

    let isCurrent = true;
    const timeout = setTimeout(async () => {
      setIsQuoting(true);
      setError("");
      try {
        const jwtResponse = await account.createJWT();
        const response = await fetch(
          `/api/swap/quote?${buyCurrency === "kes" ? "kesAmount" : "usdAmount"}=${encodeURIComponent(buyAmount)}`,
          { headers: { Authorization: `Bearer ${jwtResponse.jwt}` } },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Could not calculate the quote.");
        }
        if (isCurrent) setQuote(result.quote);
      } catch (quoteError) {
        if (isCurrent) {
          setQuote(null);
          setError(
            quoteError instanceof Error
              ? quoteError.message
              : "Could not calculate the quote.",
          );
        }
      } finally {
        if (isCurrent) setIsQuoting(false);
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [amount, balanceKes, buyCurrency, side, usdtBalance]);

  function selectPercentage(percentage) {
    const available =
      side === "buy"
        ? buyCurrency === "kes"
          ? balanceKes
          : usdtBalance
        : nxrBalance;
    setAmount(String((available * percentage) / 100));
    setStatusMessage("");
    setError("");
  }

  async function executeSwap() {
    if ((side === "buy" && !quote) || isExecuting) return;
    setIsExecuting(true);
    setError("");
    setStatusMessage("Confirming swap and updating your balances...");
    try {
      const jwtResponse = await account.createJWT();
      const response = await fetch(
        side === "buy" ? "/api/swap/execute" : "/api/swap/sell",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwtResponse.jwt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            side === "buy"
              ? buyCurrency === "kes"
                ? { amountKes: Number(amount), requestId: crypto.randomUUID() }
                : { amountUsdt: Number(amount), requestId: crypto.randomUUID() }
              : { nxrAmount: Number(amount) },
          ),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "The swap could not be completed.");
      }
      onBalancesUpdated(result.balances);
      setAmount("");
      setQuote(null);
      setStatusMessage(
        side === "buy"
          ? `Swap complete. ${result.swap.nxrReceived.toFixed(4)} NXR added to your portfolio.`
          : `Sale complete. ${result.sale.receivedUsd.toFixed(4)} USDT added to your portfolio.`,
      );
    } catch (swapError) {
      setStatusMessage("");
      setError(
        swapError instanceof Error
          ? swapError.message
          : "The swap could not be completed.",
      );
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className="terminal-swap w-full max-w-sm">
      <div className="bg-muted mb-4 flex rounded p-0.5 text-xs">
        <button
          type="button"
          onClick={() => {
            setSide("buy");
            setAmount("");
            setQuote(null);
          }}
          className={`flex-1 rounded py-1.5 font-semibold ${side === "buy" ? "bg-[#22c55e] text-black" : "text-muted-foreground"}`}
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => {
            setSide("sell");
            setAmount("");
            setQuote(null);
          }}
          className={`flex-1 rounded py-1.5 font-semibold ${side === "sell" ? "bg-[#a855f7] text-white" : "text-muted-foreground"}`}
        >
          Sell
        </button>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs font-medium">
            Spot · Limit order
          </p>
          <h2 className="text-foreground mt-1 text-base font-semibold">
            {side === "buy"
              ? `Buy NXR with ${buyCurrency === "kes" ? "KES" : "USDT"}`
              : "Sell NXR for USDT"}
          </h2>
        </div>
        <p className="text-muted-foreground shrink-0 pt-1 text-right text-xs">
          {side === "sell"
            ? `${nxrBalance.toFixed(4)} NXR`
            : `${(buyCurrency === "kes" ? balanceKes : usdtBalance).toFixed(buyCurrency === "kes" ? 0 : 4)} ${buyCurrency === "kes" ? "KES" : "USDT"}`}
        </p>
      </div>
      <p className="text-muted-foreground mt-2 max-w-md text-xs leading-5">
        {side === "buy"
          ? `Use your ${buyCurrency === "kes" ? "KES" : "USDT"} balance at the current curve price.`
          : "Sell NXR into your USDT portfolio balance."}
      </p>

      {side === "buy" && (
        <div className="bg-muted mt-4 flex rounded p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setBuyCurrency("kes");
              setAmount("");
              setQuote(null);
            }}
            className={`flex-1 rounded py-1.5 font-semibold ${buyCurrency === "kes" ? "bg-[#22c55e] text-black" : "text-muted-foreground"}`}
          >
            KES
          </button>
          <button
            type="button"
            onClick={() => {
              setBuyCurrency("usdt");
              setAmount("");
              setQuote(null);
            }}
            className={`flex-1 rounded py-1.5 font-semibold ${buyCurrency === "usdt" ? "bg-[#22c55e] text-black" : "text-muted-foreground"}`}
          >
            USDT
          </button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label className="text-foreground font-medium" htmlFor="swap-amount">
            {side === "buy"
              ? `Amount in ${buyCurrency === "kes" ? "KES" : "USDT"}`
              : "Amount in NXR"}
          </label>
          <span className="text-muted-foreground">
            Available{" "}
            {(side === "buy"
              ? buyCurrency === "kes"
                ? balanceKes
                : usdtBalance
              : nxrBalance
            ).toLocaleString()}{" "}
            {side === "buy" ? buyCurrency.toUpperCase() : "NXR"}
          </span>
        </div>
        <Input
          id="swap-amount"
          type="number"
          min={side === "buy" && buyCurrency === "usdt" ? "0.0001" : "1"}
          max={
            side === "buy"
              ? buyCurrency === "kes"
                ? balanceKes
                : usdtBalance
              : nxrBalance
          }
          step={side === "buy" && buyCurrency === "kes" ? "1" : "0.0001"}
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Amount"
        />
        <div className="grid grid-cols-4 gap-1.5">
          {[25, 50, 75].map((percentage) => (
            <Button
              key={percentage}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selectPercentage(percentage)}
              disabled={
                (side === "buy"
                  ? buyCurrency === "kes"
                    ? balanceKes
                    : usdtBalance
                  : nxrBalance) <= 0 || isExecuting
              }
            >
              {percentage}%
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => selectPercentage(100)}
            disabled={
              (side === "buy"
                ? buyCurrency === "kes"
                  ? balanceKes
                  : usdtBalance
                : nxrBalance) <= 0 || isExecuting
            }
          >
            MAX
          </Button>
        </div>
      </div>

      {(quote || isQuoting) && (
        <div className="border-border mt-5 space-y-2 border-y py-3 text-xs">
          <QuoteRow
            label="NXR price"
            value={quote ? `$${quote.priceUsd.toFixed(4)}` : "Calculating..."}
          />
          <QuoteRow
            label="You receive"
            value={quote ? `${quote.nxrReceived.toFixed(4)} NXR` : "..."}
            strong
          />
          <QuoteRow
            label="Network fee"
            value={
              quote
                ? buyCurrency === "kes"
                  ? `KES ${quote.feeKes.toFixed(2)}`
                  : `${quote.feeUsd.toFixed(4)} USDT`
                : "..."
            }
          />
          <QuoteRow
            label="Price impact"
            value={quote ? `${(quote.priceImpact * 100).toFixed(3)}%` : "..."}
          />
        </div>
      )}

      {statusMessage && (
        <p
          className="mt-4 flex items-center gap-2 text-sm"
          style={{ color: "#22c55e" }}
          role="status"
        >
          <CheckCircle2
            className="size-4 shrink-0"
            aria-hidden="true"
            style={{ color: "#22c55e" }}
          />
          {statusMessage}
        </p>
      )}
      {error && (
        <p className="text-destructive mt-4 text-sm" role="alert">
          {error}
        </p>
      )}

      <Button
        type="button"
        className="mt-5 w-full text-white hover:opacity-90"
        style={{ backgroundColor: side === "buy" ? "#22c55e" : "#a855f7" }}
        onClick={executeSwap}
        disabled={
          (side === "buy" && (!quote || isQuoting)) || !amount || isExecuting
        }
      >
        {isExecuting && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        {isExecuting
          ? "Confirming order..."
          : side === "buy"
            ? "Buy NXR"
            : "Sell NXR for USDT"}
      </Button>
    </div>
  );
}

function QuoteRow({ label, value, strong = false }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={strong ? "text-foreground font-semibold" : "text-foreground"}
      >
        {value}
      </span>
    </div>
  );
}

function FundPanel({ onBalanceUpdated, onPaymentComplete, onCollapse }) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentKey, setPaymentKey] = useState("");
  const [ledgerRowId, setLedgerRowId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  useEffect(() => {
    if (!paymentKey) return undefined;

    const interval = setInterval(async () => {
      try {
        const jwtResponse = await account.createJWT();
        const response = await fetch(
          `/api/payment/status?paymentKey=${encodeURIComponent(paymentKey)}&ledgerRowId=${encodeURIComponent(ledgerRowId)}`,
          {
            headers: { Authorization: `Bearer ${jwtResponse.jwt}` },
          },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Could not verify the payment.");
        }
        const status = String(result.data?.status || "").toLowerCase();
        const successStatuses = new Set([
          "success",
          "successful",
          "completed",
          "complete",
          "paid",
          "succeeded",
        ]);
        if (successStatuses.has(status)) {
          const refreshedUser = await account.get();
          const confirmedBalance = Number(refreshedUser.prefs?.balanceKes || 0);
          const amountToAdd = Number(result.data?.amount || 0);
          onBalanceUpdated(confirmedBalance);
          onPaymentComplete(false);
          setPaymentStatus("Payment confirmed. Balance updated.");
          toast.success("Payment confirmed", {
            description: `KES ${amountToAdd.toLocaleString()} has been added to your balance.`,
          });
          setPaymentKey("");
          setLedgerRowId("");
          clearInterval(interval);
        } else if (
          ["failed", "cancelled", "canceled"].includes(status)
        ) {
          setPaymentStatus("Payment was not completed.");
          setError("The M-Pesa payment was not completed. You can try again.");
          setPaymentKey("");
          setLedgerRowId("");
          clearInterval(interval);
        }
      } catch {
        // Keep polling while ZetuPay processes the STK request.
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paymentKey, ledgerRowId, onBalanceUpdated, onPaymentComplete]);

  async function startPayment(event) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!Number.isSafeInteger(numericAmount) || numericAmount < 1) {
      setError("Enter a valid amount in KES.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const jwtResponse = await account.createJWT();
      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtResponse.jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: numericAmount }),
      });
      const result = await response.json();
      if (!response.ok || !result.data) {
        throw new Error(
          result.message || result.error || "Payment could not be started.",
        );
      }
      if (result.data.checkoutUrl) {
        setPaymentKey(result.data.paymentKey);
        setLedgerRowId(result.data.ledgerRowId);
        setPaymentStatus(
          "Redirecting to secure M-Pesa checkout. Keep this tab open while the payment is processed.",
        );
        toast.info("Redirecting to secure M-Pesa checkout", {
          description: "Complete the payment there and we will confirm your balance automatically.",
        });
        window.location.assign(result.data.checkoutUrl);
      } else if (result.data.directStk) {
        setPaymentKey(result.data.paymentKey);
        setLedgerRowId(result.data.ledgerRowId);
        setPaymentStatus(
          "Payment processing. Enter your M-Pesa PIN on your phone and keep this page open while we confirm it.",
        );
        setIsLoading(false);
      } else {
        throw new Error("Payment could not be started.");
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Payment could not be started.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div id="fund-account" className="w-full max-w-xl px-0 py-6 md:py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            Fund account
          </p>
          <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
            Add funds in KES
          </h2>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse fund account"
          title="Collapse fund account"
          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="text-muted-foreground mt-4 max-w-md text-sm leading-6">
        Start a secure M-Pesa payment using your saved number.
      </p>
      <form onSubmit={startPayment} className="mt-8 max-w-sm space-y-4">
        <label
          className="text-foreground block text-sm font-medium"
          htmlFor="fund-amount"
        >
          Amount in KES
        </label>
        <Input
          id="fund-amount"
          type="number"
          min="1"
          step="1"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Enter amount"
          required
        />
        {paymentStatus && (
          <p className="text-muted-foreground text-sm" role="status">
            {paymentStatus}
          </p>
        )}
        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isLoading || Boolean(paymentKey)}>
          {isLoading || paymentKey
            ? "Payment processing..."
            : "Pay with M-Pesa"}
        </Button>
      </form>
    </div>
  );
}

function PhoneNumberPrompt({ initialValue, isEditing, onSaved, onCancel }) {
  const [phoneNumber, setPhoneNumber] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function handlePhoneNumberChange(value) {
    setPhoneNumber(value.replace(/\D/g, "").slice(0, 10));
    setError("");
  }

  async function savePhoneNumber(event) {
    event.preventDefault();
    if (!/^(01|07)\d{8}$/.test(phoneNumber)) {
      setError("Enter a valid M-Pesa number beginning with 01 or 07.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Appwrite replaces the complete preferences object. Merge it first so
      // changing an M-Pesa number never discards balances or trade history.
      const currentUser = await account.get();
      await account.updatePrefs({
        ...(currentUser.prefs || {}),
        safaricomPhoneNumber: phoneNumber,
      });
      toast.success(
        isEditing ? "M-Pesa number updated" : "M-Pesa number saved",
        {
          description: `${maskPhoneNumber(phoneNumber)} is ready for funding.`,
        },
      );
      onSaved(phoneNumber);
    } catch {
      setError("We could not save your number. Please try again.");
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-xl border border-[#1e1e22] bg-[#0d0d0f] px-4 py-5 text-left md:px-8 md:py-7">
      <p className="text-muted-foreground text-sm font-medium">
        Before you fund your account
      </p>
      <h1 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {isEditing ? "Edit your M-Pesa number" : "Add your M-Pesa number"}
      </h1>
      <p className="text-muted-foreground mt-4 max-w-md text-sm leading-6">
        We will use this number for your M-Pesa payment prompt.
      </p>

      <form onSubmit={savePhoneNumber} className="mt-9">
        <div className="w-full rounded-lg border border-[#1e1e22] bg-[#111214] p-3 sm:p-4">
          <InputOTP
            maxLength={10}
            pattern="[0-9]*"
            inputMode="numeric"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            aria-label="M-Pesa phone number"
            className="w-full"
          >
            <InputOTPGroup className="w-full gap-1 sm:gap-1.5">
              {Array.from({ length: 10 }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="h-9 flex-1 rounded-md border border-[#2a2a2d] bg-[#0b0b0d] text-base text-white sm:h-10 sm:text-lg"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        {error && (
          <p className="text-destructive mt-4 text-sm" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex min-h-11 min-w-32 items-center justify-center rounded-md px-6 text-sm font-medium shadow-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
          >
            {isSaving
              ? isEditing
                ? "Updating number..."
                : "Saving number..."
              : isEditing
                ? "Update number"
                : "Save number"}
          </button>
          {isEditing && (
            <button
              type="button"
              onClick={() => onCancel?.()}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function ProfileSheet({
  displayName,
  email,
  phoneNumber,
  onEditPhone,
  avatarSeed,
  onSignOut,
  isSigningOut,
}) {
  return (
    <SheetContent side="right" className="w-[min(22rem,85vw)]">
      <SheetHeader>
        <SheetTitle>Profile</SheetTitle>
        <SheetDescription>Manage your Nexora account.</SheetDescription>
      </SheetHeader>
      <div className="flex items-center gap-3 px-4">
        <Avatar size="lg" className="border-foreground border bg-black">
          <AvatarFallback className="bg-black">
            <ShapeMark seed={avatarSeed} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-foreground truncate font-medium">{displayName}</p>
          <p className="text-muted-foreground truncate text-sm">{email}</p>
          {phoneNumber && (
            <div className="mt-1 flex items-center gap-2">
              <p className="text-muted-foreground truncate text-sm">
                {maskPhoneNumber(phoneNumber)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onEditPhone}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="border-border mt-auto border-t p-4">
        <button
          type="button"
          onClick={onSignOut}
          disabled={isSigningOut}
          className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors disabled:opacity-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {isSigningOut ? "Signing out" : "Sign out"}
        </button>
      </div>
    </SheetContent>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<main className="bg-background min-h-screen" />}>
      <HomeContent />
    </Suspense>
  );
}
