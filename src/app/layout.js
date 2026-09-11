import "./app.css";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/ui/sonner";
import { NavigationFeedback } from "@/components/navigation-feedback";

export const metadata = {
  title: "Nexora",
  description: "Nexora quantitative asset pool trading terminal.",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#090a0c",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Nexora" />
      </head>
      <body className="font-sans text-sm">
        {children}
        <NavigationFeedback />
        <Toaster />
      </body>
    </html>
  );
}
