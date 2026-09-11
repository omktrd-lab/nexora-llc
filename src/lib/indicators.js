// Technical Indicators Calculation Library

export function calculateSMA(data, period) {
  if (!Array.isArray(data) || data.length < period) return [];
  
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

export function calculateEMA(data, period) {
  if (!Array.isArray(data) || data.length < period) return [];
  
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  const initialSum = data.slice(0, period).reduce((a, b) => a + b, 0);
  ema.push(initialSum / period);
  
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(currentEMA);
  }
  
  return ema;
}

export function calculateRSI(data, period = 14) {
  if (!Array.isArray(data) || data.length < period + 1) return [];
  
  const rsi = [];
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain/loss
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate RSI
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - change) / period;
    }
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  return rsi;
}

export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (!Array.isArray(data) || data.length < slowPeriod) return { macd: [], signal: [], histogram: [] };
  
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  // MACD line = Fast EMA - Slow EMA
  const macd = [];
  const startIndex = slowPeriod - fastPeriod;
  for (let i = 0; i < slowEMA.length; i++) {
    macd.push(fastEMA[startIndex + i] - slowEMA[i]);
  }
  
  // Signal line = EMA of MACD
  const signal = calculateEMA(macd, signalPeriod);
  
  // Histogram = MACD - Signal
  const histogram = [];
  const signalStartIndex = signalPeriod - 1;
  for (let i = 0; i < signal.length; i++) {
    histogram.push(macd[signalStartIndex + i] - signal[i]);
  }
  
  return { macd, signal, histogram };
}

export function calculateBollingerBands(data, period = 20, stdDev = 2) {
  if (!Array.isArray(data) || data.length < period) return { upper: [], middle: [], lower: [] };
  
  const middle = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = middle[i - period + 1];
    const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(variance);
    
    upper.push(mean + (stdDev * std));
    lower.push(mean - (stdDev * std));
  }
  
  return { upper, middle, lower };
}

export function calculateVWMA(data, volume, period) {
  if (!Array.isArray(data) || !Array.isArray(volume) || data.length < period) return [];
  
  const vwma = [];
  for (let i = period - 1; i < data.length; i++) {
    const priceSlice = data.slice(i - period + 1, i + 1);
    const volumeSlice = volume.slice(i - period + 1, i + 1);
    
    const totalVolume = volumeSlice.reduce((a, b) => a + b, 0);
    const weightedSum = priceSlice.reduce((sum, price, idx) => sum + (price * volumeSlice[idx]), 0);
    
    vwma.push(weightedSum / totalVolume);
  }
  
  return vwma;
}

export function calculateATR(high, low, close, period = 14) {
  if (!Array.isArray(high) || !Array.isArray(low) || !Array.isArray(close) || high.length < period + 1) return [];
  
  const tr = [];
  for (let i = 1; i < high.length; i++) {
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr.push(Math.max(hl, hc, lc));
  }
  
  const atr = [];
  let sum = 0;
  
  // Initial ATR using simple average
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  atr.push(sum / period);
  
  // Subsequent ATR using Wilder's smoothing
  for (let i = period; i < tr.length; i++) {
    const currentATR = (atr[atr.length - 1] * (period - 1) + tr[i]) / period;
    atr.push(currentATR);
  }
  
  return atr;
}

// Helper to align indicator data with chart timestamps
export function alignIndicatorData(indicatorData, startIndex) {
  return indicatorData.map((value, index) => ({
    time: startIndex + index,
    value: value
  }));
}
