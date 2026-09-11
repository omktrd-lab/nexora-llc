import { Account, Client } from "appwrite";
import { NextResponse } from "next/server";
import { getExecutableNxrPrice, NXR_PRICING } from "@/lib/nxr-pricing";

const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const stateEndpoint = `${appwriteEndpoint}/tablesdb/${process.env.APPWRITE_DATABASE_ID}/tables/${process.env.APPWRITE_NXR_STATE_TABLE_ID}`;

function error(message, status) {
  return NextResponse.json({ message }, { status });
}

function headers() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
}

export async function POST(request) {
  const authorization = request.headers.get("authorization");
  const jwt = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  if (!jwt) return error("You must be signed in to sell NXR.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return error("The sell request was invalid.", 400);
  }
  const nxrAmount = Number(body.nxrAmount);
  if (!Number.isFinite(nxrAmount) || nxrAmount <= 0) {
    return error("Enter a valid NXR amount.", 400);
  }

  try {
    const client = new Client()
      .setEndpoint(appwriteEndpoint)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setJWT(jwt);
    const user = await new Account(client).get();
    const nxrBalance = Number(user.prefs?.nxrBalance || 0);
    if (nxrAmount > nxrBalance)
      return error("The sell amount exceeds your NXR balance.", 400);

    const stateResponse = await fetch(`${stateEndpoint}/rows/global`, {
      headers: headers(),
      cache: "no-store",
    });
    const stateResult = await stateResponse.json().catch(() => ({}));
    if (!stateResponse.ok) throw new Error("Could not read NXR state.");
    const state = stateResult.data || stateResult;
    const executablePrice = await getExecutableNxrPrice({
      circulatingSupply: Number(state.circulatingSupply),
      btc24hChangePercent: Number(process.env.NXR_BTC_24H_CHANGE_PERCENT || 0),
    });
    const price = executablePrice.priceUsd;
    const grossUsd = nxrAmount * price;
    const feeUsd = grossUsd * NXR_PRICING.NETWORK_FEE_RATE;
    const receivedUsd = grossUsd - feeUsd;
    // NXR acquired before portfolio accounting was introduced has no reliable
    // historical basis. Value it at today's price for this first sale rather
    // than fabricating a gain or loss.
    const hasRecordedCostBasis = Object.prototype.hasOwnProperty.call(
      user.prefs || {},
      "nxrCostBasisUsd",
    );
    const costBasis = hasRecordedCostBasis
      ? Number(user.prefs?.nxrCostBasisUsd || 0)
      : nxrBalance * price;
    const soldCostBasis =
      nxrBalance > 0 ? costBasis * (nxrAmount / nxrBalance) : 0;
    const nextPrefs = {
      ...(user.prefs || {}),
      nxrBalance: nxrBalance - nxrAmount,
      usdtBalance: Number(user.prefs?.usdtBalance || 0) + receivedUsd,
      nxrCostBasisUsd: Math.max(0, costBasis - soldCostBasis),
      realisedPnlUsd:
        Number(user.prefs?.realisedPnlUsd || 0) + receivedUsd - soldCostBasis,
      lastNxrSellAt: new Date().toISOString(),
    };
    const update = await fetch(
      `${appwriteEndpoint}/users/${encodeURIComponent(user.$id)}/prefs`,
      {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ prefs: nextPrefs }),
      },
    );
    if (!update.ok) throw new Error("Could not update the portfolio balances.");
    return NextResponse.json({
      sale: {
        nxrAmount,
        priceUsd: price,
        feeUsd,
        receivedUsd,
        realisedPnlUsd: receivedUsd - soldCostBasis,
      },
      balances: {
        balanceKes: Number(user.prefs?.balanceKes || 0),
        nxrBalance: nextPrefs.nxrBalance,
        usdtBalance: nextPrefs.usdtBalance,
      },
    });
  } catch {
    return error("Could not execute the NXR sale.", 502);
  }
}
