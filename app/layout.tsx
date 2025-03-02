'use client'

import { AuthProvider } from "./lib/AuthContext";
import "./globals.css";
import { Toaster } from 'react-hot-toast'


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
    <AuthProvider>
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
    </AuthProvider>
  );
}
