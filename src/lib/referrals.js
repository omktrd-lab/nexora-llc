import { databases, ID, Query } from "@/lib/appwrite";

const REFERRALS_COLLECTION_ID = process.env.NEXT_PUBLIC_REFERRALS_COLLECTION_ID || "referrals";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

// Local storage and cookie keys
const REFERRAL_STORAGE_KEY = "nexora_ref_id";
const REFERRAL_COOKIE_KEY = "nexora_ref_id";

/**
 * Persist referral ID to localStorage and cookie
 */
export function persistReferralId(referrerId) {
  if (!referrerId) return;
  
  // Store in localStorage
  localStorage.setItem(REFERRAL_STORAGE_KEY, referrerId);
  
  // Store in cookie (7 days expiry)
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  document.cookie = `${REFERRAL_COOKIE_KEY}=${referrerId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Get referral ID from localStorage or cookie
 */
export function getReferralId() {
  // Try localStorage first
  const storageRef = localStorage.getItem(REFERRAL_STORAGE_KEY);
  if (storageRef) return storageRef;
  
  // Try cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === REFERRAL_COOKIE_KEY) {
      return value;
    }
  }
  
  return null;
}

/**
 * Clear stored referral ID
 */
export function clearReferralId() {
  localStorage.removeItem(REFERRAL_STORAGE_KEY);
  document.cookie = `${REFERRAL_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

/**
 * Create a referral record
 */
export async function createReferral(referrerId, referredUserId, phoneNumber = null) {
  try {
    const now = new Date().toISOString();
    const document = await databases.createDocument(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      ID.unique(),
      {
        referrerId,
        referredUserId,
        status: 'PENDING',
        phoneNumber: phoneNumber || '',
        hasDeposited: false,
        depositAmount: 0,
        createdAt: now,
        completedAt: null,
      }
    );
    return document;
  } catch (error) {
    console.error('Error creating referral:', error);
    throw error;
  }
}

/**
 * Update referral status to VALID on deposit
 */
export async function validateReferral(referredUserId, depositAmount) {
  try {
    console.error("[VALIDATE REFERRAL] Starting referral validation", {
      referredUserId: referredUserId ? referredUserId.substring(0, 8) + "..." : null,
      depositAmount,
      collectionId: REFERRALS_COLLECTION_ID,
      databaseId: DATABASE_ID,
    });

    // Find pending referral for this user
    const response = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      [
        Query.equal('referredUserId', referredUserId),
        Query.equal('status', 'PENDING')
      ]
    );

    console.error("[VALIDATE REFERRAL] Pending referrals found", {
      count: response.documents.length,
    });

    if (response.documents.length === 0) {
      console.error("[VALIDATE REFERRAL] No pending referrals found for user");
      return null;
    }

    const referral = response.documents[0];
    console.error("[VALIDATE REFERRAL] Updating referral", {
      referralId: referral.$id,
      referrerId: referral.referrerId ? referral.referrerId.substring(0, 8) + "..." : null,
    });

    const updated = await databases.updateDocument(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      referral.$id,
      {
        status: 'VALID',
        hasDeposited: true,
        depositAmount: depositAmount,
      }
    );

    console.error("[VALIDATE REFERRAL] Referral updated successfully", {
      referralId: updated.$id,
      status: updated.status,
    });

    return updated;
  } catch (error) {
    console.error('[VALIDATE REFERRAL] ERROR:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Get all referrals for a referrer
 */
export async function getReferrals(referrerId) {
  try {
    console.error("[GET REFERRALS] Fetching referrals", {
      referrerId: referrerId ? referrerId.substring(0, 8) + "..." : null,
      collectionId: REFERRALS_COLLECTION_ID,
      databaseId: DATABASE_ID,
    });

    const response = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      [Query.equal('referrerId', referrerId)]
    );

    console.error("[GET REFERRALS] Response", {
      total: response.total,
      documents: response.documents.length,
    });

    return response.documents;
  } catch (error) {
    console.error('[GET REFERRALS] ERROR:', error);
    return [];
  }
}

/**
 * Get referral stats for a referrer
 */
export async function getReferralStats(referrerId) {
  try {
    const referrals = await getReferrals(referrerId);
    
    const stats = {
      total: referrals.length,
      valid: referrals.filter(r => r.status === 'VALID').length,
      pending: referrals.filter(r => r.status === 'PENDING').length,
      totalDeposits: referrals.reduce((sum, r) => sum + (r.depositAmount || 0), 0),
    };
    
    return stats;
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return { total: 0, valid: 0, pending: 0, totalDeposits: 0 };
  }
}

/**
 * Check if user can withdraw (has at least 1 valid referral)
 */
export async function canUserWithdraw(userId) {
  try {
    const stats = await getReferralStats(userId);
    return stats.valid >= 1;
  } catch (error) {
    console.error('Error checking withdrawal eligibility:', error);
    return false;
  }
}

/**
 * Generate referral link for a user
 */
export function generateReferralLink(userId) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}?ref=${userId}`;
}
