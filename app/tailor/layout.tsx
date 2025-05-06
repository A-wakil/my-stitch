'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from "./components/dashboard/sidebar"
import { Header } from "./components/dashboard/header"
import { ProfileProvider } from "../context/ProfileContext"
import { supabase } from "../lib/supabaseClient"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <ProfileProvider>
      <Sidebar />
      <div style={{ marginLeft: '250px' }}>
        <Header toggleLogoutDialog={handleLogout} />
        <main className="p-4 bg-gray-100">
          {children}
        </main>
      </div>
    </ProfileProvider>
  )
}

