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
    icon: [{ url: "/favicon.ico", sizes: "any" },
    ],
  },
  openGraph: {
    type: "website",
    url: "https://mytailormint.com",
    title: "My Tailor Mint — Custom Tailoring, Made-to-Measure",
    description: "Bespoke outfits from vetted tailors. Precise measurements, easy ordering, and tracked delivery.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "My Tailor Mint preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "My Tailor Mint — Custom Tailoring, Made-to-Measure",
    description: "Bespoke outfits from vetted tailors.",
    images: ["/og.jpg"],
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