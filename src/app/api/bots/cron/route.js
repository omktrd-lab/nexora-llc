import { NextResponse } from "next/server";
import { getBotArenaState } from "@/lib/bot-engine";
import {
  accrueUserBotProfit,
  getBotProfitContext,
} from "@/lib/bot-profit";

const appwriteEndpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;

function serverHeaders() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
}

async function listUsers() {
  const users = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const url = new URL(`${appwriteEndpoint}/users`);
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));
    const response = await fetch(url, {
      headers: serverHeaders(),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "Could not list users.");
    const page = Array.isArray(result.users) ? result.users : [];
    users.push(...page);
    if (page.length < pageSize) break;
    offset += page.length;
  }

  return users;
}

export async function POST(request) {
  const configuredSecret = process.env.BOT_CRON_SECRET;
  const providedSecret = request.headers.get("x-nexora-cron-secret");

  if (!configuredSecret) {
    return NextResponse.json(
      { message: "Bot scheduler is not configured." },
      { status: 503 },
    );
  }

  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ message: "Invalid scheduler secret." }, { status: 401 });
  }

  try {
    const context = await getBotProfitContext();
    const users = await listUsers();
    const now = Date.now();
    let creditedUsers = 0;
    let rewardUsd = 0;
    let failedUsers = 0;

    for (const user of users) {
      try {
        const accrual = await accrueUserBotProfit(user, context, now);
        if (accrual.rewardUsd > 0) creditedUsers += 1;
        rewardUsd += accrual.rewardUsd;
      } catch (error) {
        failedUsers += 1;
        console.error(`Bot profit accrual failed for ${user.$id}:`, error);
      }
    }

    const arena = getBotArenaState({ runCycles: 5 });
    return NextResponse.json({
      processed: true,
      timestamp: new Date(now).toISOString(),
      usersProcessed: users.length,
      creditedUsers,
      failedUsers,
      rewardUsd,
      activePositions: arena.activePositions.length,
      totalBotPnlUsd: arena.totalBotPnlUsd,
      holderDistributionUsd: arena.holderDistributionUsd,
      priceUsd: context.priceUsd,
    });
  } catch (error) {
    console.error("Bot profit scheduler failed:", error);
    return NextResponse.json(
      { message: "Could not process bot profits." },
      { status: 502 },
    );
  }
}