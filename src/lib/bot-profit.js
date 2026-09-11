import {
  getCurrentNxrPrice,
  getExecutableNxrPrice,
} from "@/lib/nxr-pricing";

const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const databaseId = process.env.APPWRITE_DATABASE_ID;
const stateEndpoint = `${appwriteEndpoint}/tablesdb/${databaseId}/tables/${process.env.APPWRITE_NXR_STATE_TABLE_ID}`;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_PROFIT_RATE = 0.5;

function serverHeaders() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
}

export async function getBotProfitContext() {
  const configuredBtcTrend = Number(
    process.env.NXR_BTC_24H_CHANGE_PERCENT || 0,
  );
  const fallbackPrice = getCurrentNxrPrice({
    circulatingSupply: 100_000,
    btc24hChangePercent: Number.isFinite(configuredBtcTrend)
      ? configuredBtcTrend
      : 0,
  });

  try {
    const response = await fetch(`${stateEndpoint}/rows/global`, {
      headers: serverHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("Could not read NXR state.");

    const state = result?.data || result || {};
    const safeCirculatingSupply = Number.isFinite(Number(state.circulatingSupply))
      ? Number(state.circulatingSupply)
      : 100_000;
    const executablePrice = await getExecutableNxrPrice({
      circulatingSupply: safeCirculatingSupply,
      btc24hChangePercent: Number.isFinite(configuredBtcTrend)
        ? configuredBtcTrend
        : 0,
    });

    return {
      priceUsd: executablePrice.priceUsd,
      priceSource: executablePrice.source,
      accruedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.warn(
      "Falling back to curve price for bot profit context.",
      error instanceof Error ? error.message : error,
    );
    return {
      priceUsd: fallbackPrice.priceUsd,
      priceSource: "curve-fallback",
      accruedAt: new Date().toISOString(),
    };
  }
}

export function calculateBotProfitAccrual({ prefs = {}, priceUsd, now = Date.now() }) {
  const nxrBalance = Math.max(0, Number(prefs.nxrBalance || 0));
  const safePriceUsd = Math.max(0, Number(priceUsd || 0));
  const nowMs = new Date(now).getTime();
  const lastAccrualMs = new Date(
    prefs.botProfitAccrualAt || now,
  ).getTime();
  const validLastAccrual = Number.isFinite(lastAccrualMs)
    ? Math.min(lastAccrualMs, nowMs)
    : nowMs;
  const elapsedMs = Math.max(0, nowMs - validLastAccrual);
  const nxrValueUsd = nxrBalance * safePriceUsd;
  const weeklyProfitUsd = nxrValueUsd * WEEKLY_PROFIT_RATE;
  const rewardUsd = Number(
    (weeklyProfitUsd * (elapsedMs / WEEK_MS)).toFixed(8),
  );

  return {
    rewardUsd: rewardUsd > 0 ? rewardUsd : 0,
    nxrBalance,
    nxrValueUsd,
    weeklyProfitUsd,
    nextAccrualAt: new Date(nowMs).toISOString(),
  };
}

export async function accrueUserBotProfit(user, context, now = Date.now()) {
  const accrual = calculateBotProfitAccrual({
    prefs: user.prefs || {},
    priceUsd: context.priceUsd,
    now,
  });
  if (accrual.nxrBalance <= 0) {
    return {
      ...accrual,
      usdtBalance: Number(user.prefs?.usdtBalance || 0),
    };
  }
  const currentUsdtBalance = Number(user.prefs?.usdtBalance || 0);
  const currentBotProfit = Number(user.prefs?.botProfitUsdt || 0);
  const nextPrefs = {
    ...(user.prefs || {}),
    usdtBalance: currentUsdtBalance + accrual.rewardUsd,
    botProfitUsdt: currentBotProfit + accrual.rewardUsd,
    botProfitAccrualAt: accrual.nextAccrualAt,
    botProfitNxrValueUsd: accrual.nxrValueUsd,
    botProfitWeeklyUsd: accrual.weeklyProfitUsd,
    botProfitRate: WEEKLY_PROFIT_RATE,
  };

  const response = await fetch(
    `${appwriteEndpoint}/users/${encodeURIComponent(user.$id)}/prefs`,
    {
      method: "PATCH",
      headers: serverHeaders(),
      body: JSON.stringify({ prefs: nextPrefs }),
    },
  );
  if (!response.ok) throw new Error("Could not persist bot profit accrual.");

  return { ...accrual, usdtBalance: nextPrefs.usdtBalance };
}

export function getLiveBotProfit({ prefs = {}, priceUsd, now = Date.now() }) {
  const persistedBotProfitUsd = Number(prefs.botProfitUsdt || 0);
  const accrual = calculateBotProfitAccrual({
    prefs,
    priceUsd,
    now,
  });

  return {
    ...accrual,
    botProfitUsdt: persistedBotProfitUsd + accrual.rewardUsd,
    liveBotProfitUsd: persistedBotProfitUsd + accrual.rewardUsd,
  };
}

export const BOT_PROFIT_POLICY = Object.freeze({
  weeklyRate: WEEKLY_PROFIT_RATE,
  weekMs: WEEK_MS,
});
