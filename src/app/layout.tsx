import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "売上ダッシュボード",
  description: "STORES 売上可視化",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-200 text-gray-900">{children}</body>
    </html>
  );
}
