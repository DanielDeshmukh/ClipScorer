import type { Metadata } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClipScorer",
  description: "AI-powered viral clip finder for any YouTube channel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
