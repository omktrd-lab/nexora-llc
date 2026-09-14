#!/usr/bin/env node

/**
 * Script to list all payment ledger rows for a specific user
 * Usage: node scripts/list-user-payments.js <userId>
 * Example: node scripts/list-user-payments.js 6aa602a1513d1d689936
 */

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6aa1173b002524b6310f";
const APPWRITE_API_KEY = "standard_0c8d1ec22cf7b5e0aa7a0112cc24734d6de5a6e8074715b6c0212dcc451275ef480e0fae0838da2ffbb2deec90571cc7c8c77be88bb26c9e6db9b9990babe4a5207bbf0919154c98aef8fd19fa379eb02b32fa7631a2466d564f4fa3fcc40a6bd58c968854c9d663aa3df2641a150dd793a835d193269fef86b7d5128fcab71b";
const DATABASE_ID = "6aa1baa7003042cae53a";
const PAYMENT_LEDGER_ID = "6aa1bb94001f00e83353";

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: node scripts/list-user-payments.js <userId>");
  console.error("Example: node scripts/list-user-payments.js 6aa602a1513d1d689936");
  process.exit(1);
}

async function listUserPayments() {
  try {
    console.log(`Listing payment ledger rows for user: ${userId}`);

    // Query for rows matching the userId
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/tablesdb/${DATABASE_ID}/tables/${PAYMENT_LEDGER_ID}/rows?queries[]=${encodeURIComponent(`equal("userId",["${userId}"]`)}`,
      {
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error("Error: Failed to query payment ledger");
      console.error("Status:", response.status);
      process.exit(1);
    }

    const result = await response.json();
    const rows = result.rows || [];

    console.log(`\nFound ${rows.length} payment ledger rows for this user:\n`);
    
    if (rows.length === 0) {
      console.log("⚠️  No payment records found for this user.");
      console.log("This means the user has never made a successful payment.");
      return;
    }

    rows.forEach((row, index) => {
      const data = row.data || row;
      console.log(`Payment #${index + 1}:`);
      console.log(`  Row ID: ${row.$id}`);
      console.log(`  Reference: ${data.reference}`);
      console.log(`  Status: ${data.status}`);
      console.log(`  Amount (KES): ${data.amountKes}`);
      console.log(`  Receipt Number: ${data.receiptNumber}`);
      console.log(`  Created At: ${data.createdAt}`);
      console.log(`  ---`);
    });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

listUserPayments();
