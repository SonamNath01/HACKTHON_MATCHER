import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-space-grotesk",
})

export const metadata: Metadata = {
  title: "HackMatch",
  description: "Find hackathon teammates with matching skills and goals.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-full flex flex-col antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  )
}