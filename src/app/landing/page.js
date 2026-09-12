"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center bg-[#090a0c] px-6">
      <div className="max-w-2xl text-center">
        {/* Headline */}
        <h1 className="mb-4 text-3xl font-light tracking-tight text-white sm:text-4xl sm:font-semibold">
          Trade Smarter with HFT
        </h1>

        {/* Subheadline */}
        <p className="mb-6 text-sm leading-relaxed text-zinc-400 sm:text-base">
          High-frequency trading strategies working for you. Access quantitative asset pools and track your share of the NXR ecosystem.
        </p>

        {/* Features */}
        <ul className="mb-6 space-y-2 text-xs text-zinc-400 sm:space-y-3 sm:text-sm">
          <li className="flex items-center justify-center gap-2">
            <span className="size-1.5 rounded-full bg-[#22c55e]" />
            Automated HFT bot trading
          </li>
          <li className="flex items-center justify-center gap-2">
            <span className="size-1.5 rounded-full bg-[#22c55e]" />
            Real-time market execution
          </li>
          <li className="flex items-center justify-center gap-2">
            <span className="size-1.5 rounded-full bg-[#22c55e]" />
            Portfolio performance tracking
          </li>
          <li className="flex items-center justify-center gap-2">
            <span className="size-1.5 rounded-full bg-[#22c55e]" />
            Secure asset management
          </li>
        </ul>

        {/* CTA Button */}
        <button
          onClick={() => router.push("/auth")}
          className="rounded bg-[#22c55e] px-6 py-2.5 text-sm font-medium text-black transition-colors hover:bg-[#16a34a] sm:px-8 sm:py-3"
        >
          Get Started
        </button>

        {/* Privacy Policy Link */}
        <a
          href="/privacy"
          className="mt-4 block text-xs text-zinc-500 hover:text-zinc-400"
        >
          Privacy Policy
        </a>
      </div>
    </main>
  );
}
