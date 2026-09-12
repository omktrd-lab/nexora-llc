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

export async function GET(request) {
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!jwt) return jsonError("You must be signed in.", 401);

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

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || "brianitira@gmail.com";
    if (currentUser.email !== adminEmail) {
      return jsonError("Unauthorized. Admin access required.", 403);
    }

    const result = await appwriteRequest(getCryptoWithdrawalsEndpoint(), "/rows");
    const withdrawals = result.documents || [];

    // Sort by createdAt descending (newest first)
    withdrawals.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ withdrawals });
  } catch (error) {
    console.error("Failed to fetch crypto withdrawals:", error);
    return jsonError("Could not fetch crypto withdrawals.", 502);
  }
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

  const { withdrawalId, action } = body;

  if (!withdrawalId || !action) {
    return jsonError("Withdrawal ID and action are required.", 400);
  }

  if (!["approve", "reject"].includes(action)) {
    return jsonError("Invalid action. Must be 'approve' or 'reject'.", 400);
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

    // Check if user is admin
    const adminEmail = process.env.ADMIN_EMAIL || "brianitira@gmail.com";
    if (currentUser.email !== adminEmail) {
      return jsonError("Unauthorized. Admin access required.", 403);
    }

    // Fetch the withdrawal
    const withdrawal = await appwriteRequest(
      getCryptoWithdrawalsEndpoint(),
      `/rows/${encodeURIComponent(withdrawalId)}`,
    );

    if (withdrawal.status !== "pending") {
      return jsonError("Withdrawal has already been processed.", 400);
    }

    const now = new Date().toISOString();
    const newStatus = action === "approve" ? "approved" : "rejected";

    // Update withdrawal status
    await appwriteRequest(
      getCryptoWithdrawalsEndpoint(),
      `/rows/${encodeURIComponent(withdrawalId)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          data: {
            status: newStatus,
            updatedAt: now,
            processedBy: currentUser.$id,
            processedAt: now,
          },
        }),
      },
    );

    // If approved, deduct the user's USDT balance (you'll handle the actual crypto transfer manually)
    if (action === "approve") {
      const { Users } = await import("node-appwrite");
      const users = new Users(appwriteClient);
      const user = await users.get(withdrawal.userId);
      const currentUsdtBalance = Number(user.prefs?.usdtBalance || 0);
      const newUsdtBalance = currentUsdtBalance - withdrawal.amount;

      await fetch(
        `${getAppwriteEndpoint()}/users/${encodeURIComponent(withdrawal.userId)}/prefs`,
        {
          method: "PATCH",
          headers: serverHeaders(),
          body: JSON.stringify({
            prefs: {
              ...(user.prefs || {}),
              usdtBalance: newUsdtBalance,
            },
          }),
        },
      );
    }

    return NextResponse.json({
      message: `Withdrawal ${newStatus} successfully.`,
      status: newStatus,
    });
  } catch (error) {
    console.error("Failed to process crypto withdrawal:", error);
    return jsonError("Could not process crypto withdrawal.", 502);
  }
}
