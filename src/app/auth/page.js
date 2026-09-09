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
      .then(() => router.replace("/"))
      .catch(() => setCheckingSession(false));
  }, [router]);

  function signInWithGoogle() {
    setError("");
    setIsSigningIn(true);

    account.createOAuth2Session({
      provider: OAuthProvider.Google,
      success: `${window.location.origin}/`,
      failure: `${window.location.origin}/auth?error=oauth`,
    });
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-[#8995A8]">Checking your session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12 sm:px-10">
      <section className="w-full max-w-md rounded-2xl border border-[#283140] bg-[#12161F] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-10">
        <div className="mb-10">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#57E6C1]">
            Nexora
          </p>
          <h1 className="font-[Poppins] text-3xl font-light tracking-tight text-[#E7EDF5]">
            Enter the pool
          </h1>
          <p className="mt-3 leading-6 text-[#8995A8]">
            Access Nexora&apos;s quantitative asset pool and track your share of
            the $NXR ecosystem.
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
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-[#283140] bg-[#181E29] px-4 py-3 font-medium text-[#E7EDF5] transition-colors hover:border-[#57E6C1] hover:bg-[#202937] disabled:cursor-wait disabled:opacity-60"
        >
          <span aria-hidden="true" className="text-lg font-semibold">
            G
          </span>
          {isSigningIn ? "Redirecting to Google..." : "Continue with Google"}
        </button>

        <p className="mt-8 text-center text-xs leading-5 text-[#8995A8]">
          HFT bots, cross-exchange arbitrage, pooled liquidity, and a first-loss
          reserve built into the Nexora model.
        </p>
      </section>
    </main>
  );
}
