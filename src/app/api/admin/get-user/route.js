import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function getAppwriteEndpoint() {
  return process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
}

function serverHeaders() {
  return {
    "X-Appwrite-Project": process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
    "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
    "Content-Type": "application/json",
  };
}

function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return jsonError("User ID is required", 400);
    }

    const appwriteEndpoint = getAppwriteEndpoint();
    if (!appwriteEndpoint) {
      return jsonError("Appwrite is not configured on the server.", 503);
    }

    const response = await fetch(
      `${appwriteEndpoint}/users/${encodeURIComponent(userId)}`,
      {
        headers: serverHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return jsonError("User not found", 404);
    }

    const user = await response.json();
    const prefs = user.prefs || {};

    return NextResponse.json({
      userId: user.$id,
      name: user.name || "Not set",
      email: user.email || "Not set",
      createdAt: user.$createdAt,
      updatedAt: user.$updatedAt,
      balanceKes: prefs.balanceKes || 0,
      nxrBalance: prefs.nxrBalance || 0,
      usdtBalance: prefs.usdtBalance || 0,
      phone: prefs.safaricomPhoneNumber || "Not set",
      totalDepositedKes: prefs.totalDepositedKes || 0,
      lastTopUpAt: prefs.lastTopUpAt || "Never",
    });
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return jsonError("Could not fetch user details.", 502);
  }
}
