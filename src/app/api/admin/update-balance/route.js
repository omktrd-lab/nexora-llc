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
    const { userId, balanceKes, nxrBalance, usdtBalance, adminKey } = body;

    // Simple admin key verification
    const ADMIN_KEY = process.env.ADMIN_UPDATE_KEY || "nexora-admin-2024";
    if (adminKey !== ADMIN_KEY) {
      return jsonError("Unauthorized: Invalid admin key", 401);
    }

    if (!userId) {
      return jsonError("User ID is required", 400);
    }

    const appwriteEndpoint = getAppwriteEndpoint();
    if (!appwriteEndpoint) {
      return jsonError("Appwrite is not configured on the server.", 503);
    }

    // Get current user prefs
    const userResponse = await fetch(
      `${appwriteEndpoint}/users/${encodeURIComponent(userId)}`,
      {
        headers: serverHeaders(),
        cache: "no-store",
      },
    );

    if (!userResponse.ok) {
      return jsonError("User not found", 404);
    }

    const user = await userResponse.json();
    const currentPrefs = user.prefs || {};

    // Build updated prefs
    const updatedPrefs = {
      ...currentPrefs,
    };

    if (Number.isFinite(balanceKes)) {
      updatedPrefs.balanceKes = Number(balanceKes);
    }
    if (Number.isFinite(nxrBalance)) {
      updatedPrefs.nxrBalance = Number(nxrBalance);
    }
    if (Number.isFinite(usdtBalance)) {
      updatedPrefs.usdtBalance = Number(usdtBalance);
    }

    // Update user prefs
    const updateResponse = await fetch(
      `${appwriteEndpoint}/users/${encodeURIComponent(userId)}/prefs`,
      {
        method: "PATCH",
        headers: serverHeaders(),
        body: JSON.stringify({ prefs: updatedPrefs }),
      },
    );

    if (!updateResponse.ok) {
      return jsonError("Failed to update user balance", 500);
    }

    return NextResponse.json({
      success: true,
      userId,
      updatedBalances: {
        balanceKes: updatedPrefs.balanceKes,
        nxrBalance: updatedPrefs.nxrBalance,
        usdtBalance: updatedPrefs.usdtBalance,
      },
    });
  } catch (error) {
    console.error("Admin balance update failed:", error);
    return jsonError("Failed to update user balance", 500);
  }
}
