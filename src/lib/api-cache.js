/**
 * In-memory cache & request deduplication utility for Binance market proxies.
 * Prevents HTTP connection storming and Binance IP rate-limiting (502s).
 * Provides stale-while-revalidate fallback if a live fetch encounters a transient error.
 */

const memoryCache = new Map();
const inFlightRequests = new Map();

export async function fetchWithCache(cacheKey, fetcher, ttlMs = 2000) {
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);

  // Return fresh cached data if within TTL
  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  // Deduplicate concurrent requests for the same key
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const promise = (async () => {
    try {
      const data = await fetcher();
      memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      // If live fetch fails, fall back to last known good cached data if available
      if (cached) {
        return cached.data;
      }
      throw err;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}
