'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CustomButton } from '../custom-components/custom-components'
import './Header.css'
import { IoMenu, IoSearch, IoHeartOutline, IoPerson, IoBag, IoCutSharp } from "react-icons/io5";
import { Sidebar } from '../sidebar/Sidebar'
import { AuthDialog } from '../../AuthDialog/AuthDialog'
import { supabase } from '../../lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { LogOut } from "lucide-react"
import { Button } from "../../tailor/components/ui/button"
import { SecDialog } from '../../AuthDialog/SecDialog'


interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Header() {
  const router = useRouter()
  const [visible, setVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isSecDialogOpen, setIsSecDialogOpen] = useState(false)

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

  const tailorFirewall = () => {
    if (user) {
      setIsSecDialogOpen(true)
    } else {
      toggleAuthDialog()
    }
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
  }

  const closeSecDialog = () => {
    setIsSecDialogOpen(false)
  }

  const handleSecurityQuestions = async (
    question1: string,
    answer1: string,
    question2: string,
    answer2: string
  ) => {
    try {
      if (!user) {
        console.error('No user logged in')
        return
      }

      // Insert the security questions and answers into Supabase
      const { data, error } = await supabase
        .from('secquestions')
        .upsert([
          {
            id: user.id,
            question1: question1,
            answer1: answer1,
            question2: question2,
            answer2: answer2,
          }
        ], {
          onConflict: 'id'  // This will update if the user already has security questions
        })

      if (error) {
        console.error('Error saving security questions:', error)
        // You might want to show an error message to the user here
        return
      }

      console.log('Security questions saved successfully')
      closeSecDialog()
    } catch (err) {
      console.error('Error handling security questions:', err)
    }
  }

  const handleSecurityVerification = async (answer1: string, answer2: string) => {
    try {
      if (!user) {
        console.error('No user logged in')
        return
      }

      // Fetch the stored security questions and answers
      const { data, error } = await supabase
        .from('secquestions')
        .select('answer1, answer2')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching security answers:', error)
        return
      }

      if (!data) {
        console.error('No security questions found for this user')
        return
      }

      // Compare the answers
      if (data.answer1 === answer1 && data.answer2 === answer2) {
        console.log('Security answers verified successfully')
        closeSecDialog()
        router.push('/tailor')
      } else {
        console.error('Incorrect security answers')
        // You might want to show an error message to the user here
      }
    } catch (err) {
      console.error('Error verifying security answers:', err)
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

            <div className='left-sub' onClick={tailorFirewall} style={{ cursor: 'pointer' }}>
              Become a Tailor
              <IoCutSharp />
            </div>

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
              <div
                className=''
                onClick={user ? undefined : toggleAuthDialog}
                style={{
                  cursor: user ? 'default' : 'pointer',
                  position: 'relative',
                  opacity: user ? 0.5 : 1
                }}
                title={user ? `Welcome ${user.user_metadata.first_name} ${user.user_metadata.last_name}` : undefined}
              >
                <IoPerson />
              </div>
              <IoBag />
              {user && <Button onClick={handleSignOut} variant="ghost" size="icon">
                <LogOut size={15} />
              </Button>}
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
      <SecDialog
        isOpen={isSecDialogOpen}
        onClose={closeSecDialog}
        onSubmit={handleSecurityQuestions}
        onVerify={handleSecurityVerification}
      />
    </>
  )
}

