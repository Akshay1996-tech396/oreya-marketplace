import type { Metadata } from "next";
import { Comfortaa, Marcellus } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { CartDrawerProvider } from "@/context/CartDrawerContext";
import "./globals.css";

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const marcellus = Marcellus({
  variable: "--font-marcellus",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Oreya Marketplace",
  description: "Shopping, services and appointment booking marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${comfortaa.variable} ${marcellus.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <CartDrawerProvider>
          <AppShell>{children}</AppShell>
        </CartDrawerProvider>
      </body>
    </html>
  );
}