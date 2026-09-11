import { Account, Client } from "appwrite";
import { NextResponse } from "next/server";
import { fetchWithCache } from "@/lib/api-cache";
import { getBotArenaState } from "@/lib/bot-engine";
import {
  accrueUserBotProfit,
  getBotProfitContext,
} from "@/lib/bot-profit";

const referencePoolUrl =
  "https://api.geckoterminal.com/api/v2/networks/eth/pools/0xc7bbec68d12a0d1830360f8ec58fa599ba1b0e9b";
const reservePoolUrl =
  "https://api.geckoterminal.com/api/v2/networks/eth/pools/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640";

async function getPoolLiquidity(cacheKey, poolUrl) {
  return fetchWithCache(
    cacheKey,
    async () => {
      const response = await fetch(poolUrl, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new Error("Reference pool unavailable.");
      const payload = await response.json();
      const liquidity = Number(
        payload?.data?.attributes?.reserve_in_usd ||
          payload?.data?.attributes?.liquidity_usd,
      );
      if (!Number.isFinite(liquidity) || liquidity <= 0) {
        throw new Error("Reference pool liquidity was invalid.");
      }
      return liquidity;
    },
    15_000,
  );
}

export async function GET() {
  const [liquidityResult, reserveResult] = await Promise.allSettled([
    getPoolLiquidity("bot-arena:reference-liquidity", referencePoolUrl),
    getPoolLiquidity("bot-arena:reference-reserve", reservePoolUrl),
  ]);
  const liquidityPoolUsd =
    liquidityResult.status === "fulfilled" ? liquidityResult.value : undefined;
  const privateReserveUsd =
    reserveResult.status === "fulfilled" ? reserveResult.value : undefined;
  return NextResponse.json(
    getBotArenaState({ liquidityPoolUsd, privateReserveUsd }),
  );
}

export async function POST(request) {
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
    const arena = getBotArenaState();
    const context = await getBotProfitContext();
    const accrual = await accrueUserBotProfit(user, context);
    return NextResponse.json({
      reward: accrual.rewardUsd,
      usdtBalance: accrual.usdtBalance,
      arena,
      priceUsd: context.priceUsd,
    });
  } catch (error) {
    console.error("Bot reward application failed:", error);
    return NextResponse.json(
      { message: "Could not apply bot rewards." },
      { status: 502 },
    );
  }
}
