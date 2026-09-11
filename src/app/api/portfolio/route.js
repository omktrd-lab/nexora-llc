import { Account, Client } from "appwrite";
import { NextResponse } from "next/server";
import { getLiveBotProfit } from "@/lib/bot-profit";
import { getExecutableNxrPrice } from "@/lib/nxr-pricing";

const stateEndpoint = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/tablesdb/${process.env.APPWRITE_DATABASE_ID}/tables/${process.env.APPWRITE_NXR_STATE_TABLE_ID}`;

export async function GET(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/, "");
  if (!token)
    return NextResponse.json(
      { message: "You must be signed in." },
      { status: 401 },
    );
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
      .setJWT(token);
    const user = await new Account(client).get();
    let state = {};
    let priceUsd = Number(process.env.NXR_FALLBACK_PRICE_USD || 7);
    let priceSource = "curve-fallback";

    try {
      const response = await fetch(`${stateEndpoint}/rows/global`, {
        headers: {
          "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(4_000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("Could not read NXR state.");
      state = result?.data || result || {};
      const safeCirculatingSupply = Number.isFinite(Number(state.circulatingSupply))
        ? Number(state.circulatingSupply)
        : 100_000;
      const executablePrice = await getExecutableNxrPrice({
        circulatingSupply: safeCirculatingSupply,
        btc24hChangePercent: Number(process.env.NXR_BTC_24H_CHANGE_PERCENT || 0),
      });
      priceUsd = executablePrice.priceUsd;
      priceSource = executablePrice.source;
    } catch (stateError) {
      console.warn(
        "Portfolio state lookup failed; using curve fallback price.",
        stateError instanceof Error ? stateError.message : stateError,
      );
    }
    const now = Date.now();
    const nxrBalance = Number(user.prefs?.nxrBalance || 0);
    const usdtBalance = Number(user.prefs?.usdtBalance || 0);
    const botProfitSnapshot = getLiveBotProfit({
      prefs: user.prefs || {},
      priceUsd,
      now,
    });
    const botProfitUsdt = botProfitSnapshot.liveBotProfitUsd;
    const botProfitPersistedUsd = Number(user.prefs?.botProfitUsdt || 0);
    const botProfitAccruedSinceLastWriteUsd = Math.max(
      0,
      botProfitUsdt - botProfitPersistedUsd,
    );
    const costBasisKnown = Object.prototype.hasOwnProperty.call(
      user.prefs || {},
      "nxrCostBasisUsd",
    );
    const costBasisUsd = Number(user.prefs?.nxrCostBasisUsd || 0);
    const nxrValueUsd = nxrBalance * priceUsd;
    const unrealisedPnlUsd = costBasisKnown ? nxrValueUsd - costBasisUsd : 0;
    return NextResponse.json({
      balanceKes: Number(user.prefs?.balanceKes || 0),
      totalDepositedKes: Number(user.prefs?.totalDepositedKes || 0),
      totalDepositedKnown: Object.prototype.hasOwnProperty.call(
        user.prefs || {},
        "totalDepositedKes",
      ),
      nxrBalance,
      usdtBalance,
      botProfitUsdt,
      botProfitPersistedUsd,
      botProfitAccruedSinceLastWriteUsd,
      botProfitAccrualAt: user.prefs?.botProfitAccrualAt || null,
      priceUsd,
      priceSource,
      nxrValueUsd,
      costBasisUsd,
      costBasisKnown,
      unrealisedPnlUsd,
      realisedPnlUsd: Number(user.prefs?.realisedPnlUsd || 0),
      totalPnlUsd:
        unrealisedPnlUsd +
        Number(user.prefs?.realisedPnlUsd || 0) +
        botProfitUsdt,
    });
  } catch (error) {
    console.error("Portfolio load failed:", error);
    return NextResponse.json(
      { message: "Could not load portfolio." },
      { status: 502 },
    );
  }
}
