import type { Metadata } from "next";
// @ts-expect-error -- Next.js supports global CSS side-effect imports in app/layout.
import "./globals.css";

export const metadata: Metadata = {
  title: "BetterUptime",
  description: "Monitor your website uptime",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}