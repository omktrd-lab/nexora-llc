"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen w-full bg-[#090a0c]">
      {/* Hero Section */}
      <section className="flex min-h-screen flex-col items-center justify-center px-6 py-20 text-center">
        {/* Large Logo */}
        <div className="mb-8 flex size-32 items-center justify-center rounded bg-white text-4xl font-black text-black sm:size-40 sm:text-5xl">
          N
        </div>

        {/* Headline */}
        <h1 className="mb-4 text-4xl font-light tracking-tight text-white sm:text-5xl sm:font-semibold">
          Trade Smarter with HFT
        </h1>

        {/* Subheadline */}
        <p className="mb-8 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          High-frequency trading strategies working for you. Access quantitative asset pools and track your share of the NXR ecosystem.
        </p>

        {/* CTA Button */}
        <button
          onClick={() => router.push("/auth")}
          className="rounded bg-[#22c55e] px-8 py-3 text-sm font-medium text-black transition-colors hover:bg-[#16a34a] sm:px-10 sm:py-4 sm:text-base"
        >
          Get Started
        </button>
      </section>

      {/* What We Do */}
      <section className="px-6 py-16 sm:px-10">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          What We Do
        </h2>
        <p className="max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Automated high-frequency trading strategies execute on your behalf. Our bots analyze market data and execute trades with precision, maximizing opportunities in the crypto markets.
        </p>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16 sm:px-10">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          How It Works
        </h2>
        <p className="max-w-3xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Connect your account, deposit funds, and let our HFT strategies work. Track your portfolio performance in real-time with transparent reporting.
        </p>
      </section>

      {/* Features */}
      <section className="px-6 py-16 sm:px-10">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Features
        </h2>
        <ul className="space-y-4 text-base text-zinc-400 sm:text-lg">
          <li className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            Automated HFT bot trading
          </li>
          <li className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            Real-time market execution
          </li>
          <li className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            Portfolio performance tracking
          </li>
          <li className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-[#22c55e]" />
            Secure asset management
          </li>
        </ul>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 sm:px-10">
        <p className="mb-4 text-xl font-semibold text-white sm:text-2xl">
          Ready to start?
        </p>
        <p className="mb-6 text-base text-zinc-400 sm:text-lg">
          Sign in to access the trading terminal.
        </p>
        <button
          onClick={() => router.push("/auth")}
          className="rounded bg-[#22c55e] px-8 py-3 text-sm font-medium text-black transition-colors hover:bg-[#16a34a] sm:px-10 sm:py-4 sm:text-base"
        >
          Sign In
        </button>
      </section>

      {/* Privacy Policy Link */}
      <section className="px-6 py-8 sm:px-10">
        <a
          href="/privacy"
          className="text-sm text-zinc-500 hover:text-zinc-400"
        >
          Privacy Policy
        </a>
      </section>
    </main>
  );
}
