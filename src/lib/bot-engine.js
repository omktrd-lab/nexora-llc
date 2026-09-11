const MARKETS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"];
const STRATEGIES = [
  "Cross-market spread",
  "Liquidity rebalance",
  "Mean reversion",
  "Momentum fade",
];
const TOTAL_REWARD_NXR = 1_000_000;
const PRIVATE_RESERVE_MULTIPLIER = 6;

function state() {
  if (!globalThis.__nexoraBotArena) {
    globalThis.__nexoraBotArena = {
      privateReserveUsd: 1_400_000,
      liquidityPoolUsd: 233_000,
      holderRewardPerNxr: 0,
      holderDistributionUsd: 0,
      totalBotPnlUsd: 0,
      wins: 0,
      losses: 0,
      lastTick: Date.now(),
      positions: [],
      executions: [],
      sequence: 0,
    };
    openPosition(globalThis.__nexoraBotArena);
  }
  return globalThis.__nexoraBotArena;
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function execution(engine, payload) {
  const executionId = `EXEC-${Date.now()}-${engine.sequence++}`;
  engine.executions.unshift({
    ...payload,
    positionId: payload.id,
    id: executionId,
    timestamp: new Date().toISOString(),
  });
  engine.executions = engine.executions.slice(0, 70);
}

function openPosition(engine) {
  const symbol = MARKETS[Math.floor(Math.random() * MARKETS.length)];
  const capitalUsd = Math.round(random(450, 3_500) * 100) / 100;
  if (engine.privateReserveUsd - capitalUsd < 1_000_000) return;
  const spreadBps = Math.round(random(3, 18) * 10) / 10;
  const position = {
    id: `POS-${Date.now()}-${engine.sequence++}`,
    symbol,
    strategy: STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)],
    capitalUsd,
    spreadBps,
    openedAt: Date.now(),
    closeAfterMs: random(3_000, 10_000),
  };
  engine.privateReserveUsd -= capitalUsd;
  engine.positions.push(position);
  execution(engine, {
    ...position,
    type: "OPEN",
    status: "Routing liquidity",
    pnlUsd: 0,
  });
}

function closePosition(engine, position) {
  const win = Math.random() > 0.16;
  const gross = win
    ? position.capitalUsd * random(0.00045, 0.0022)
    : -position.capitalUsd * random(0.00018, 0.00095);
  const fees = position.capitalUsd * 0.00012;
  const pnlUsd = Math.round((gross - fees) * 10000) / 10000;
  let holderShare = 0;
  let poolShare = 0;
  if (pnlUsd > 0) {
    holderShare = pnlUsd * 0.3;
    poolShare = pnlUsd * 0.1;
    engine.holderDistributionUsd += holderShare;
    engine.holderRewardPerNxr += holderShare / TOTAL_REWARD_NXR;
    engine.liquidityPoolUsd += poolShare;
    engine.wins += 1;
  } else {
    engine.losses += 1;
  }
  engine.privateReserveUsd +=
    position.capitalUsd + pnlUsd - holderShare - poolShare;
  engine.totalBotPnlUsd += pnlUsd;
  execution(engine, {
    ...position,
    type: "CLOSE",
    status: pnlUsd >= 0 ? "Spread captured" : "Exit protected",
    feesUsd: fees,
    pnlUsd,
    holderShare,
  });
}

export function getBotArenaState({
  liquidityPoolUsd,
  privateReserveUsd,
  runCycles = 1,
} = {}) {
  const engine = state();
  if (Number.isFinite(liquidityPoolUsd) && liquidityPoolUsd > 0) {
    engine.liquidityPoolUsd = liquidityPoolUsd;
  }
  if (Number.isFinite(privateReserveUsd) && privateReserveUsd > 0) {
    engine.privateReserveUsd = privateReserveUsd;
  } else if (Number.isFinite(liquidityPoolUsd) && liquidityPoolUsd > 0) {
    engine.privateReserveUsd = liquidityPoolUsd * PRIVATE_RESERVE_MULTIPLIER;
  }
  const cycles = Math.min(Math.max(Math.floor(Number(runCycles) || 1), 1), 5);
  const now = Date.now();
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    if (cycle === 0 && now - engine.lastTick <= 1_200) continue;
    engine.lastTick = now;
    // Slow inbound liquidity growth; bot capital itself is only private reserve.
    engine.liquidityPoolUsd += random(0.01, 0.08);
    const ready = engine.positions.filter(
      (position) => now - position.openedAt >= position.closeAfterMs,
    );
    ready.forEach((position) => closePosition(engine, position));
    engine.positions = engine.positions.filter(
      (position) => !ready.includes(position),
    );
    if (engine.positions.length < 5 && Math.random() > 0.12)
      openPosition(engine);
  }
  return {
    privateReserveUsd: engine.privateReserveUsd,
    liquidityPoolUsd: engine.liquidityPoolUsd,
    holderRewardPerNxr: engine.holderRewardPerNxr,
    holderDistributionUsd: engine.holderDistributionUsd,
    totalBotPnlUsd: engine.totalBotPnlUsd,
    wins: engine.wins,
    losses: engine.losses,
    activePositions: engine.positions,
    executions: engine.executions,
    markets: MARKETS,
  };
}
