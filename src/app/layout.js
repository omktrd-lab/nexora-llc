import "./app.css";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Appwrite + Next.js",
  description: "Appwrite starter for Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <link rel="icon" href="/appwrite.svg" />
        <link rel="icon" type="image/svg+xml" href="/appwrite.svg" />
      </head>
      <body className="font-sans text-sm">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
