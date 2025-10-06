import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yönder Rapor Sistemi",
  description: "Yönder okulları rapor ve analiz sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
