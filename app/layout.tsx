import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

// Load Inter font from Google Fonts
const inter = Inter({ 
  subsets: ["latin"],
});

// FIXED: Changed 'meta Metadata' to 'metadata'
export const metadata: Metadata = {
  title: "JIAP-ATC Accounting System",
  description: "Financial management system for JIAP and ATC projects designed by SLM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-slate-50 text-slate-900`}>
        {/* Main Content Area */}
        {children}
        
        {/* Toast Notifications Container */}
        <Toaster />
      </body>
    </html>
  );
}