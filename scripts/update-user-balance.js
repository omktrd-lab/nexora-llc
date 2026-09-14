#!/usr/bin/env node

/**
 * Script to update user balances directly via command line
 * Usage: node scripts/update-user-balance.js <userId> <balanceKes> [nxrBalance] [usdtBalance]
 * Example: node scripts/update-user-balance.js 6aa602a1513d1d689936 20000
 */

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6aa1173b002524b6310f";
const APPWRITE_API_KEY = "standard_0c8d1ec22cf7b5e0aa7a0112cc24734d6de5a6e8074715b6c0212dcc451275ef480e0fae0838da2ffbb2deec90571cc7c8c77be88bb26c9e6db9b9990babe4a5207bbf0919154c98aef8fd19fa379eb02b32fa7631a2466d564f4fa3fcc40a6bd58c968854c9d663aa3df2641a150dd793a835d193269fef86b7d5128fcab71b";

const userId = process.argv[2];
const balanceKes = parseFloat(process.argv[3]);
const nxrBalance = process.argv[4] ? parseFloat(process.argv[4]) : undefined;
const usdtBalance = process.argv[5] ? parseFloat(process.argv[5]) : undefined;

if (!userId || isNaN(balanceKes)) {
  console.error("Usage: node scripts/update-user-balance.js <userId> <balanceKes> [nxrBalance] [usdtBalance]");
  console.error("Example: node scripts/update-user-balance.js 6aa602a1513d1d689936 20000");
  process.exit(1);
}

async function updateBalance() {
  try {
    console.log(`Updating balance for user ${userId}...`);
    console.log(`KES Balance: ${balanceKes}`);
    if (nxrBalance !== undefined) console.log(`NXR Balance: ${nxrBalance}`);
    if (usdtBalance !== undefined) console.log(`USDT Balance: ${usdtBalance}`);

    // Get current user details
    const userResponse = await fetch(
      `${APPWRITE_ENDPOINT}/users/${encodeURIComponent(userId)}`,
      {
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
        },
      },
    );

    if (!userResponse.ok) {
      console.error("Error: User not found");
      process.exit(1);
    }

    const user = await userResponse.json();
    const currentPrefs = user.prefs || {};

    console.log("\nUser Details:");
    console.log(`  Name: ${user.name || "Not set"}`);
    console.log(`  Email: ${user.email || "Not set"}`);
    console.log(`  User ID: ${user.$id}`);

    console.log("\nCurrent balances:");
    console.log(`  KES: ${currentPrefs.balanceKes || 0}`);
    console.log(`  NXR: ${currentPrefs.nxrBalance || 0}`);
    console.log(`  USDT: ${currentPrefs.usdtBalance || 0}`);

    // Build updated prefs
    const updatedPrefs = {
      ...currentPrefs,
      balanceKes: balanceKes,
    };

    if (!isNaN(nxrBalance)) {
      updatedPrefs.nxrBalance = nxrBalance;
    }
    if (!isNaN(usdtBalance)) {
      updatedPrefs.usdtBalance = usdtBalance;
    }

    // Update user prefs
    const updateResponse = await fetch(
      `${APPWRITE_ENDPOINT}/users/${encodeURIComponent(userId)}/prefs`,
      {
        method: "PATCH",
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefs: updatedPrefs }),
      },
    );

    if (!updateResponse.ok) {
      console.error("Error: Failed to update user balance");
      process.exit(1);
    }

    console.log("\n✅ Balance updated successfully!");
    console.log("New balances:");
    console.log(`  KES: ${updatedPrefs.balanceKes}`);
    console.log(`  NXR: ${updatedPrefs.nxrBalance || 0}`);
    console.log(`  USDT: ${updatedPrefs.usdtBalance || 0}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

updateBalance();
