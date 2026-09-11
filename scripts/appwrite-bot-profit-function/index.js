const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_PROFIT_RATE = 0.5;
const BASE_PRICE_USD = 7;
const INITIAL_SUPPLY = 100_000;
const CURVE_SLOPE = 0.00005;
const BTC_BETA = 0.35;
const KES_PER_USD = 130;

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function headers() {
  return {
    "X-Appwrite-Project": env("APPWRITE_PROJECT_ID"),
    "X-Appwrite-Key": env("APPWRITE_API_KEY"),
    "Content-Type": "application/json",
  };
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

async function getNxrPrice() {
  const stateUrl = `${env("APPWRITE_ENDPOINT")}/tablesdb/${env("APPWRITE_DATABASE_ID")}/tables/${env("APPWRITE_NXR_STATE_TABLE_ID")}/rows/global`;
  const stateResponse = await fetch(stateUrl, {
    headers: headers(),
    cache: "no-store",
  });
  const stateResult = await readJson(stateResponse);
  if (!stateResponse.ok) throw new Error("Could not read NXR state.");
  const state = stateResult.data || stateResult;
  const supply = Math.max(0, Number(state.circulatingSupply || INITIAL_SUPPLY));
  const fallback =
    BASE_PRICE_USD + CURVE_SLOPE * Math.max(0, supply - INITIAL_SUPPLY);

  try {
    const url = new URL("https://api.binance.com/api/v3/ticker/price");
    url.searchParams.set("symbol", "UNIUSDT");
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const payload = await readJson(response);
    const referencePrice = Number(payload.price);
    const scalar = Number(process.env.NEXT_PUBLIC_BINANCE_PRICE_SCALAR || 1.02);
    if (response.ok && Number.isFinite(referencePrice) && referencePrice > 0) {
      return referencePrice * scalar;
    }
  } catch {
    // Use the curve fallback when Binance is unavailable.
  }

  return fallback + BASE_PRICE_USD * BTC_BETA * 0;
}

async function listUsers() {
  const users = [];
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const url = new URL(`${env("APPWRITE_ENDPOINT")}/users`);
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, { headers: headers(), cache: "no-store" });
    const result = await readJson(response);
    if (!response.ok) throw new Error(result.message || "Could not list users.");
    const page = Array.isArray(result.users) ? result.users : [];
    users.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }
  return users;
}

async function updateUser(user, now, priceUsd) {
  const prefs = user.prefs || {};
  const nxrBalance = Math.max(0, Number(prefs.nxrBalance || 0));
  if (nxrBalance <= 0) return { rewardUsd: 0, updated: false };

  const nowMs = new Date(now).getTime();
  const lastMs = new Date(prefs.botProfitAccrualAt || now).getTime();
  const lastAccrualMs = Number.isFinite(lastMs) ? Math.min(lastMs, nowMs) : nowMs;
  const elapsedMs = Math.max(0, nowMs - lastAccrualMs);
  const nxrValueUsd = nxrBalance * priceUsd;
  const weeklyProfitUsd = nxrValueUsd * WEEKLY_PROFIT_RATE;
  const rewardUsd = Number(
    (weeklyProfitUsd * (elapsedMs / WEEK_MS)).toFixed(8),
  );
  const nextPrefs = {
    ...prefs,
    usdtBalance: Number(prefs.usdtBalance || 0) + rewardUsd,
    botProfitUsdt: Number(prefs.botProfitUsdt || 0) + rewardUsd,
    botProfitAccrualAt: new Date(nowMs).toISOString(),
    botProfitNxrValueUsd: nxrValueUsd,
    botProfitWeeklyUsd: weeklyProfitUsd,
    botProfitRate: WEEKLY_PROFIT_RATE,
  };

  const response = await fetch(
    `${env("APPWRITE_ENDPOINT")}/users/${encodeURIComponent(user.$id)}/prefs`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ prefs: nextPrefs }),
    },
  );
  if (!response.ok) throw new Error(`Could not update ${user.$id}.`);
  return { rewardUsd, updated: true };
}

export default async ({ res, log, error }) => {
  try {
    const now = new Date().toISOString();
    const priceUsd = await getNxrPrice();
    const users = await listUsers();
    let creditedUsers = 0;
    let rewardUsd = 0;
    let failedUsers = 0;

    for (const user of users) {
      try {
        const result = await updateUser(user, now, priceUsd);
        if (result.rewardUsd > 0) creditedUsers += 1;
        rewardUsd += result.rewardUsd;
      } catch (userError) {
        failedUsers += 1;
        error?.(`Bot profit update failed for ${user.$id}: ${userError.message}`);
      }
    }

    log?.(`Processed ${users.length} users; credited ${creditedUsers}.`);
    return res.json({
      processed: true,
      timestamp: now,
      usersProcessed: users.length,
      creditedUsers,
      failedUsers,
      rewardUsd,
      priceUsd,
    });
  } catch (runError) {
    error?.(runError.message);
    return res.json({ processed: false, message: runError.message }, 500);
  }
};
