#!/usr/bin/env node

/**
 * Script to check payment ledger status
 * Usage: node scripts/check-payment-ledger.js <ledgerRowId>
 * Example: node scripts/check-payment-ledger.js 6aa6df1adb35942fac6b
 */

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6aa1173b002524b6310f";
const APPWRITE_API_KEY = "standard_0c8d1ec22cf7b5e0aa7a0112cc24734d6de5a6e8074715b6c0212dcc451275ef480e0fae0838da2ffbb2deec90571cc7c8c77be88bb26c9e6db9b9990babe4a5207bbf0919154c98aef8fd19fa379eb02b32fa7631a2466d564f4fa3fcc40a6bd58c968854c9d663aa3df2641a150dd793a835d193269fef86b7d5128fcab71b";
const DATABASE_ID = "6aa1baa7003042cae53a";
const PAYMENT_LEDGER_ID = "6aa1bb94001f00e83353";

const ledgerRowId = process.argv[2];

if (!ledgerRowId) {
  console.error("Usage: node scripts/check-payment-ledger.js <ledgerRowId>");
  console.error("Example: node scripts/check-payment-ledger.js 6aa6df1adb35942fac6b");
  process.exit(1);
}

async function checkLedger() {
  try {
    console.log(`Checking payment ledger row: ${ledgerRowId}`);

    // Use tablesdb format like in payment-ledger.js
    const response = await fetch(
      `${APPWRITE_ENDPOINT}/tablesdb/${DATABASE_ID}/tables/${PAYMENT_LEDGER_ID}/rows/${encodeURIComponent(ledgerRowId)}`,
      {
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error("Error: Ledger row not found");
      console.error("Status:", response.status);
      process.exit(1);
    }

    const ledger = await response.json();
    const data = ledger.data || ledger;

    console.log("\nPayment Ledger Details:");
    console.log(`  Row ID: ${ledger.$id}`);
    console.log(`  User ID: ${data.userId}`);
    console.log(`  Reference: ${data.reference}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Amount (KES): ${data.amountKes}`);
    console.log(`  Receipt Number: ${data.receiptNumber}`);
    console.log(`  Checkout Request ID: ${data.checkoutRequestId}`);
    console.log(`  Created At: ${data.createdAt}`);
    console.log(`  Updated At: ${data.updatedAt}`);

    // Check if payment was successful
    const successStatuses = ["success", "successful", "completed", "complete", "paid", "succeeded"];
    const isSuccess = successStatuses.includes(String(data.status).toLowerCase());
    
    console.log(`\nPayment Successful: ${isSuccess ? "✅ YES" : "❌ NO"}`);
    
    if (!isSuccess) {
      console.log("\n⚠️  This payment was not marked as successful, so the balance was not credited.");
      console.log("The balance update only happens when payment status is successful.");
    }
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkLedger();
