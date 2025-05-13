'use client'

import { AuthProvider } from "./lib/AuthContext";
import "./globals.css";
import { Toaster } from 'react-hot-toast'
import { ProfileProvider } from "./context/ProfileContext";
import { AuthDialogWrapper } from "./components/AuthDialogWrapper";

import { ReactNode } from 'react'

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
        <AuthProvider>
          <ProfileProvider>
            {children}
            <Toaster />
            <AuthDialogWrapper />
          </ProfileProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
