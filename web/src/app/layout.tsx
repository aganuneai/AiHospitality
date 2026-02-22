import type { Metadata } from "next";
import { Inter, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "AiHospitality - Sistema de Gestão Hoteleira",
  description: "Sistema completo de reservas online e gestão hoteleira (PMS)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable} ${jakarta.variable} font-sans antialiased bg-background text-foreground transition-colors duration-300`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
