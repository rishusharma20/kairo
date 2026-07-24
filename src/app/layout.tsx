import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { RefreshLogout } from "@/components/auth/refresh-logout";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAIRO — Your Invisible Intelligence",
  description:
    "Intelligence that never needed another tab. KAIRO is the invisible layer that thinks beside you. Solve coding problems, research topics, analyze websites, and more.",
  keywords: ["AI", "intelligence", "productivity", "coding", "research", "KAIRO"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider>
          <RefreshLogout />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
