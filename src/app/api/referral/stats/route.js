export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const REFERRALS_COLLECTION_ID = "referrals";

export async function GET(request) {
  try {
    console.error("[REFERRAL STATS API] Starting referral stats fetch");

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID;

    console.error("[REFERRAL STATS API] Appwrite config", {
      hasEndpoint: !!endpoint,
      hasProjectId: !!projectId,
      hasApiKey: !!apiKey,
      hasDatabaseId: !!databaseId,
    });

    if (!endpoint || !projectId || !apiKey || !databaseId) {
      return Response.json({ error: "Appwrite is not configured" }, { status: 503 });
    }

    const { Client, Databases, Query } = await import("node-appwrite");
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    const url = new URL(request.url);
    const referrerId = url.searchParams.get("referrerId");

    console.error("[REFERRAL STATS API] Request params", {
      hasReferrerId: !!referrerId,
      referrerId: referrerId ? referrerId.substring(0, 8) + "..." : null,
    });

    if (!referrerId) {
      return Response.json({ error: "Referrer ID is required" }, { status: 400 });
    }

    console.error("[REFERRAL STATS API] Fetching referrals");
    const response = await databases.listDocuments(
      databaseId,
      REFERRALS_COLLECTION_ID,
      [Query.equal('referrerId', referrerId)]
    );

    console.error("[REFERRAL STATS API] Referrals fetched", {
      total: response.total,
      documents: response.documents.length,
    });

    const referrals = response.documents;
    const stats = {
      total: referrals.length,
      valid: referrals.filter(r => r.status === 'VALID').length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      totalDeposits: referrals.reduce((sum, r) => sum + (r.depositAmount || 0), 0),
    };

    console.error("[REFERRAL STATS API] Stats calculated", stats);

    return Response.json({
      referrals,
      stats,
    });

  } catch (error) {
    console.error("[REFERRAL STATS API] ERROR", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ error: "Failed to fetch referral stats" }, { status: 500 });
  }
}
