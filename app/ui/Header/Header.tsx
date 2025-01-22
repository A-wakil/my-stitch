'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CustomButton } from '../custom-components/custom-components'
import './Header.css'
import { IoMenu, IoSearch, IoHeartOutline, IoPerson, IoBag, IoCutSharp } from "react-icons/io5";
import { Sidebar } from '../sidebar/Sidebar'
import { AuthDialog } from '../../AuthDialog/AuthDialog'
import { supabase } from '../../lib/supabaseClient'

interface HeaderProps {
  waitlistLink: string
}

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Header({ waitlistLink }: HeaderProps) {
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [])

  const controlNavbar = () => {
    if (typeof window !== 'undefined') {
      if (window.scrollY > lastScrollY) {
        setVisible(false)
      } else {
        setVisible(true)
      }
      setLastScrollY(window.scrollY)
    }
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const toggleAuthDialog = () => {
    setIsAuthDialogOpen(!isAuthDialogOpen)
  }

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false)
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

  const handleSignUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
      })
      
      if (error) {
        console.error('Sign up error:', error.message)
        // Handle error (e.g., show error message to user)
        return
      }

      if (data.user) {
        // Handle successful sign up
        console.log('Signed up successfully:', data.user)
        // Note: User might need to verify their email depending on your Supabase settings
        closeAuthDialog()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      // Handle unexpected errors
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', controlNavbar)
      return () => {
        window.removeEventListener('scroll', controlNavbar)
      }
    }
  }, [lastScrollY])

  return (
    <>
      <header className={`header ${visible ? '' : 'header-hidden'}`}>
        <div className="header-container">
          <div className='header-content'>
            <div className='left-sub' onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
              <IoMenu />
              Menu
            </div>
            <div className='left-sub' style={{ cursor: 'pointer' }}>
              <IoSearch />
              Search
            </div>

            <Link href="/tailor" className='left-sub' style={{ cursor: 'pointer' }}>
              Tailor
              <IoCutSharp />
            </Link>

          </div>
          <div className="header-content">
            <div className="header-title-wrapper">
              <div className="header-line"></div>
              <h1 className="header-title">Tailored Elegance</h1>
              <div className="header-line"></div>
            </div>
            <nav className="header-nav">

            </nav>
          </div>
          <div className='header-content'>
            <div>Contact Us</div>
            <div className='right-icons'>
              <IoHeartOutline />
              <div 
                className='' 
                onClick={user ? undefined : toggleAuthDialog}
                style={{ 
                  cursor: user ? 'default' : 'pointer', 
                  position: 'relative',
                  opacity: user ? 0.5 : 1 
                }}
                title={user ? `Welcome ${user.displayName}` : undefined}
              >
                <IoPerson />
              </div>
              <IoBag />
            </div>
          </div>
        </div>
        <AuthDialog 
          onSubmit={handleSubmit}
          onSignUp={handleSignUp}
          onGoogleSignIn={handleGoogleSignIn} 
          isOpen={isAuthDialogOpen} 
          onClose={closeAuthDialog} 
        />
      </header>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      

    </>
  )
}

