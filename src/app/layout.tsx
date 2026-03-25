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
      <body>
        <nav>
          <Link href="/">nic tavus take home</Link>
          <a href="https://nictavus.notion.site/" target="_blank" rel="noopener noreferrer">How I Built This</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
