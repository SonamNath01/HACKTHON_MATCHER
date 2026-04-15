import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HackMatch",
  description: "Find hackathon teammates with matching skills and goals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      style={
        {
          "--font-geist-sans":
            '"Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif',
          "--font-geist-mono":
            '"Cascadia Code", "Fira Code", Consolas, monospace',
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
