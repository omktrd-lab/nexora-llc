const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('6aa1173b002524b6310f')
  .setKey('standard_0c8d1ec22cf7b5e0aa7a0112cc24734d6de5a6e8074715b6c0212dcc451275ef480e0fae0838da2ffbb2deec90571cc7c8c77be88bb26c9e6db9b9990babe4a5207bbf0919154c98aef8fd19fa379eb02b32fa7631a2466d564f4fa3fcc40a6bd58c968854c9d663aa3df2641a150dd793a835d193269fef86b7d5128fcab71b');

const databases = new Databases(client);
const DATABASE_ID = '6aa1baa7003042cae53a';

async function run() {
  try {
    console.log('Creating referrals collection...');
    
    try {
      const collection = await databases.createCollection(
        DATABASE_ID,
        'referrals',
        'Referrals'
      );
      console.log('Collection created:', collection.$id);
    } catch (createErr) {
      if (createErr.message.includes('already exists')) {
        console.log('Collection already exists, adding attributes...');
      } else {
        throw createErr;
      }
    }

    // Create attributes
    console.log('Creating attributes...');
    
    try {
      await databases.createStringAttribute(DATABASE_ID, 'referrals', 'referrerId', 255, true);
      console.log('✓ referrerId');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }
    
    try {
      await databases.createStringAttribute(DATABASE_ID, 'referrals', 'referredUserId', 255, true);
      console.log('✓ referredUserId');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }
    
    try {
      await databases.createStringAttribute(DATABASE_ID, 'referrals', 'status', 50, false);
      console.log('✓ status');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }
    
    try {
      await databases.createStringAttribute(DATABASE_ID, 'referrals', 'phoneNumber', 50, false);
      console.log('✓ phoneNumber');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }
    
    try {
      await databases.createBooleanAttribute(DATABASE_ID, 'referrals', 'hasDeposited', false);
      console.log('✓ hasDeposited');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }
    
    try {
      await databases.createFloatAttribute(DATABASE_ID, 'referrals', 'depositAmount', false);
      console.log('✓ depositAmount');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }
    
    try {
      await databases.createStringAttribute(DATABASE_ID, 'referrals', 'completedAt', 100, false);
      console.log('✓ completedAt');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }

    // Create indexes
    console.log('Creating indexes...');
    
    try {
      await databases.createIndex(DATABASE_ID, 'referrals', 'idx_referrerId', 'key', ['referrerId']);
      console.log('✓ idx_referrerId');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }
    
    try {
      await databases.createIndex(DATABASE_ID, 'referrals', 'idx_referredUserId', 'unique', ['referredUserId']);
      console.log('✓ idx_referredUserId');
    } catch (e) { if (!e.message.includes('already exists')) throw e; }

    console.log('Referrals schema created successfully!');
  } catch (err) {
    console.error('Error creating schema:', err.message);
  }
}

run();
