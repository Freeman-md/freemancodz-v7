import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { AssistantButton } from "@/components/shared/AssistantButton";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { ThemeProvider } from "@/providers/ThemeProvider";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Freemancodz V7",
  description: "Freemancodz V7 project foundation.",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${manrope.variable}`}
    >
      <body>
        <ThemeProvider>
          <SiteHeader />
          {children}
          <AssistantButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
