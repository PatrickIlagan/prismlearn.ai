import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { cn } from "@/lib/utils";
import { WakeupBanner } from "@/components/system/WakeupBanner";
import { DemoBadge } from "@/components/system/DemoBadge";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "PrismLearning.AI",
  description: "Your AI-powered study workspace — upload, learn, and master anything with Lumi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/">
      <html lang="en" className={cn("font-sans", inter.variable)}>
        <body className="antialiased">
          <WakeupBanner />
          <DemoBadge />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
