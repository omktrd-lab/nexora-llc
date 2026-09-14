"use client";

import { useState, useEffect } from "react";
import { account } from "@/lib/appwrite";

export default function AdminUserBalancesPage() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [searchUserId, setSearchUserId] = useState("");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newBalanceKes, setNewBalanceKes] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "brianitira@gmail.com";
        setIsAdmin(currentUser.email === adminEmail);
      } catch {
        setIsAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  async function fetchUser() {
    if (!searchUserId.trim()) {
      setError("Please enter a user ID");
      return;
    }

    setLoading(true);
    setError("");
    setUserData(null);
    setUpdateSuccess(false);

    try {
      const jwt = await account.createJWT();
      const response = await fetch("/api/admin/get-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt.jwt}`,
        },
        body: JSON.stringify({ userId: searchUserId.trim() }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "Failed to fetch user");
        return;
      }

      setUserData(result);
      setNewBalanceKes(result.balanceKes.toString());
    } catch (err) {
      setError("Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  }

  async function updateBalance() {
    if (!userData || newBalanceKes === "") {
      setError("Please enter a valid balance");
      return;
    }

    const balance = parseFloat(newBalanceKes);
    if (isNaN(balance) || balance < 0) {
      setError("Please enter a valid positive number");
      return;
    }

    setLoading(true);
    setError("");
    setUpdateSuccess(false);

    try {
      const jwt = await account.createJWT();
      const response = await fetch("/api/admin/update-balance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt.jwt}`,
        },
        body: JSON.stringify({
          userId: userData.userId,
          balanceKes: balance,
          adminKey: "nexora-admin-2024",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.message || "Failed to update balance");
        return;
      }

      setUpdateSuccess(true);
      await fetchUser();
    } catch (err) {
      setError("Failed to update balance");
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return <div className="p-4">Checking authentication...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-4">
        <p className="text-red-500">Access denied. Admin access required.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#090a0c] text-white p-4">
      <h1 className="text-xl font-semibold mb-6">User Balance Management</h1>

      <div className="max-w-2xl">
        <div className="mb-6">
          <label className="block text-sm mb-2">User ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchUserId}
              onChange={(e) => setSearchUserId(e.target.value)}
              placeholder="Enter user ID"
              className="flex-1 bg-[#1a1b1e] border border-zinc-700 rounded px-3 py-2 text-white"
            />
            <button
              onClick={fetchUser}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 px-4 py-2 rounded"
            >
              {loading ? "Loading..." : "Search"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-400">
            {error}
          </div>
        )}

        {updateSuccess && (
          <div className="mb-4 text-green-400">
            Balance updated successfully!
          </div>
        )}

        {userData && (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-semibold mb-4">User Details</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-zinc-400">Name:</span> {userData.name}</div>
                <div><span className="text-zinc-400">Email:</span> {userData.email}</div>
                <div><span className="text-zinc-400">User ID:</span> {userData.userId}</div>
                <div><span className="text-zinc-400">Phone:</span> {userData.phone}</div>
                <div><span className="text-zinc-400">Created:</span> {new Date(userData.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Current Balances</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-zinc-400">KES:</span> {userData.balanceKes.toLocaleString()}</div>
                <div><span className="text-zinc-400">NXR:</span> {userData.nxrBalance}</div>
                <div><span className="text-zinc-400">USDT:</span> {userData.usdtBalance}</div>
                <div><span className="text-zinc-400">Total Deposited KES:</span> {userData.totalDepositedKes.toLocaleString()}</div>
                <div><span className="text-zinc-400">Last Top-up:</span> {userData.lastTopUpAt === "Never" ? "Never" : new Date(userData.lastTopUpAt).toLocaleString()}</div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">Update KES Balance</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">New KES Balance</label>
                  <input
                    type="number"
                    value={newBalanceKes}
                    onChange={(e) => setNewBalanceKes(e.target.value)}
                    className="w-full bg-[#1a1b1e] border border-zinc-700 rounded px-3 py-2 text-white"
                    min="0"
                    step="0.01"
                  />
                </div>
                <button
                  onClick={updateBalance}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-800 px-4 py-2 rounded"
                >
                  {loading ? "Updating..." : "Update Balance"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
