'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import './Header.css'
import { IoMenu, IoPerson, IoBagHandle } from "react-icons/io5";
import { Sidebar } from '../sidebar/Sidebar'
import { AuthDialog } from '../../../components/AuthDialog/AuthDialog'
import { supabase } from '../../../lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { LogOut } from "lucide-react"
import { Button } from "../../../tailor/components/ui/button"
import { Card } from "../../../tailor/components/ui/card"
import { CurrencyToggle } from "../../../components/ui/CurrencyToggle"
import { GenderToggle } from "../../../components/ui/GenderToggle"
import { useGender } from "../../../context/GenderContext"
import { useBag } from "../../../context/BagContext"


export function Header() {
  const router = useRouter()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [profileName, setProfileName] = useState<{ firstName: string; lastName: string }>({
    firstName: '',
    lastName: '',
  })
  const [authDefaultRole, setAuthDefaultRole] = useState<'customer' | 'tailor' | 'both'>('customer')
  const [authRedirectTo, setAuthRedirectTo] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Bag context
  const { items } = useBag()
  
  // Gender context
  const { gender, setGender } = useGender()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadProfileName = async () => {
      if (!user?.id) {
        if (isMounted) {
          setProfileName({ firstName: '', lastName: '' })
        }
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('firstname, lastname')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading profile name:', error)
        return
      }

      if (isMounted) {
        setProfileName({
          firstName: data?.firstname || '',
          lastName: data?.lastname || '',
        })
      }
    }

    loadProfileName()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleAuthDialog = () => {
    setAuthDefaultRole('customer')
    setAuthRedirectTo(null)
    setIsAuthDialogOpen(!isAuthDialogOpen)
  }

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false)
    setAuthRedirectTo(null)
  }

  const openTailorAuth = () => {
    setAuthDefaultRole('tailor')
    setAuthRedirectTo('/tailor')
    setIsAuthDialogOpen(true)
  }

  const handleSubmit = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      })

      if (error) {
        console.error('Authentication error:', error.message)
        // Handle error (e.g., show error message to user)
        return
      }

      if (data.user) {
        // Handle successful sign in
        console.log('Signed in successfully:', data.user)
        closeAuthDialog()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      // Handle unexpected errors
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      })

      if (error) {
        console.error('Google sign in error:', error.message)
        return
      }

      // Handle successful sign in
      console.log('Google sign in successful')
      closeAuthDialog()
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      console.log('Starting sign up with data:', { email, firstName, lastName })

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Sign up error:', error.message)
        return
      }

      if (data.user) {
        console.log('Signed up successfully:', data.user)
        closeAuthDialog()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setShowLogoutConfirm(false)
    setShowUserMenu(false)
  }

  const toggleUserMenu = () => {
    if (user) {
      setShowUserMenu(!showUserMenu)
    } else {
      toggleAuthDialog()
    }
  }

  const displayName = (() => {
    const profileFullName = `${profileName.firstName} ${profileName.lastName}`.trim()
    if (profileFullName) return profileFullName

    const metadataFullName = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim()
    if (metadataFullName) return metadataFullName

    if (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) {
      return user.user_metadata.name.trim()
    }

    return user?.email?.split('@')[0] || 'User'
  })()

  return (
    <>
      <header className="header">
        <div className="header-container">
          <div className='header-content left'>
            <div className='left-sub menu-button' onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
              <IoMenu />
              <span className='menu-text'>Menu</span>
            </div>
            <button 
              className='tailor-button' 
              onClick={!user ? openTailorAuth : () => router.push('/tailor')}
              title="Go to Tailor Dashboard"
            >
              <span className='tailor-icon'>✂️</span>
              <span className='tailor-text'>Tailor Dashboard</span>
            </button>
          </div>
          <div className="header-content center">
              <h1 className="header-title">Tailor Mint</h1>
          </div>
          <div className='header-content right'>
            <div className='right-icons'>
              <GenderToggle currentGender={gender} onGenderChange={setGender} />
              <div
                className="bag-icon-wrapper"
                onClick={() => router.push('/customer/bag')}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <IoBagHandle size={20} />
                {items.length > 0 && (
                  <span className="bag-count-badge">
                    {items.length}
                  </span>
                )}
              </div>
              <div className='user-menu-container' ref={userMenuRef}>
                <div
                  className='user-icon-wrapper'
                  onClick={toggleUserMenu}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <IoPerson size={20} />
                  {user && <span className="user-active-dot"></span>}
                </div>
                {showUserMenu && (
                  <div className="user-dropdown">
                    {user ? (
                      <>
                        <div className="user-info">
                          <p className="user-name">{displayName}</p>
                          <p className="user-email">{user.email}</p>
                        </div>
                        <div className="user-menu-divider"></div>
                      </>
                    ) : null}
                    <div className="user-menu-section">
                      <label className="user-menu-label">Currency</label>
                      <CurrencyToggle />
                    </div>
                    {user ? (
                      <>
                        <div className="user-menu-divider"></div>
                        <button className="user-menu-item logout-item" onClick={() => {
                          setShowUserMenu(false)
                          setShowLogoutConfirm(true)
                        }}>
                          <LogOut size={16} />
                          <span>Logout</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <AuthDialog
          isOpen={isAuthDialogOpen}
          onClose={closeAuthDialog}
          defaultRole={authDefaultRole}
          redirectTo={authRedirectTo}
        />
      </header>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} user={user} toggleAuthDialog={toggleAuthDialog} />

      {showLogoutConfirm && (
        <div className="logout-overlay">
          <Card className="logout-dialog">
            <h3>Logout Confirmation</h3>
            <p>Are you sure you want to log out?</p>
            <div className="logout-buttons">
              <Button
                variant="secondary"
                className="cancel-lgt-button"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="lgt-button"
                onClick={handleSignOut}
              >
                Logout
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

