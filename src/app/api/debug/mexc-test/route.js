export async function GET() {
  const urls = [
    "https://api.mexc.com/api/v3/ticker/24hr?symbol=BTCUSDT",
    "https://api.mexc.com/api/v3/depth?symbol=BTCUSDT&limit=5",
  ];

  const results = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      });

      const text = await response.text();
      results.push({
        url,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        bodyPreview: text.slice(0, 250),
      });
    } catch (error) {
      results.push({
        url,
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const allOk = results.every((result) => result.ok);

  return Response.json(
    {
      provider: "mexc",
      ok: allOk,
      results,
      testedAt: new Date().toISOString(),
    },
    { status: allOk ? 200 : 502 },
  );
}
