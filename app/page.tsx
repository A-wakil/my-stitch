'use client'


import "./page.css"
import { useState, useCallback, useEffect } from 'react'
import { Header } from "./ui/Header/Header";
import { GalleryImage } from "./ui/GalleryImage/GalleryImage";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { AuthDialog } from "./AuthDialog/AuthDialog";
import { supabase } from "./lib/supabaseClient";
import { User } from '@supabase/supabase-js'


const sampleAttires = [
  { src: '/syari_1.jpg', alt: 'Tailored Pants 1' },
  { src: '/syari_2.jpg', alt: 'Tailored Skirt 1' },
  { src: '/syari_3.jpg', alt: 'Tailored Suit 1' },
  { src: '/skaftan_1.jpg', alt: 'Tailored Dress 1' },
  { src: '/skaftan_2.jpg', alt: 'Tailored Shirt 1' },
  { src: '/skaftan_3.jpg', alt: 'Tailored Coat 1' },
  { src: '/image_2.webp', alt: 'Tailored Dress 1' },
  { src: '/syari_1.jpg', alt: 'Tailored Pants 1' },
  { src: '/syari_2.jpg', alt: 'Tailored Skirt 1' },
  { src: '/syari_3.jpg', alt: 'Tailored Suit 1' },
  { src: '/skaftan_1.jpg', alt: 'Tailored Dress 1' },
  { src: '/skaftan_2.jpg', alt: 'Tailored Shirt 1' },
  { src: '/skaftan_3.jpg', alt: 'Tailored Coat 1' },
  { src: '/syari_1.jpg', alt: 'Tailored Pants 1' },
  { src: '/syari_2.jpg', alt: 'Tailored Skirt 1' },
  { src: '/syari_3.jpg', alt: 'Tailored Suit 1' },
  { src: '/skaftan_1.jpg', alt: 'Tailored Dress 1' },
  { src: '/skaftan_2.jpg', alt: 'Tailored Shirt 1' },
  { src: '/skaftan_3.jpg', alt: 'Tailored Coat 1' },
  { src: '/image_2.webp', alt: 'Tailored Dress 1' },
  { src: '/syari_1.jpg', alt: 'Tailored Pants 1' },
  { src: '/syari_2.jpg', alt: 'Tailored Skirt 1' },
  { src: '/syari_3.jpg', alt: 'Tailored Suit 1' },
  { src: '/skaftan_1.jpg', alt: 'Tailored Dress 1' },
  { src: '/skaftan_2.jpg', alt: 'Tailored Shirt 1' },
  { src: '/skaftan_3.jpg', alt: 'Tailored Coat 1' },
  { src: '/image_1.webp', alt: 'Tailored Skirt 1' },
]


export default function Home() {
  const [attires, setAttires] = useState(sampleAttires)
  const [page, setPage] = useState(1)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAttireClick = () => {
    if (!user) {
      setIsAuthDialogOpen(true)
    }
    // Handle logged in user click here
  }

  const closeAuthDialog = () => {
    setIsAuthDialogOpen(false)
  }

  const handleSubmit = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      closeAuthDialog()
    } catch (error) {
      console.error('Error signing in:', error)
    }
  }

  const handleSignUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      closeAuthDialog()
    } catch (error) {
      console.error('Error signing up:', error)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google'
      })
      if (error) throw error
      closeAuthDialog()
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  const loadMoreAttires = useCallback(() => {
    // Simulate loading more images
    setTimeout(() => {
      setAttires(prevAttires => [...prevAttires, ...sampleAttires])
      setPage(prevPage => prevPage + 1)
      setIsFetching(false)
    }, 1000)
  }, [])

  const { isFetching, setIsFetching } = useInfiniteScroll(loadMoreAttires)

  return (
    <div className="min-h-screen">
      <Header />
      <main className="main-content container">
        <div className="gallery-grid">
          {attires.map((attire, index) => (
            <GalleryImage
              key={`${attire.alt}-${index}`}
              src={attire.src}
              alt={attire.alt}
              onClick={handleAttireClick}
            />
          ))}
        </div>
        {isFetching && <p className="loading-message">Loading more...</p>}
      </main>
      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={closeAuthDialog}
        onSubmit={handleSubmit}
        onSignUp={handleSignUp}
        onGoogleSignIn={handleGoogleSignIn}
      />
    </div>
  );
}
