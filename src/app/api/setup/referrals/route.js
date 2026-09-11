import { NextResponse } from "next/server";
import { Client, Databases, ID, Permission, Role } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

export async function POST() {
  try {
    console.log('Creating referrals collection...');
    
    const collection = await databases.createCollection(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
      'referrals',
      'Referrals',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );
    
    console.log('Collection created:', collection.$id);
    
    // Create attributes
    console.log('Creating attributes...');
    
    // referrerId (string, indexed)
    await databases.createStringAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'referrerId', 255, true);
    await databases.createIndex(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'idx_referrerId', ['referrerId']);
    
    // referredUserId (string, indexed, unique)
    await databases.createStringAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'referredUserId', 255, true);
    await databases.createIndex(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'idx_referredUserId', ['referredUserId'], ['unique']);
    
    // status (string)
    await databases.createStringAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'status', 50, true);
    
    // phoneNumber (string)
    await databases.createStringAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'phoneNumber', 50, false);
    
    // hasDeposited (boolean)
    await databases.createBooleanAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'hasDeposited', true);
    
    // depositAmount (number/float)
    await databases.createFloatAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'depositAmount', true);
    
    // createdAt (datetime)
    await databases.createDatetimeAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'createdAt', true);
    
    // completedAt (datetime)
    await databases.createDatetimeAttribute(process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID, 'referrals', 'completedAt', false);
    
    console.log('All attributes and indexes created successfully!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Referrals collection created successfully',
      collectionId: collection.$id 
    });
    
  } catch (error) {
    console.error('Error creating collection:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
