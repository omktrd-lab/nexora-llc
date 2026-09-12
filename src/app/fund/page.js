"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Coins,
  Eye,
  EyeOff,
  LineChart,
  Lock,
  LogOut,
  ShieldAlert,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { account } from "@/lib/appwrite";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canUserWithdraw } from "@/lib/referrals";
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

function ShapeMark({ seed }) {
  const shapeTypes = ["circle", "square", "rectangle", "diamond"];
  const hash = [...(seed || "nexora")].reduce(
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
      className={`block border-2 border-foreground bg-black ${shapeClass}`}
    />
  );
}

function maskPhoneNumber(phone) {
  return phone;
}

function FundPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [balanceKes, setBalanceKes] = useState(0);
  const [availableUsdt, setAvailableUsdt] = useState(0);
  const [withdrawEligibility, setWithdrawEligibility] = useState(false);
  const [activeFlow, setActiveFlow] = useState(
    searchParams.get("view") === "withdraw" ? "withdraw" : "fund",
  );
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    setActiveFlow(searchParams.get("view") === "withdraw" ? "withdraw" : "fund");
  }, [searchParams]);

  useEffect(() => {
    account
      .get()
      .then(async (currentUser) => {
        setUser(currentUser);
        setPhoneNumber(currentUser.prefs?.safaricomPhoneNumber || "");
        setBalanceKes(Number(currentUser.prefs?.balanceKes || 0));
        const userUsdtBalance = Number(currentUser.prefs?.usdtBalance || 0);
        const botProfitUsdt = Number(currentUser.prefs?.botProfitUsdt || 0);
        setAvailableUsdt(userUsdtBalance + botProfitUsdt);
        try {
          setWithdrawEligibility(await canUserWithdraw(currentUser.$id));
        } catch {
          setWithdrawEligibility(false);
        }
        setCheckingSession(false);
      })
      .catch(() => router.replace("/auth"));
  }, [router]);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    await account.deleteSession("current");
    router.replace("/auth");
  }

  const displayName = user?.name || user?.email || "Nexora participant";
  const avatarSeed = user?.$id || displayName;

  if (checkingSession) {
    return <main className="min-h-screen bg-background" />;
  }

  return (
    <main className="relative min-h-screen bg-background text-foreground pb-20 md:pb-0">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-bold text-background">
              N
            </div>
            <p className="truncate text-sm font-semibold tracking-wide text-foreground">
              Nexora
            </p>
          </button>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs font-medium text-muted-foreground hover:text-foreground hidden sm:block transition-colors"
            >
              Trading Terminal →
            </button>

            <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
              <SheetTrigger
                render={
                  <button
                    type="button"
                    aria-label="Open profile"
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                }
              >
                <Avatar className="border border-foreground bg-black size-8">
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
                }}
                avatarSeed={avatarSeed}
                onSignOut={signOut}
                isSigningOut={isSigningOut}
                onClose={() => setIsProfileOpen(false)}
              />
            </Sheet>
          </div>
        </div>
      </header>

      {/* ── Main Full-Viewport Funding Content ── */}
      <div className="mx-auto max-w-lg px-5 py-12 md:py-16">
        {/* Balance Display */}
        <div className="mb-10">
          <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
            Balance
          </p>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl font-mono">
              {isBalanceVisible
                ? `KES ${balanceKes.toLocaleString()}`
                : "KES ••••••"}
            </p>
            <button
              type="button"
              onClick={() => setIsBalanceVisible((v) => !v)}
              aria-label={isBalanceVisible ? "Hide balance" : "Show balance"}
              className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-md transition-colors"
            >
              {isBalanceVisible ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Dynamic State: Phone prompt vs Fund Panel */}
        {!phoneNumber || isEditingPhone ? (
          <PhoneNumberPrompt
            initialValue={isEditingPhone ? phoneNumber : ""}
            isEditing={isEditingPhone}
            onSaved={(savedNumber) => {
              setPhoneNumber(savedNumber);
              setIsEditingPhone(false);
            }}
          />
        ) : (
          <>
            <div className="mb-6 hidden items-center gap-3 md:flex">
              <button
                type="button"
                onClick={() => setActiveFlow("fund")}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm transition-colors ${
                  activeFlow === "fund"
                    ? "bg-foreground text-background"
                    : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Fund
              </button>
              <button
                type="button"
                onClick={() => setActiveFlow("withdraw")}
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm transition-colors ${
                  activeFlow === "withdraw"
                    ? "bg-foreground text-background"
                    : "border border-border bg-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Withdraw
              </button>
            </div>

            {activeFlow === "fund" ? (
              <FundPanel
                onBalanceUpdated={setBalanceKes}
                onCollapse={() => router.push("/")}
              />
            ) : (
              <WithdrawPanel
                availableUsdt={availableUsdt}
                isEligible={withdrawEligibility}
                onOpenReferrals={() => router.push("/referrals")}
              />
            )}
          </>
        )}
      </div>

      {!phoneNumber || isEditingPhone ? null : (
        <div className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-2 items-center border-t border-[#16181d] bg-[#090a0c] px-2 md:hidden">
          <button
            type="button"
            onClick={() => setActiveFlow("fund")}
            className={`flex h-full items-center justify-center text-xs font-medium transition-colors ${
              activeFlow === "fund"
                ? "text-[#22c55e]"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Fund
          </button>
          <button
            type="button"
            onClick={() => setActiveFlow("withdraw")}
            className={`flex h-full items-center justify-center text-xs font-medium transition-colors ${
              activeFlow === "withdraw"
                ? "text-[#22c55e]"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Withdraw
          </button>
        </div>
      )}

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-5 items-center border-t border-[#16181d] bg-[#090a0c] px-1 md:hidden">
        <button
          type="button"
          onClick={() => router.push("/fund")}
          className={`flex flex-col items-center justify-center text-[10px] transition-colors ${
            activeFlow === "fund"
              ? "text-[#22c55e] font-semibold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <WalletCards className="mb-0.5 size-4" />
          <span>Fund</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/fund?view=withdraw")}
          className={`flex flex-col items-center justify-center text-[10px] transition-colors ${
            activeFlow === "withdraw"
              ? "text-[#22c55e] font-semibold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <ArrowLeftRight className="mb-0.5 size-4" />
          <span>Withdraw</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex flex-col items-center justify-center text-[10px] text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeftRight className="mb-0.5 size-4" />
          <span>Trade</span>
        </button>

        <button
          type="button"
          onClick={() => router.push("/markets")}
          className="flex flex-col items-center justify-center text-[10px] text-zinc-400 hover:text-white transition-colors"
        >
          <LineChart className="mb-0.5 size-4" />
          <span>Markets</span>
        </button>

        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          className="flex flex-col items-center justify-center text-[10px] text-zinc-400 hover:text-white transition-colors"
        >
          <Users className="mb-0.5 size-4" />
          <span>Profile</span>
        </button>
      </nav>
    </main>
  );
}

function FundPanel({ onBalanceUpdated, onCollapse }) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentKey, setPaymentKey] = useState("");
  const [ledgerRowId, setLedgerRowId] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  useEffect(() => {
    if (!paymentKey) return undefined;

    const interval = window.setInterval(async () => {
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
        if (status === "success") {
          const refreshedUser = await account.get();
          const confirmedBalance = Number(refreshedUser.prefs?.balanceKes || 0);
          const amountToAdd = Number(result.data?.amount || 0);
          onBalanceUpdated(confirmedBalance);
          setPaymentStatus("Payment confirmed. Balance updated.");
          toast.success("Payment confirmed", {
            description: `KES ${amountToAdd.toLocaleString()} has been added to your balance.`,
          });
          setPaymentKey("");
          setLedgerRowId("");
          window.clearInterval(interval);
        } else if (
          ["failed", "cancelled", "canceled"].includes(status)
        ) {
          setPaymentStatus("Payment was not completed.");
          setError("The M-Pesa payment was not completed. You can try again.");
          setPaymentKey("");
          setLedgerRowId("");
          window.clearInterval(interval);
        }
      } catch {
        // Keep polling while ZetuPay processes the STK request.
      }
    }, 3000);

    return () => window.clearInterval(interval);
  }, [paymentKey, ledgerRowId, onBalanceUpdated]);

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
      if (result.data.directStk) {
        setPaymentKey(result.data.paymentKey);
        setLedgerRowId(result.data.ledgerRowId);
        setPaymentStatus(
          "Payment processing. Enter your M-Pesa PIN on your phone and keep this page open while we confirm it.",
        );
        setIsLoading(false);
      } else if (result.data.checkoutUrl) {
        toast.info("Opening secure M-Pesa checkout", {
          description:
            result.data.directStkError ||
            "Continue there to start the STK prompt.",
        });
        window.location.assign(result.data.checkoutUrl);
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
    <div id="fund-account" className="w-full max-w-lg text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            Fund account
          </p>
          <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
            Add funds in KES
          </h2>
        </div>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Close"
            title="Return to trading"
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
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
        <Button
          type="submit"
          disabled={isLoading || Boolean(paymentKey)}
          className="w-full sm:w-auto"
        >
          {isLoading || paymentKey
            ? "Payment processing..."
            : "Pay with M-Pesa"}
        </Button>
      </form>
    </div>
  );
}

function WithdrawPanel({ availableUsdt, isEligible, onOpenReferrals }) {
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [confirmAddress, setConfirmAddress] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    toast.info("Withdrawal requests are preview-only for now.", {
      description: "The payout middleware is not live yet.",
    });
  }

  return (
    <div className="w-full max-w-lg text-left">
      <div className="mb-6">
        <p className="text-muted-foreground text-sm font-medium">Withdraw</p>
        <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight">
          USDT payout
        </h2>
      </div>

      <div className="mb-6 border-b border-border pb-4">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.18em] uppercase">
          Available to withdraw
        </p>
        <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
          ${Number(availableUsdt || 0).toFixed(2)}
        </p>
      </div>

      {Number(availableUsdt || 0) <= 0 ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm leading-6 text-amber-200">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span>You do not have any USDT available to withdraw yet.</span>
          </p>
        </div>
      ) : !isEligible ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm leading-6 text-amber-200">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <span>Withdrawals are locked until you have at least one valid referral.</span>
          </p>
          <Button type="button" onClick={onOpenReferrals} className="w-full sm:w-auto">
            View referrals
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Amount in USDT
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Network
            </label>
            <div className="border border-border bg-transparent px-3 py-2 text-sm text-foreground">
              BNB Smart Chain (BEP20)
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              USDT address
            </label>
            <Input
              type="text"
              value={walletAddress}
              onChange={(event) => setWalletAddress(event.target.value)}
              placeholder="0x... or Binance chain wallet address"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Confirm USDT address
            </label>
            <Input
              type="text"
              value={confirmAddress}
              onChange={(event) => setConfirmAddress(event.target.value)}
              placeholder="Repeat the wallet address"
            />
          </div>

          <p className="text-sm leading-6 text-amber-200">
            Double-check the address before submitting. Wrong BNB Smart Chain USDT addresses cannot be recovered.
          </p>

          <Button type="submit" className="w-full sm:w-auto" disabled>
            Withdrawals coming soon
          </Button>
        </form>
      )}
    </div>
  );
}

