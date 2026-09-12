"use client";

import { useEffect, useState } from "react";
import { account } from "@/lib/appwrite";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CryptoDepositsAdmin() {
  const [deposits, setDeposits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDeposits();
  }, []);

  async function loadDeposits() {
    setIsLoading(true);
    setError("");
    try {
      const jwtResponse = await account.createJWT();
      const response = await fetch("/api/admin/crypto-deposits", {
        headers: { Authorization: `Bearer ${jwtResponse.jwt}` },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not fetch deposits.");
      }
      setDeposits(result.deposits || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch deposits.");
    } finally {
      setIsLoading(false);
    }
  }

  async function processDeposit(depositId, action) {
    try {
      const jwtResponse = await account.createJWT();
      const response = await fetch("/api/admin/crypto-deposits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtResponse.jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ depositId, action }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Could not process deposit.");
      }
      toast.success(`Deposit ${action}ed`, {
        description: result.message,
      });
      loadDeposits();
    } catch (err) {
      toast.error("Failed to process deposit", {
        description: err instanceof Error ? err.message : "Could not process deposit.",
      });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090a0c] p-6">
        <p className="text-zinc-400">Loading deposits...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#090a0c] p-6">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090a0c] p-6">
      <div className="max-w-4xl">
        <h1 className="mb-6 text-2xl font-semibold text-white">
          Crypto Deposits
        </h1>

        {deposits.length === 0 ? (
          <p className="text-zinc-400">No deposits found.</p>
        ) : (
          <div className="space-y-4">
            {deposits.map((deposit) => (
              <div
                key={deposit.$id}
                className="rounded-md border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          deposit.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : deposit.status === "approved"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {deposit.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(deposit.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-white">
                      <span className="text-zinc-400">Amount:</span> {deposit.amount} USDT
                    </p>
                    <p className="mt-1 text-xs text-zinc-400 break-all">
                      <span className="text-zinc-500">Wallet:</span> {deposit.walletAddress}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      User ID: {deposit.userId}
                    </p>
                  </div>

                  {deposit.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => processDeposit(deposit.$id, "approve")}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processDeposit(deposit.$id, "reject")}
                        className="border-red-500 text-red-400 hover:bg-red-500/10"
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
