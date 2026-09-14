#!/usr/bin/env node

/**
 * Script to check user details and current balances
 * Usage: node scripts/check-user.js <userId>
 * Example: node scripts/check-user.js 6aa5114ee7415534cb89
 */

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6aa1173b002524b6310f";
const APPWRITE_API_KEY = "standard_0c8d1ec22cf7b5e0aa7a0112cc24734d6de5a6e8074715b6c0212dcc451275ef480e0fae0838da2ffbb2deec90571cc7c8c77be88bb26c9e6db9b9990babe4a5207bbf0919154c98aef8fd19fa379eb02b32fa7631a2466d564f4fa3fcc40a6bd58c968854c9d663aa3df2641a150dd793a835d193269fef86b7d5128fcab71b";

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: node scripts/check-user.js <userId>");
  console.error("Example: node scripts/check-user.js 6aa5114ee7415534cb89");
  process.exit(1);
}

async function checkUser() {
  try {
    console.log(`Checking user: ${userId}\n`);

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
    const prefs = user.prefs || {};

    console.log("User Details:");
    console.log(`  Name: ${user.name || "Not set"}`);
    console.log(`  Email: ${user.email || "Not set"}`);
    console.log(`  User ID: ${user.$id}`);
    console.log(`  Created: ${user.$createdAt}`);
    console.log(`  Updated: ${user.$updatedAt}`);

    console.log("\nCurrent Balances:");
    console.log(`  KES: ${prefs.balanceKes || 0}`);
    console.log(`  NXR: ${prefs.nxrBalance || 0}`);
    console.log(`  USDT: ${prefs.usdtBalance || 0}`);

    console.log("\nOther Preferences:");
    console.log(`  Phone: ${prefs.safaricomPhoneNumber || "Not set"}`);
    console.log(`  Total Deposited KES: ${prefs.totalDepositedKes || 0}`);
    console.log(`  Last Top-up: ${prefs.lastTopUpAt || "Never"}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkUser();
