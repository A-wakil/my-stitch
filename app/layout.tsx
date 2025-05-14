'use client'

import { ReactNode } from 'react'
import { AuthProvider } from "./lib/AuthContext"
import "./globals.css"
import { Toaster } from 'react-hot-toast'
import { ProfileProvider } from "./context/ProfileContext"
import { AuthDialogWrapper } from "./components/AuthDialogWrapper"
import { PostHogProvider } from "./providers/PostHogProvider"

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
              {children}
              <Toaster />
              <AuthDialogWrapper />
            </ProfileProvider>
          </AuthProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}