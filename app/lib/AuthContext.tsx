// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { User } from '@supabase/supabase-js'

interface AuthContextProps {
  user: User | null
  loading: boolean
  isAuthDialogOpen: boolean
  signInWithGoogle: () => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  closeAuthDialog: () => void
  openAuthDialog: () => void
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)

  useEffect(() => {
    // Fetch the initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error fetching session:', error)
      }
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthContext] Auth event: ${event}`)
      const newUser = session?.user ?? null
      setUser(newUser)
      setLoading(false)
      
      // Show auth dialog when user signs out
      if (event === 'SIGNED_OUT') {
        setIsAuthDialogOpen(true)
      }
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Effect to check if we need to show auth dialog based on path and auth state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname
      const isTailorPath = path.startsWith('/tailor')
      
      // If on tailor path and not authenticated, show auth dialog
      if (isTailorPath && !user && !loading) {
        console.log('[AuthContext] User not authenticated on tailor page, showing auth dialog')
        setIsAuthDialogOpen(true)
      }
    }
  }, [user, loading])

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) throw error
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    // Optionally handle data
  }

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    // Optionally handle data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false)
    
    // If on tailor page and not authenticated, redirect to home
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const isTailorPath = path.startsWith('/tailor');
      
      if (isTailorPath && !user) {
        console.log('[AuthContext] Redirecting unauthenticated user from tailor page to home')
        window.location.href = '/';
      }
    }
  }

  const openAuthDialog = () => {
    setIsAuthDialogOpen(true)
  }

  return (
    <AuthContext.Provider
      value={{ 
        user, 
        loading, 
        isAuthDialogOpen,
        signInWithGoogle, 
        signUpWithEmail, 
        signInWithEmail, 
        signOut,
        closeAuthDialog,
        openAuthDialog
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
