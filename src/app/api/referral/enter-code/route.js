import { Client, Databases, Query, ID } from "node-appwrite";

const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const REFERRAL_CODES_COLLECTION_ID = "referral_codes";
const REFERRALS_COLLECTION_ID = "referrals";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

export async function POST(request) {
  try {
    const { code, userId } = await request.json();

    if (!code || !userId) {
      return Response.json({ error: "Code and user ID are required" }, { status: 400 });
    }

    // Find the referral code
    const codeDocs = await databases.listDocuments(
      DATABASE_ID,
      REFERRAL_CODES_COLLECTION_ID,
      [Query.equal("code", code)]
    );

    if (codeDocs.documents.length === 0) {
      return Response.json({ error: "Invalid referral code" }, { status: 400 });
    }

    const codeDoc = codeDocs.documents[0];

    // Check if code is assigned to someone
    if (!codeDoc.isAssigned) {
      return Response.json({ error: "Referral code not active" }, { status: 400 });
    }

    // Prevent self-referral
    if (codeDoc.assignedTo === userId) {
      return Response.json({ error: "Cannot use your own referral code" }, { status: 400 });
    }

    // Check if user already used this code
    const existingReferrals = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      [
        Query.equal("referrerId", codeDoc.assignedTo),
        Query.equal("referredUserId", userId)
      ]
    );

    if (existingReferrals.documents.length > 0) {
      return Response.json({ error: "You already used this referral code" }, { status: 400 });
    }

    // Create referral record
    const referral = await databases.createDocument(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      ID.unique(),
      {
        referrerId: codeDoc.assignedTo,
        referredUserId: userId,
        status: "PENDING",
        phoneNumber: "",
        hasDeposited: false,
        depositAmount: 0,
        createdAt: new Date().toISOString(),
        completedAt: null
      }
    );

    return Response.json({ 
      message: "Referral code applied successfully",
      referralId: referral.$id
    });

  } catch (error) {
    console.error("Error processing referral code:", error);
    return Response.json({ error: "Failed to process referral code" }, { status: 500 });
  }
}
