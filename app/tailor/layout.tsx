'use client'

import { useState, useEffect } from 'react'
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
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <>
      {(!isMobile || sidebarOpen) && (
        <div
          style={isMobile ? {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100vh',
            backgroundColor: 'white',
            zIndex: 1000,
            overflowY: 'auto'
          } : {}}
        >
          <Sidebar
            isMobile={isMobile}
            toggleSidebar={() => setSidebarOpen(open => !open)}
          />
        </div>
      )}
      <div style={{ marginLeft: isMobile ? 0 : '250px' }}>
        <Header 
          toggleLogoutDialog={handleLogout} 
          toggleSidebar={() => setSidebarOpen(open => !open)}
          isMobile={isMobile}
        />
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

