import { NextResponse } from "next/server";
import {
  calculateSwapQuote,
  calculateUsdSwapQuote,
  getExecutableNxrPrice,
} from "@/lib/nxr-pricing";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getStateEndpoint() {
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/tablesdb/${process.env.APPWRITE_DATABASE_ID}/tables/${process.env.APPWRITE_NXR_STATE_TABLE_ID}`;
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

async function getGlobalState() {
  const response = await fetch(`${getStateEndpoint()}/rows/global`, {
    headers: serverHeaders(),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || "Could not read NXR state.");
  }
  return result.data || result;
}

export async function GET(request) {
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const url = new URL(request.url);
  const kesParameter = url.searchParams.get("kesAmount");
  const usdParameter = url.searchParams.get("usdAmount");
  const isUsdSwap = Boolean(usdParameter);
  const amountParameter = isUsdSwap ? usdParameter : kesParameter;
  const amount = Number(amountParameter);

  console.error("[SWAP QUOTE] Starting quote calculation", {
    hasJwt: !!jwt,
    isUsdSwap,
    amount,
    kesParameter,
    usdParameter,
  });

  if (!jwt) return jsonError("You must be signed in.", 401);
  if (!amountParameter || !Number.isFinite(amount) || amount <= 0) {
    return jsonError(
      `Enter a valid ${isUsdSwap ? "USDT" : "KES"} amount.`,
      400,
    );
  }

  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

    console.error("[SWAP QUOTE] Appwrite config", {
      hasEndpoint: !!endpoint,
      hasProjectId: !!projectId,
    });

    if (!endpoint || !projectId) {
      return jsonError("Appwrite is not configured on the server.", 503);
    }

    const { Account, Client } = await import("appwrite");
    const appwriteClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setJWT(jwt);
    const currentUser = await new Account(appwriteClient).get();
    const availableKes = Number(currentUser.prefs?.balanceKes || 0);
    const availableUsdt = Number(currentUser.prefs?.usdtBalance || 0);
    const available = isUsdSwap ? availableUsdt : availableKes;

    console.error("[SWAP QUOTE] User authenticated", {
      userId: currentUser.$id,
      availableKes,
      availableUsdt,
    });

    if (!Number.isFinite(available) || amount > available) {
      return jsonError(
        `The swap amount exceeds your available ${isUsdSwap ? "USDT" : "KES"} balance.`,
        400,
      );
    }

    console.error("[SWAP QUOTE] Fetching global state");
    const state = await getGlobalState();
    const circulatingSupply = Number(state.circulatingSupply);
    const configuredBtcTrend = Number(
      process.env.NXR_BTC_24H_CHANGE_PERCENT || 0,
    );
    const btc24hChangePercent = Number.isFinite(configuredBtcTrend)
      ? configuredBtcTrend
      : 0;

    console.error("[SWAP QUOTE] Calculating price", {
      circulatingSupply,
      btc24hChangePercent,
    });

    const executablePrice = await getExecutableNxrPrice({
      circulatingSupply,
      btc24hChangePercent,
    });

    console.error("[SWAP QUOTE] Executable price", {
      priceUsd: executablePrice.priceUsd,
      source: executablePrice.source,
    });

    const quote = isUsdSwap
      ? calculateUsdSwapQuote({
          usdAmount: amount,
          circulatingSupply,
          btc24hChangePercent,
          currentPriceUsd: executablePrice.priceUsd,
        })
      : calculateSwapQuote({
          kesAmount: amount,
          circulatingSupply,
          btc24hChangePercent,
          currentPriceUsd: executablePrice.priceUsd,
        });

    console.error("[SWAP QUOTE] Quote calculated", {
      nxrReceived: quote.nxrReceived,
      feeKes: quote.feeKes,
    });

    return NextResponse.json({
      quote,
      availableKes,
      availableUsdt,
      priceSource: executablePrice.source,
      btcTrendSource: process.env.NXR_BTC_24H_CHANGE_PERCENT
        ? "configured"
        : "mocked",
      stateVersion: Number(state.version || 0),
    });
  } catch (error) {
    console.error("[SWAP QUOTE] ERROR", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return jsonError("Could not calculate the NXR quote.", 502);
  }
}
