import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipScorer",
  description: "AI-powered viral clip finder for any YouTube channel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
