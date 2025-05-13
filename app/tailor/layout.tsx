'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from "./components/dashboard/sidebar"
import { Header } from "./components/dashboard/header"
import { ProfileProvider } from "../context/ProfileContext"
import { supabase } from "../lib/supabaseClient"
import { AuthProvider } from "../lib/AuthContext"
import { AuthDialogWrapper } from "../components/AuthDialogWrapper"
import { useAuth } from "../lib/AuthContext"

function DashboardContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <>
      <Sidebar />
      <div style={{ marginLeft: '250px' }}>
        <Header toggleLogoutDialog={handleLogout} />
        <main className="p-4 bg-gray-100">
          {children}
        </main>
      </div>
      <AuthDialogWrapper />
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <DashboardContent>
          {children}
        </DashboardContent>
      </ProfileProvider>
    </AuthProvider>
  )
}

