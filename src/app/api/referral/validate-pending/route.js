export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    console.error("[VALIDATE PENDING] Starting pending referral validation");

    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
    const apiKey = process.env.APPWRITE_API_KEY;
    const databaseId = process.env.APPWRITE_DATABASE_ID;
    const referralsCollectionId = process.env.NEXT_PUBLIC_REFERRALS_COLLECTION_ID || "referrals";

    console.error("[VALIDATE PENDING] Appwrite config", {
      hasEndpoint: !!endpoint,
      hasProjectId: !!projectId,
      hasApiKey: !!apiKey,
      hasDatabaseId: !!databaseId,
    });

    if (!endpoint || !projectId || !apiKey || !databaseId) {
      return Response.json({ error: "Appwrite is not configured" }, { status: 503 });
    }

    const { Client, Databases, Query, Users } = await import("node-appwrite");
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);
    const users = new Users(client);

    // Fetch all pending referrals
    const pendingReferrals = await databases.listDocuments(
      databaseId,
      referralsCollectionId,
      [Query.equal('status', 'PENDING')]
    );

    console.error("[VALIDATE PENDING] Pending referrals found", {
      count: pendingReferrals.documents.length,
    });

    let updatedCount = 0;

    for (const referral of pendingReferrals.documents) {
      const referredUserId = referral.referredUserId;

      try {
        // Get the referred user's preferences to check if they have deposited
        const user = await users.get(referredUserId);
        const totalDepositedKes = Number(user.prefs?.totalDepositedKes || 0);

        console.error("[VALIDATE PENDING] Checking user deposit", {
          referredUserId: referredUserId.substring(0, 8) + "...",
          totalDepositedKes,
        });

        if (totalDepositedKes > 0) {
          // User has deposited, update referral to VALID
          const updated = await databases.updateDocument(
            databaseId,
            referralsCollectionId,
            referral.$id,
            {
              status: 'VALID',
              hasDeposited: true,
              depositAmount: totalDepositedKes,
            }
          );

          console.error("[VALIDATE PENDING] Referral updated to VALID", {
            referralId: updated.$id,
            referrerId: updated.referrerId.substring(0, 8) + "...",
            depositAmount: updated.depositAmount,
          });

          updatedCount++;
        }
      } catch (error) {
        console.error("[VALIDATE PENDING] Error checking user", {
          referredUserId: referredUserId.substring(0, 8) + "...",
          error: error.message,
        });
      }
    }

    console.error("[VALIDATE PENDING] Validation complete", {
      totalPending: pendingReferrals.documents.length,
      updatedToValid: updatedCount,
    });

    return Response.json({
      success: true,
      totalPending: pendingReferrals.documents.length,
      updatedToValid: updatedCount,
    });

  } catch (error) {
    console.error("[VALIDATE PENDING] ERROR:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
