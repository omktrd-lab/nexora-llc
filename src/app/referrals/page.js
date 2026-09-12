"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";
import { getReferrals, getReferralStats } from "@/lib/referrals";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock,
  Copy,
  Search,
  Users,
} from "lucide-react";

export default function ReferralsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    pending: 0,
    totalDeposits: 0,
  });
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [codeMessageType, setCodeMessageType] = useState(""); // "success" or "error"

  useEffect(() => {
    account
      .get()
      .then((currentUser) => {
        setUser(currentUser);
        loadReferralData(currentUser.$id);
        assignReferralCode(currentUser.$id);
      })
      .catch(() => router.replace("/auth"));
  }, [router]);

  const assignReferralCode = async (userId) => {
    try {
      const response = await fetch("/api/referral/assign-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      if (data.code) {
        setReferralCode(data.code);
      }
    } catch (error) {
      console.error("Error assigning referral code:", error);
    }
  };

  const loadReferralData = async (userId) => {
    try {
      const response = await fetch(`/api/referral/stats?referrerId=${encodeURIComponent(userId)}`);
      const data = await response.json();

      if (response.ok) {
        setReferrals(data.referrals);
        setStats(data.stats);
      } else {
        console.error("Error loading referral data:", data.error);
      }
    } catch (error) {
      console.error("Error loading referral data:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnterCode = async () => {
    if (!codeInput.trim()) {
      setCodeMessage("Please enter a referral code");
      setCodeMessageType("error");
      return;
    }

    try {
      const response = await fetch("/api/referral/enter-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput.trim(), userId: user.$id }),
      });
      const data = await response.json();

      if (response.ok) {
        setCodeMessage("Referral code applied successfully!");
        setCodeMessageType("success");
        setCodeInput("");
        // Reload referral data
        loadReferralData(user.$id);
      } else {
        setCodeMessage(data.error || "Failed to apply referral code");
        setCodeMessageType("error");
      }
    } catch (error) {
      setCodeMessage("Failed to apply referral code");
      setCodeMessageType("error");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#090a0c]">
        <p className="text-sm text-zinc-500">Loading referrals...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#090a0c]">
      <header className="terminal-header relative z-20 hidden h-14 items-center border-b px-4 lg:flex">
        <div className="flex min-w-0 items-center gap-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5"
          >
            <div className="terminal-logo flex size-7 items-center justify-center rounded text-xs font-black">
              N
            </div>
            <span className="text-sm font-bold tracking-wide">NEXORA</span>
          </button>
          <nav className="text-muted-foreground flex items-center gap-4 overflow-x-auto text-xs whitespace-nowrap">
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
              className="terminal-nav-active"
            >
              Trade <ChevronDown className="ml-0.5 inline size-3" />
            </button>
            <span className="text-zinc-500">Futures</span>
            <span className="text-zinc-500">Earn</span>
            <span className="text-zinc-500">Portfolio</span>
            <span className="text-foreground font-medium">Referrals</span>
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
          <button
            type="button"
            onClick={() => router.push("/")}
            aria-label="Open profile"
            className="border-foreground flex size-7 items-center justify-center rounded-full border text-[10px] font-semibold"
          >
            N
          </button>
        </div>
      </header>

      <header className="border-b border-[#16181d] bg-[#090a0c] px-4 py-4 lg:hidden">
        <h1 className="text-sm font-semibold tracking-wide text-white uppercase">
          Referrals & Rewards
        </h1>
      </header>

      {/* Mobile View - Single Column */}
      <div className="md:hidden">
        {/* Metrics Bar */}
        <div className="grid grid-cols-3 divide-x divide-[#16181d] border-b border-[#16181d]">
          <div className="px-4 py-3">
            <p className="text-xs tracking-wide text-zinc-500 uppercase">
              Total Referrals
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {stats.total}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs tracking-wide text-zinc-500 uppercase">
              Valid Depositors
            </p>
            <p className="mt-1 text-xl font-semibold text-[#00E676]">
              {stats.valid}
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs tracking-wide text-zinc-500 uppercase">
              Pending
            </p>
            <p className="mt-1 text-xl font-semibold text-[#00F0FF]">
              {stats.pending}
            </p>
          </div>
        </div>

        {/* Your Referral Code */}
        <div className="border-b border-[#16181d] px-4 py-4">
          <p className="mb-2 text-xs tracking-wide text-zinc-500 uppercase">
            Your Referral Code
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralCode}
              readOnly
              className="flex-1 border border-[#16181d] bg-[#0d0e12] px-3 py-2 font-mono text-sm text-zinc-300 outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="bg-[#00E676] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#00c853]"
            >
              {copied ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Enter Referral Code */}
        <div className="border-b border-[#16181d] px-4 py-4">
          <p className="mb-2 text-xs tracking-wide text-zinc-500 uppercase">
            Enter Referral Code
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="NXR-XXXX"
              className="flex-1 border border-[#16181d] bg-[#0d0e12] px-3 py-2 font-mono text-sm text-zinc-300 uppercase outline-none"
            />
            <button
              onClick={handleEnterCode}
              className="bg-[#00F0FF] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#00b8cc]"
            >
              Apply
            </button>
          </div>
          {codeMessage && (
            <p
              className={`mt-2 text-xs ${codeMessageType === "success" ? "text-[#00E676]" : "text-red-500"}`}
            >
              {codeMessage}
            </p>
          )}
        </div>

        {/* Referral History Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#16181d] bg-[#0d0e12]">
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  User ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Phone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Deposit Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center">
                    <Users className="mx-auto mb-3 size-8 text-zinc-600" />
                    <p className="text-sm text-zinc-500">No referrals yet</p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Share your link to start earning!
                    </p>
                  </td>
                </tr>
              ) : (
                referrals.map((referral) => (
                  <tr key={referral.$id} className="border-b border-[#16181d]">
                    <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                      {referral.referredUserId.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {referral.phoneNumber || "Not set"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${
                          referral.status === "VALID"
                            ? "text-[#00E676]"
                            : "text-[#00F0FF]"
                        }`}
                      >
                        {referral.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-300">
                      {referral.hasDeposited
                        ? `KES ${referral.depositAmount?.toLocaleString() || "0"}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(referral.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop View - Fused Terminal Panel Layout */}
      <div className="mx-auto my-6 hidden w-full max-w-7xl md:block">
        <div className="border border-[#16181d] bg-[#090a0c]">
          {/* Top Banner Row */}
          <div className="grid grid-cols-2 border-b border-[#16181d]">
            {/* Left: Your Referral Code */}
            <div className="border-r border-[#16181d] p-5">
              <p className="mb-3 text-xs tracking-wide text-zinc-500 uppercase">
                Your Referral Code
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={referralCode}
                  readOnly
                  className="flex-1 border border-[#16181d] bg-[#0d0e12] px-3 py-2 font-mono text-sm text-zinc-300 outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className="bg-[#00E676] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#00c853]"
                >
                  {copied ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </button>
              </div>
            </div>
            {/* Right: Enter Referral Code */}
            <div className="p-5">
              <p className="mb-3 text-xs tracking-wide text-zinc-500 uppercase">
                Enter Referral Code
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  placeholder="NXR-XXXX"
                  className="flex-1 border border-[#16181d] bg-[#0d0e12] px-3 py-2 font-mono text-sm text-zinc-300 uppercase outline-none"
                />
                <button
                  onClick={handleEnterCode}
                  className="bg-[#00F0FF] px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-[#00b8cc]"
                >
                  Apply
                </button>
              </div>
              {codeMessage && (
                <p
                  className={`mt-2 text-xs ${codeMessageType === "success" ? "text-[#00E676]" : "text-red-500"}`}
                >
                  {codeMessage}
                </p>
              )}
            </div>
          </div>

          {/* Middle Metrics Strip */}
          <div className="grid grid-cols-3 border-b border-[#16181d]">
            <div className="border-r border-[#16181d] px-5 py-4">
              <p className="text-xs tracking-wide text-zinc-500 uppercase">
                Total Referrals
              </p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {stats.total}
              </p>
            </div>
            <div className="border-r border-[#16181d] px-5 py-4">
              <p className="text-xs tracking-wide text-zinc-500 uppercase">
                Valid Depositors
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#00E676]">
                {stats.valid}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs tracking-wide text-zinc-500 uppercase">
                Pending
              </p>
              <p className="mt-1 text-2xl font-semibold text-[#00F0FF]">
                {stats.pending}
              </p>
            </div>
          </div>

          {/* Bottom Referral History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#16181d] bg-[#0d0e12]">
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    User ID
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Deposit Amount
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center">
                      <Users className="mx-auto mb-3 size-8 text-zinc-600" />
                      <p className="text-sm text-zinc-500">No referrals yet</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Share your link to start earning!
                      </p>
                    </td>
                  </tr>
                ) : (
                  referrals.map((referral) => (
                    <tr
                      key={referral.$id}
                      className="border-b border-[#16181d]"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-zinc-300">
                        {referral.referredUserId.slice(0, 8)}...
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-400">
                        {referral.phoneNumber || "Not set"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-medium ${
                            referral.status === "VALID"
                              ? "text-[#00E676]"
                              : "text-[#00F0FF]"
                          }`}
                        >
                          {referral.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-300">
                        {referral.hasDeposited
                          ? `KES ${referral.depositAmount?.toLocaleString() || "0"}`
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-500">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
