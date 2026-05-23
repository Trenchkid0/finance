import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

/**
 * Geist + Geist Mono — AGENTS.md §4.3.
 * `--font-geist-sans` / `--font-geist-mono` are wired into
 * `tailwind.config.ts` so `font-sans` and `font-mono` resolve correctly.
 */
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Maybe Finance",
  description: "Personal finance dashboard — clarity over cleverness.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
    >
      <body className="bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster
          theme="dark"
          closeButton
          position="top-right"
          toastOptions={{
            style: {
              background: "#161B22",
              border: "1px solid #30363D",
              color: "#F0F6FC",
            },
          }}
        />
      </body>
    </html>
  );
}
