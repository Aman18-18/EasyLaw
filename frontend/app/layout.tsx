import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyLaw",
  description: "AI Legal Operating System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}