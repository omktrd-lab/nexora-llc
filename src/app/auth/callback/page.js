"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account, databases, ID } from "@/lib/appwrite";

const REFERRALS_COLLECTION_ID = process.env.NEXT_PUBLIC_REFERRALS_COLLECTION_ID || "referrals";
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      try {
        console.log("=== AUTH CALLBACK START ===");
        
        // Get the current user session
        const currentUser = await account.get();
        console.log("Current user ID:", currentUser.$id);
        console.log("Current user email:", currentUser.email);

        // Get referral ID from URL params
        const referrerId = searchParams.get("ref");
        console.log("Referrer ID from URL:", referrerId);

        // Create referral record if ref exists and not self-referral
        if (referrerId) {
          console.log("Referrer ID found in URL");
          
          if (referrerId === currentUser.$id) {
            console.log("SELF-REFERRAL DETECTED - skipping referral creation");
          } else {
            console.log("Creating referral record...");
            try {
              const document = await databases.createDocument(
                DATABASE_ID,
                REFERRALS_COLLECTION_ID,
                ID.unique(),
                {
                  referrerId,
                  referredUserId: currentUser.$id,
                  status: "PENDING",
                  phoneNumber: currentUser.prefs?.safaricomPhoneNumber || "",
                  hasDeposited: false,
                  depositAmount: 0,
                  createdAt: new Date().toISOString(),
                  completedAt: null,
                }
              );
              console.log("Referral created successfully:", document.$id);
            } catch (error) {
              console.error("Failed to create referral:", error);
              console.error("Error details:", JSON.stringify(error, null, 2));
            }
          }
        } else {
          console.log("No referrer ID found in URL");
        }

        // Redirect to home
        console.log("=== AUTH CALLBACK END - Redirecting to home ===");
        router.replace("/");
      } catch (error) {
        console.error("Auth callback error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        // If no session, redirect to auth
        router.replace("/auth");
      } finally {
        setProcessing(false);
      }
    };

    processCallback();
  }, [router, searchParams]);

  if (processing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Processing sign-in...</p>
      </main>
    );
  }

  return null;
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-6">
          <p className="text-sm text-muted-foreground">Processing sign-in...</p>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
