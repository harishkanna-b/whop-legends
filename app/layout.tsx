import { WhopApp } from "@whop/react/components";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import WhopDevWrapper from "@/lib/whop-dev-wrapper";
import { UserProvider } from "@/app/contexts/UserContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Whop Legends - Gamified Referral System",
  description:
    "A gamified referral and affiliate management system for Whop creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WhopDevWrapper>
          <UserProvider>
            <WhopApp>{children}</WhopApp>
          </UserProvider>
        </WhopDevWrapper>
      </body>
    </html>
  );
}
