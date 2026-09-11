"use client";

import { OAuthProvider } from "appwrite";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { account } from "@/lib/appwrite";

export default function AuthPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (window.location.search.includes("error=oauth")) {
      setError("Google sign-in was not completed. Please try again.");
    }

    account
      .get()
      .then(() => {
        // User is already authenticated, redirect to home
        router.replace("/");
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  function signInWithGoogle() {
    setError("");
    setIsSigningIn(true);

    // Get ref from URL params (server-driven, no localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get("ref");
    const successUrl = refCode 
      ? `${window.location.origin}/auth/callback?ref=${refCode}`
      : `${window.location.origin}/auth/callback`;

    console.log("=== OAUTH INITIATION ===");
    console.log("Current URL:", window.location.href);
    console.log("Ref code from URL:", refCode);
    console.log("OAuth success URL:", successUrl);

    account.createOAuth2Session(
      OAuthProvider.Google,
      successUrl,
      `${window.location.origin}/auth?error=oauth`,
    );
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <p className="text-sm text-muted-foreground">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[100svh] items-start justify-center bg-background px-6 py-14 sm:px-10 sm:py-16 md:items-center md:py-12">
      <section className="w-full max-w-md md:rounded-2xl md:border md:border-border md:bg-card md:p-10 md:shadow-xl">
        <div className="mb-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Nexora
          </p>
          <h1 className="text-3xl font-light tracking-tight text-foreground">
            Enter the pool
          </h1>
          <p className="mt-3 leading-6 text-muted-foreground">
            Access Nexora&apos;s HFT bot trading pool and track your share of the
            $NXR ecosystem.
          </p>
        </div>

        {error && (
          <p
            className="mb-5 rounded-lg border border-[#FF6B6B55] bg-[#FF6B6B14] px-4 py-3 text-sm text-[#FF9B9B]"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={isSigningIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-muted px-4 py-3 font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-lg font-semibold">
            G
          </span>
          {isSigningIn ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
          HFT bots, cross-exchange arbitrage, pooled liquidity, and a first-loss
          reserve built into the Nexora model.
        </p>
      </section>
    </main>
  );
}
