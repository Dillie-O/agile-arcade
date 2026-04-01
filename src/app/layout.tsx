import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agile Arcade",
  description: "Where story points get extra lives",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
