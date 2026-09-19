import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Freshman Flu | MIT Campus Lab",
  description:
    "Explore synthetic campus outbreaks across MIT’s public campus geography.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
