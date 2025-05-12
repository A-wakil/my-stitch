'use client'


import "./page.css"
import { useState, useCallback, useEffect } from 'react'
import { Header } from "./customer/ui/Header/Header"
import { GalleryImage } from "./customer/ui/GalleryImage/GalleryImage"
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { AuthDialog } from "./AuthDialog/AuthDialog";
import { supabase } from "./lib/supabaseClient";
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

type Design = {
  id?: string
  title: string
  description: string
  images: string[]
  fabrics: Array<{
    name: string
    image: string | File | null
    price: number
    colors: Array<{ name: string; image: string | File | null }>
  }>
}

export default function Home() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [page, setPage] = useState(1)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchDesigns = async () => {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .range(0, 9)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDesigns(data);
      setHasMore(data.length === 10);
    } catch (error) {
      console.error('Error fetching designs:', error);
    }
  }

  useEffect(() => {
    fetchDesigns()
  }, [])

  const handleDesignClick = (design: Design) => {
    if (!user) {
      setIsAuthDialogOpen(true)
      return;
    }
    
    // Navigate to design detail page
    router.push(`customer/designs/${design.id}`)
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


  const loadMoreDesigns = useCallback(() => {
    if (!hasMore) return;
    
    setTimeout(() => {
      setDesigns(prevDesigns => {
        if (prevDesigns.length >= 20) {
          setHasMore(false);
          return prevDesigns;
        }
        return [...prevDesigns];
      });
      setPage(prevPage => prevPage + 1);
      setIsFetching(false);
    }, 1000);
  }, [hasMore]);

  const { isFetching, setIsFetching } = useInfiniteScroll(loadMoreDesigns, hasMore);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="main-content container">
        <div className="gallery-grid">
          {designs.map((design, index) => (
            <GalleryImage
              key={`${design.title}-${index}`}
              images={design.images}
              alt={design.title}
              onClick={() => handleDesignClick(design)}
            />
          ))}
        </div>
        {isFetching && hasMore && <p className="loading-message">Loading more...</p>}
      </main>
      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={closeAuthDialog}
      />
      
    </div>
  );
}
