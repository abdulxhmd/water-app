import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthBootstrap from "../components/AuthBootstrap";
import AuthGate from "@/components/AuthGate";
import ThemeBootstrap from "@/components/ThemeBootstrap";
import PwaBootstrap from "@/components/PwaBootstrap";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Water App",
  description: "A shared hydration tracker for two — log daily water intake and compare weekly and monthly.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Water App",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7FB8FF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@400;500;600;700&display=swap"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthBootstrap />
        <ThemeBootstrap />
        <PwaBootstrap />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
