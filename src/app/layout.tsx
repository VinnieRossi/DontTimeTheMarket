import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const quicksand = localFont({
  src: [
    { path: "./fonts/quicksand-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/quicksand-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/quicksand-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-quicksand",
  display: "swap",
});

const nunito = localFont({
  src: [
    { path: "./fonts/nunito-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/nunito-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/nunito-700.woff2", weight: "700", style: "normal" },
    { path: "./fonts/nunito-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Don't Time The Market",
  description:
    "Trade a real, randomized slice of market history and see if you can beat buy-and-hold.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${quicksand.variable} ${nunito.variable}`}>
      <body className="font-body min-h-screen">{children}</body>
    </html>
  );
}
