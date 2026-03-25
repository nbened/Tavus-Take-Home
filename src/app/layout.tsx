import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Agent",
  description: "AI video agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-black min-h-screen">
        <nav className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-black tracking-tight">
            nic tavus take home
          </Link>
          <a
            href="https://nictavus.notion.site/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-neutral-500 hover:text-black transition-colors"
          >
            How I Built This
          </a>
        </nav>
        {children}
      </body>
    </html>
  );
}
