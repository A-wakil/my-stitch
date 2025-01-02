'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CustomButton } from '../custom-components/custom-components'
import './Header.css'
import { IoMenu, IoSearch, IoHeartOutline, IoPerson, IoBag, IoCutSharp } from "react-icons/io5";
import { Sidebar } from '../sidebar/Sidebar'
import { AuthDialog } from '../../AuthDialog/AuthDialog'

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
    setIsAuthDialogOpen(!isSidebarOpen)
  }

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false)
  }

  const handleSubmit = async (email: string, password: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Form submit:', { email, password })
  }

  const handleGoogleSignIn = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('Google sign in')
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
              <div className='' onClick={toggleAuthDialog} style={{ cursor: 'pointer' }}>
                <IoPerson />
              </div>
              <IoBag />
            </div>
          </div>
        </div>
        <AuthDialog onSubmit={handleSubmit}
      onGoogleSignIn={handleGoogleSignIn} isOpen={isAuthDialogOpen} onClose={closeAuthDialog} />
      </header>
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      

    </>
  )
}

