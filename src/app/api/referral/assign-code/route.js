import { Client, Databases, Query, ID } from "node-appwrite";

const client = new Client();

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const REFERRAL_CODES_COLLECTION_ID = "referral_codes";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

export async function POST(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 });
    }

    // Check if user already has a code assigned
    const existingCode = await databases.listDocuments(
      DATABASE_ID,
      REFERRAL_CODES_COLLECTION_ID,
      [Query.equal("assignedTo", userId)]
    );

    if (existingCode.documents.length > 0) {
      return Response.json({ 
        code: existingCode.documents[0].code,
        message: "User already has a referral code"
      });
    }

    // Find an unassigned code
    const unassignedCodes = await databases.listDocuments(
      DATABASE_ID,
      REFERRAL_CODES_COLLECTION_ID,
      [Query.equal("isAssigned", false)]
    );

    if (unassignedCodes.documents.length === 0) {
      return Response.json({ error: "No referral codes available" }, { status: 400 });
    }

    // Assign the first available code
    const codeDoc = unassignedCodes.documents[0];
    const updated = await databases.updateDocument(
      DATABASE_ID,
      REFERRAL_CODES_COLLECTION_ID,
      codeDoc.$id,
      {
        assignedTo: userId,
        isAssigned: true,
        assignedAt: new Date().toISOString()
      }
    );

    return Response.json({ 
      code: updated.code,
      message: "Referral code assigned successfully"
    });

  } catch (error) {
    console.error("Error assigning referral code:", error);
    return Response.json({ error: "Failed to assign referral code" }, { status: 500 });
  }
}
