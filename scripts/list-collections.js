#!/usr/bin/env node

/**
 * Script to list all collections in the database
 */

const APPWRITE_ENDPOINT = "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = "6aa1173b002524b6310f";
const APPWRITE_API_KEY = "standard_0c8d1ec22cf7b5e0aa7a0112cc24734d6de5a6e8074715b6c0212dcc451275ef480e0fae0838da2ffbb2deec90571cc7c8c77be88bb26c9e6db9b9990babe4a5207bbf0919154c98aef8fd19fa379eb02b32fa7631a2466d564f4fa3fcc40a6bd58c968854c9d663aa3df2641a150dd793a835d193269fef86b7d5128fcab71b";
const DATABASE_ID = "6aa1173b002524b6310f";

async function listCollections() {
  try {
    console.log("Listing all collections in database...");

    const response = await fetch(
      `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections`,
      {
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error("Error: Failed to list collections");
      console.error("Status:", response.status);
      process.exit(1);
    }

    const result = await response.json();
    const collections = result.collections || [];

    console.log(`\nFound ${collections.length} collections:\n`);
    
    collections.forEach(col => {
      console.log(`  Name: ${col.name}`);
      console.log(`  ID: ${col.$id}`);
      console.log(`  ---`);
    });
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

listCollections();
