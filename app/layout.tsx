import { ReactNode } from 'react'
import { Metadata } from 'next'
import { Providers } from "./providers/Providers"
import "./globals.css"

interface RootLayoutProps {
  children: ReactNode
}

export const metadata: Metadata = {
  title: "My Tailor Mint — Custom Tailoring, Made-to-Measure",
  description: "Bespoke outfits from vetted tailors. Precise measurements, easy ordering, and tracked delivery.",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}