function PhoneNumberPrompt({ initialValue, isEditing, onSaved }) {
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
      await account.updatePrefs({ safaricomPhoneNumber: phoneNumber });
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

        <button
          type="submit"
          disabled={isSaving}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 inline-flex min-h-11 min-w-32 items-center justify-center rounded-md px-6 text-sm font-medium shadow-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
        >
          {isSaving
            ? isEditing
              ? "Updating number..."
              : "Saving number..."
            : isEditing
              ? "Update number"
              : "Save number"}
        </button>
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
  onClose,
}) {
  return (
    <SheetContent side="right" className="w-[min(22rem,85vw)]">
      <SheetHeader>
        <SheetTitle>Profile</SheetTitle>
        <SheetDescription>Manage your Nexora account.</SheetDescription>
      </SheetHeader>
      <div className="flex items-center gap-3 px-4">
        <Avatar size="lg" className="border border-foreground bg-black">
          <AvatarFallback className="bg-black">
            <ShapeMark seed={avatarSeed} />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{displayName}</p>
          <p className="truncate text-sm text-muted-foreground">{email}</p>
          {phoneNumber && (
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate text-sm text-muted-foreground">
                {maskPhoneNumber(phoneNumber)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => {
                  onEditPhone();
                  onClose?.();
                }}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-auto border-t border-border p-4">
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

export default function FundPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-background" />}>
      <FundPageContent />
    </Suspense>
  );
}
