"use client";

const responseCache = new Map();

function cacheKey(input, init) {
  const url = typeof input === "string" ? input : input.url;
  return `${init?.method || "GET"}:${url}`;
}

export async function cachedFetch(input, init = {}, ttlMs = 0) {
  if (typeof window === "undefined" || (init.method || "GET") !== "GET") {
    return fetch(input, init);
  }

  const key = cacheKey(input, init);
  responseCache.delete(key);

  const response = await fetch(input, init);
  if (response.ok) {
    const body = await response.clone().text();
    responseCache.set(key, {
      body,
      headers: [...response.headers.entries()],
      status: response.status,
      statusText: response.statusText,
      timestamp: Date.now(),
    });
  }
  return response;
}
