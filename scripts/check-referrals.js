require('dotenv').config();
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const REFERRALS_COLLECTION_ID = 'referrals';
const USERS_COLLECTION_ID = 'users';

async function checkReferrals() {
  try {
    console.log('=== CHECKING REFERRALS COLLECTION ===');
    
    // Get all referrals
    const referralsResponse = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID
    );
    
    console.log(`Total referrals in database: ${referralsResponse.total}`);
    
    if (referralsResponse.documents.length === 0) {
      console.log('No referrals found in the database.');
    } else {
      console.log('\nAll referrals:');
      referralsResponse.documents.forEach((ref, index) => {
        console.log(`\n${index + 1}. Referral ID: ${ref.$id}`);
        console.log(`   Referrer ID: ${ref.referrerId}`);
        console.log(`   Referred User ID: ${ref.referredUserId}`);
        console.log(`   Status: ${ref.status}`);
        console.log(`   Phone: ${ref.phoneNumber || 'Not set'}`);
        console.log(`   Has Deposited: ${ref.hasDeposited}`);
        console.log(`   Deposit Amount: ${ref.depositAmount || 0}`);
        console.log(`   Created At: ${ref.createdAt}`);
      });
    }
    
    console.log('\n=== CHECKING USERS COLLECTION (for emails starting with "bun") ===');
    
    // Try to find users with email starting with "bun"
    // Note: This requires a users collection or we need to check Appwrite users
    try {
      const usersResponse = await databases.listDocuments(
        DATABASE_ID,
        USERS_COLLECTION_ID,
        [Query.startsWith('email', 'bun')]
      );
      
      console.log(`Users with email starting with "bun": ${usersResponse.total}`);
      usersResponse.documents.forEach((user, index) => {
        console.log(`\n${index + 1}. User ID: ${user.$id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Name: ${user.name || 'Not set'}`);
      });
    } catch (error) {
      console.log('Users collection may not exist or error querying:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking referrals:', error);
  }
}

checkReferrals();
