'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from "../lib/supabaseClient"

interface ProfileContextType {
  hasProfile: boolean
  isLoading: boolean
  refreshProfile: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
  hasProfile: false,
  isLoading: true,
  refreshProfile: async () => {},
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [hasProfile, setHasProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setHasProfile(false)
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('tailor_details')
        .select('id')
        .eq('id', user.id)
        .single()
      
      setHasProfile(!!data)
    } catch (error) {
      console.error("Error checking profile:", error)
      setHasProfile(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Immediate initial check
    checkProfile()

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        checkProfile()
      }
    })

    // Add router event listeners for client-side navigation
    const handleRouteChange = () => {
      checkProfile()
    }

    // Check if window is defined (client-side)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', handleRouteChange)
    }

    return () => {
      subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handleRouteChange)
      }
    }
  }, [])

  return (
    <ProfileContext.Provider value={{ hasProfile, isLoading, refreshProfile: checkProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext) 