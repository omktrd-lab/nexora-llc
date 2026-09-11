import { databases, ID, Query } from "@/lib/appwrite";

const REFERRALS_COLLECTION_ID = process.env.NEXT_PUBLIC_REFERRALS_COLLECTION_ID || "referrals";
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

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
    // Find pending referral for this user
    const response = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      [
        Query.equal('referredUserId', referredUserId),
        Query.equal('status', 'PENDING')
      ]
    );
    
    if (response.documents.length === 0) return null;
    
    const referral = response.documents[0];
    const updated = await databases.updateDocument(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      referral.$id,
      {
        status: 'VALID',
        hasDeposited: true,
        depositAmount: depositAmount,
        completedAt: new Date().toISOString(),
      }
    );
    
    return updated;
  } catch (error) {
    console.error('Error validating referral:', error);
    throw error;
  }
}

/**
 * Get all referrals for a referrer
 */
export async function getReferrals(referrerId) {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      REFERRALS_COLLECTION_ID,
      [Query.equal('referrerId', referrerId)]
    );
    return response.documents;
  } catch (error) {
    console.error('Error fetching referrals:', error);
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
