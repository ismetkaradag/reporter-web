import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SCHOOL_NAME + " Raporlama",
  description: process.env.NEXT_PUBLIC_SCHOOL_NAME + " için gelişmiş raporlama uygulaması.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
