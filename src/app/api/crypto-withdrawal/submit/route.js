import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getAppwriteEndpoint() {
  return process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
}

function getDatabaseId() {
  return process.env.APPWRITE_DATABASE_ID;
}

function getCryptoWithdrawalsEndpoint() {
  const appwriteEndpoint = getAppwriteEndpoint();
  const databaseId = getDatabaseId();
  return `${appwriteEndpoint}/tablesdb/${databaseId}/tables/${process.env.APPWRITE_CRYPTO_WITHDRAWALS_TABLE_ID}`;
}

function serverHeaders() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
}

function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

async function appwriteRequest(endpoint, path, options = {}) {
  const response = await fetch(`${endpoint}${path}`, {
    ...options,
    headers: { ...serverHeaders(), ...options.headers },
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || "Appwrite request failed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function POST(request) {
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!jwt) return jsonError("You must be signed in.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError("The request was invalid.", 400);
  }

  const amount = Number(body.amount);
  const walletAddress = String(body.walletAddress || "");

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonError("Enter a valid USDT amount.", 400);
  }
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return jsonError("Invalid wallet address.", 400);
  }

  try {
    const endpoint = getAppwriteEndpoint();
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    if (!endpoint || !projectId) {
      return jsonError("Appwrite is not configured on the server.", 503);
    }

    const { Account, Client } = await import("appwrite");
    const appwriteClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(jwt);
    const currentUser = await new Account(appwriteClient).get();

    // Check user's USDT balance
    const currentUsdtBalance = Number(currentUser.prefs?.usdtBalance || 0);
    if (amount > currentUsdtBalance) {
      return jsonError("Insufficient USDT balance.", 400);
    }

    const now = new Date().toISOString();
    const withdrawalId = `crypto-withdrawal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const result = await appwriteRequest(getCryptoWithdrawalsEndpoint(), "/rows", {
      method: "POST",
      body: JSON.stringify({
        rowId: withdrawalId,
        data: {
          userId: currentUser.$id,
          amount,
          walletAddress,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        },
      }),
    });

    return NextResponse.json({
      message: "Withdrawal request submitted successfully.",
      withdrawalId: result.$id,
    });
  } catch (error) {
    console.error("Crypto withdrawal submission failed:", error);
    return jsonError("Could not submit withdrawal request.", 502);
  }
}
