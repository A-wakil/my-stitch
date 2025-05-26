'use client'

import { ReactNode } from 'react'
import { AuthProvider } from "./lib/AuthContext"
import "./globals.css"
import { Toaster } from 'react-hot-toast'
import { ProfileProvider } from "./context/ProfileContext"
import { AuthDialogWrapper } from "./components/AuthDialogWrapper"
import { PostHogProvider } from "./providers/PostHogProvider"
import { CurrencyProvider } from "./context/CurrencyContext"
import { BagProvider } from "./context/BagContext"

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <PostHogProvider>
          <AuthProvider>
            <ProfileProvider>
              <CurrencyProvider>
                <BagProvider>
                  {children}
                  <Toaster />
                  <AuthDialogWrapper />
                </BagProvider>
              </CurrencyProvider>
            </ProfileProvider>
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}