"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { account, databases, ID } from "@/lib/appwrite";

const REFERRALS_COLLECTION_ID = process.env.NEXT_PUBLIC_REFERRALS_COLLECTION_ID || "referrals";
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;

function isSessionLimitError(error) {
  const type = error?.type || "";
  const message = String(error?.message || "").toLowerCase();
  return (
    type === "user_session_already_exists" ||
    message.includes("maximum number of sessions") ||
    message.includes("session limit")
  );
}

async function establishSession(userId, secret) {
  try {
    await account.createSession(userId, secret);
  } catch (error) {
    if (!isSessionLimitError(error)) throw error;

    const response = await fetch("/api/auth/clear-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, secret }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "Could not free an old sign-in session.");
    }
    if (result.cookieFallback) {
      window.localStorage.setItem("cookieFallback", result.cookieFallback);
      return;
    }
    await account.createSession(userId, secret);
  }
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const processCallback = async () => {
      const userId = searchParams.get("userId");
      const secret = searchParams.get("secret");
      const referrerId = searchParams.get("ref");

      try {
        console.log("=== AUTH CALLBACK START ===");

        if (userId && secret) {
          await establishSession(userId, secret);
          window.history.replaceState({}, "", "/auth/callback");
        }

        const currentUser = await account.get();
        console.log("Current user ID:", currentUser.$id);

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
        router.replace("/trade");
      } catch (error) {
        console.error("Auth callback error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        // If no session, redirect to auth
        router.replace("/auth?error=session");
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
