require('dotenv').config();
const { Client, Databases, ID, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const REFERRAL_CODES_COLLECTION_ID = 'referral_codes';

// Generate random code: NXR-XXNN (2 letters + 2 numbers)
function generateReferralCode() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  const letterPart = Array.from({ length: 2 }, () => 
    letters[Math.floor(Math.random() * letters.length)]
  ).join('');
  
  const numberPart = Array.from({ length: 2 }, () => 
    numbers[Math.floor(Math.random() * numbers.length)]
  ).join('');
  
  return `NXR-${letterPart}${numberPart}`;
}

async function createReferralCodesCollection() {
  try {
    console.log('Creating referral_codes collection...');
    
    // Create collection with permissions
    const collection = await databases.createCollection(
      DATABASE_ID,
      REFERRAL_CODES_COLLECTION_ID,
      'Referral Codes',
      [
        'read("any")',
        'create("any")',
        'update("any")',
        'delete("any")'
      ]
    );
    console.log('Collection created:', collection.$id);
    
    // Create attributes
    await databases.createStringAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'code', 10, true);
    await databases.createStringAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'assignedTo', 255, false);
    await databases.createBooleanAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'isAssigned', false);
    await databases.createStringAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'assignedAt', 50, false);
    
    // Create index on code
    await databases.createIndex(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'idx_code', 'key', ['code']);
    
    // Create index on assignedTo
    await databases.createIndex(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'idx_assignedTo', 'key', ['assignedTo']);
    
    console.log('Schema created successfully!');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('Collection already exists, adding attributes...');
      
      // Add attributes to existing collection
      try {
        await databases.createStringAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'code', 10, true);
      } catch (e) { if (!e.message.includes('already exists')) console.error('Error creating code attr:', e.message); }
      
      try {
        await databases.createStringAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'assignedTo', 255, false);
      } catch (e) { if (!e.message.includes('already exists')) console.error('Error creating assignedTo attr:', e.message); }
      
      try {
        await databases.createBooleanAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'isAssigned', false);
      } catch (e) { if (!e.message.includes('already exists')) console.error('Error creating isAssigned attr:', e.message); }
      
      try {
        await databases.createStringAttribute(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'assignedAt', 50, false);
      } catch (e) { if (!e.message.includes('already exists')) console.error('Error creating assignedAt attr:', e.message); }
      
      try {
        await databases.createIndex(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'idx_code', 'key', ['code']);
      } catch (e) { if (!e.message.includes('already exists')) console.error('Error creating code index:', e.message); }
      
      try {
        await databases.createIndex(DATABASE_ID, REFERRAL_CODES_COLLECTION_ID, 'idx_assignedTo', 'key', ['assignedTo']);
      } catch (e) { if (!e.message.includes('already exists')) console.error('Error creating assignedTo index:', e.message); }
      
      console.log('Attributes added successfully!');
    } else {
      throw error;
    }
  }
}

async function generateCodes(count = 1000) {
  try {
    console.log(`Generating ${count} referral codes...`);
    
    const codes = new Set();
    const batchSize = 100;
    
    for (let i = 0; i < count; i++) {
      let code;
      do {
        code = generateReferralCode();
      } while (codes.has(code));
      
      codes.add(code);
      
      // Batch insert every 100 codes
      if (codes.size % batchSize === 0) {
        const batch = Array.from(codes).slice(-batchSize);
        for (const c of batch) {
          try {
            await databases.createDocument(
              DATABASE_ID,
              REFERRAL_CODES_COLLECTION_ID,
              ID.unique(),
              {
                code: c,
                assignedTo: '',
                isAssigned: false,
                assignedAt: ''
              }
            );
          } catch (error) {
            if (!error.message.includes('already exists')) {
              console.error(`Failed to create code ${c}:`, error.message);
            }
          }
        }
        console.log(`Generated ${codes.size} codes...`);
      }
    }
    
    // Insert remaining codes
    const remaining = Array.from(codes).slice(-(count % batchSize));
    for (const c of remaining) {
      try {
        await databases.createDocument(
          DATABASE_ID,
          REFERRAL_CODES_COLLECTION_ID,
          ID.unique(),
          {
            code: c,
            assignedTo: '',
            isAssigned: false,
            assignedAt: ''
          }
        );
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.error(`Failed to create code ${c}:`, error.message);
        }
      }
    }
    
    console.log(`✓ Successfully generated ${count} referral codes!`);
    
  } catch (error) {
    console.error('Error generating codes:', error);
  }
}

async function run() {
  try {
    await createReferralCodesCollection();
    await generateCodes(1000);
    console.log('\n✓ Referral code system setup complete!');
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
