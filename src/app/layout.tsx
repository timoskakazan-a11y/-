import type { Metadata, Viewport } from "next";
import { Caveat, Dela_Gothic_One, Golos_Text, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";

const display = Dela_Gothic_One({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--f-display", display: "swap" });
const sans = Golos_Text({ subsets: ["latin", "cyrillic"], variable: "--f-sans", display: "swap" });
const mono = IBM_Plex_Mono({ weight: ["400", "500", "600"], subsets: ["latin", "cyrillic"], variable: "--f-mono", display: "swap" });
const hand = Caveat({ subsets: ["latin", "cyrillic"], variable: "--f-hand", display: "swap" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s — ${site.shortName}` },
  description: site.description,
  openGraph: { title: site.name, description: site.description, locale: "ru_RU", type: "website" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#f3efe6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable} ${mono.variable} ${hand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
