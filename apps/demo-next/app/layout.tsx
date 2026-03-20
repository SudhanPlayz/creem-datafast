import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";

import "./globals.css";

const displayFont = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "CREEM × DataFast Demo",
  description: "End-to-end demo for @itzsudhan/creem-datafast.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
