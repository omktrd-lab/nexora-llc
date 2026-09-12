import { NextResponse } from "next/server";
import { calculateSwapQuote } from "@/lib/nxr-pricing";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getAppwriteEndpoint() {
  return process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
}

function getDatabaseId() {
  return process.env.APPWRITE_DATABASE_ID;
}

function getStateEndpoint() {
  const appwriteEndpoint = getAppwriteEndpoint();
  const databaseId = getDatabaseId();
  return `${appwriteEndpoint}/tablesdb/${databaseId}/tables/${process.env.APPWRITE_NXR_STATE_TABLE_ID}`;
}

function getSwapLedgerEndpoint() {
  const appwriteEndpoint = getAppwriteEndpoint();
  const databaseId = getDatabaseId();
  return `${appwriteEndpoint}/tablesdb/${databaseId}/tables/${process.env.APPWRITE_SWAP_LEDGER_ID}`;
}

function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

function serverHeaders() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
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

async function getGlobalState() {
  return appwriteRequest(getStateEndpoint(), "/rows/global");
}

async function findSwap(requestId) {
  try {
    return await appwriteRequest(
      getSwapLedgerEndpoint(),
      `/rows/${encodeURIComponent(requestId)}`,
    );
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

function getBtcTrend() {
  const configuredTrend = Number(process.env.NXR_BTC_24H_CHANGE_PERCENT || 0);
  return Number.isFinite(configuredTrend) ? configuredTrend : 0;
}

export async function POST(request) {
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";

  if (!jwt) return jsonError("You must be signed in.", 401);

  let body;
  let ledgerRow = null;
  let prefsUpdated = false;
  let stateUpdated = false;
  let previousPrefs;
  let previousState;
  let executingUserId = "";

  try {
    body = await request.json();
  } catch {
    return jsonError("The swap request was invalid.", 400);
  }

  const kesAmount = Number(body.amountKes);
  const requestId = String(body.requestId || "");
  if (!Number.isFinite(kesAmount) || kesAmount <= 0) {
    return jsonError("Enter a valid KES amount.", 400);
  }
  if (!/^[A-Za-z0-9_-]{8,36}$/.test(requestId)) {
    return jsonError("A valid swap request ID is required.", 400);
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
    executingUserId = currentUser.$id;
    previousPrefs = currentUser.prefs || {};
    const reference = `NXR-SWAP-${currentUser.$id}-${requestId}`;
    const existingSwap = await findSwap(requestId);

    if (existingSwap) {
      return jsonError("This swap request has already been submitted.", 409);
    }

    const availableKes = Number(currentUser.prefs?.balanceKes || 0);
    if (!Number.isFinite(availableKes) || kesAmount > availableKes) {
      return jsonError(
        "The swap amount exceeds your available KES balance.",
        400,
      );
    }

    const state = await getGlobalState();
    const stateData = state.data || state;
    previousState = {
      key: stateData.key,
      circulatingSupply: stateData.circulatingSupply,
      version: stateData.version,
      updatedAt: stateData.updatedAt,
    };
    const supplyBefore = Number(stateData.circulatingSupply);
    const stateVersion = Number(stateData.version);
    const btc24hChangePercent = getBtcTrend();
    const quote = calculateSwapQuote({
      kesAmount,
      circulatingSupply: supplyBefore,
      btc24hChangePercent,
    });
    const supplyAfter = supplyBefore + quote.nxrReceived;
    const now = new Date().toISOString();
    const existingNxrBalance = Number(currentUser.prefs?.nxrBalance || 0);
    const nextPrefs = {
      ...(currentUser.prefs || {}),
      balanceKes: availableKes - kesAmount,
      nxrBalance: existingNxrBalance + quote.nxrReceived,
      lastSwapAt: now,
      lastSwapReference: reference,
    };

    ledgerRow = await appwriteRequest(getSwapLedgerEndpoint(), "/rows", {
      method: "POST",
      body: JSON.stringify({
        rowId: requestId,
        data: {
          userId: currentUser.$id,
          reference,
          status: "processing",
          kesAmount: quote.kesAmount,
          feeKes: quote.feeKes,
          netKes: quote.netKes,
          usdAmount: quote.netUsdAmount,
          nxrAmount: quote.nxrReceived,
          priceUsd: quote.priceUsd,
          averagePriceUsd: quote.averagePriceUsd,
          priceImpact: quote.priceImpact,
          supplyBefore,
          supplyAfter,
          btc24hChangePercent,
          createdAt: now,
        },
      }),
    });

    const prefsResponse = await fetch(
      `${getAppwriteEndpoint()}/users/${encodeURIComponent(currentUser.$id)}/prefs`,
      {
        method: "PATCH",
        headers: serverHeaders(),
        body: JSON.stringify({ prefs: nextPrefs }),
      },
    );
    if (!prefsResponse.ok) {
      const error = new Error("Could not update the user balances.");
      error.status = prefsResponse.status;
      throw error;
    }
    prefsUpdated = true;

    await appwriteRequest(getStateEndpoint(), "/rows/global", {
      method: "PATCH",
      body: JSON.stringify({
        data: {
          key: "global",
          circulatingSupply: supplyAfter,
          version: stateVersion + 1,
          updatedAt: now,
        },
      }),
    });
    stateUpdated = true;

    await appwriteRequest(getSwapLedgerEndpoint(), `/rows/${ledgerRow.$id}`, {
      method: "PATCH",
      body: JSON.stringify({ data: { status: "success" } }),
    });

    return NextResponse.json({
      reference,
      swap: quote,
      balances: {
        balanceKes: nextPrefs.balanceKes,
        nxrBalance: nextPrefs.nxrBalance,
      },
      circulatingSupply: supplyAfter,
      stateVersion: stateVersion + 1,
    });
  } catch (error) {
    console.error("NXR swap execution failed:", error);
    try {
      if (stateUpdated && previousState) {
        await appwriteRequest(getStateEndpoint(), "/rows/global", {
          method: "PATCH",
          body: JSON.stringify({ data: previousState }),
        });
      }
      if (prefsUpdated && previousPrefs) {
        if (executingUserId) {
          await fetch(
            `${getAppwriteEndpoint()}/users/${encodeURIComponent(executingUserId)}/prefs`,
            {
              method: "PATCH",
              headers: serverHeaders(),
              body: JSON.stringify({ prefs: previousPrefs }),
            },
          );
        }
      }
      if (ledgerRow?.$id) {
        await appwriteRequest(getSwapLedgerEndpoint(), `/rows/${ledgerRow.$id}`, {
          method: "PATCH",
          body: JSON.stringify({ data: { status: "failed" } }),
        });
      }
    } catch {
      // Preserve the original error response when rollback also fails.
    }

    if (error.status === 409) {
      return jsonError("This swap request has already been submitted.", 409);
    }
    return jsonError("Could not execute the NXR swap.", 502);
  }
}
