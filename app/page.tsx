'use client'


import "./page.css"
import { useState, useCallback, useEffect, useRef } from 'react'
import { Header } from "./customer/ui/Header/Header"
import { GalleryImage } from "./customer/ui/GalleryImage/GalleryImage"
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useGender } from "./context/GenderContext"
import { AuthDialog } from "./components/AuthDialog/AuthDialog";
import { supabase } from "./lib/supabaseClient";
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface Design {
  id: string
  title: string
  description: string
  images: string[]
  fabrics: Array<{
    name: string
    image: string | File | null
    price: number
    colors: Array<{ name: string; image: string | File | null }>
  }>
  gender?: string | null
}

export default function Home() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [page, setPage] = useState(1)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingDesigns, setIsLoadingDesigns] = useState(true)
  const [navigatingDesignId, setNavigatingDesignId] = useState<string | null>(null)
  const designsCacheRef = useRef<Record<string, Design[]>>({})
  const router = useRouter()

  // Use gender context instead of local state
  const { gender, setGender } = useGender()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchDesigns = async () => {
    try {
      setIsLoadingDesigns(true)
      const cacheKey = gender || 'all'
      const cached = designsCacheRef.current[cacheKey]
      if (cached) {
        setDesigns(cached)
        setHasMore(cached.length >= 10)
        setIsLoadingDesigns(false)
        return
      }
      // Build the URL with query parameters for filters
      let apiUrl = '/api/designs?';
      
      if (gender) {
        apiUrl += `gender=${gender}&`;
      }
      
      // Remove trailing & if present
      apiUrl = apiUrl.endsWith('&') ? apiUrl.slice(0, -1) : apiUrl;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      designsCacheRef.current[cacheKey] = data;
      setDesigns(data);
      setHasMore(data.length >= 10);
    } catch (error) {
      console.error('Error fetching designs:', error);
    } finally {
      setIsLoadingDesigns(false)
    }
  }

  useEffect(() => {
    setIsLoadingDesigns(true)
    fetchDesigns()
  }, [gender]) // Re-fetch when filters change

  // No need for client-side filtering since we're filtering in the database query
  const filteredDesigns = designs;
  
  const handleDesignClick = (design: Design) => {
    if (!user) {
      setIsAuthDialogOpen(true)
      return;
    }
    
    if (navigatingDesignId) return
    setNavigatingDesignId(design.id)
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
        
        {/* Show Coming Soon for Female designs */}
        {gender === 'female' ? (
          <div className="coming-soon-container" data-nosnippet>
            <div className="coming-soon-content">
              <div className="coming-soon-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                  <path d="M19 15L20.5 19L24 20L20.5 21L19 25L17.5 21L14 20L17.5 19L19 15Z" fill="currentColor"/>
                  <path d="M5 15L6.5 19L10 20L6.5 21L5 25L3.5 21L0 20L3.5 19L5 15Z" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="coming-soon-title">Women's Collection</h2>
              <p className="coming-soon-subtitle">Coming Soon</p>
              <p className="coming-soon-description">
                We're crafting an exquisite collection of traditional women's wear. 
                Beautiful designs with perfect fits are on their way!
              </p>
              <div className="coming-soon-features">
                <div className="feature-item">
                  <span className="feature-icon">👗</span>
                  <span>Elegant Dresses</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">✨</span>
                  <span>Premium Fabrics</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📏</span>
                  <span>Perfect Measurements</span>
                </div>
              </div>
              <button 
                className="notify-me-btn"
                onClick={() => {
                  // You can add email subscription logic here later
                  alert('Thank you for your interest! We\'ll notify you when our women\'s collection launches.');
                }}
              >
                Notify Me When Available
              </button>
            </div>
          </div>
        ) : isLoadingDesigns ? (
          <p className="loading-message">Loading designs...</p>
        ) : filteredDesigns.length === 0 ? (
          <div className="no-results">
            <p>No designs match your selected filters.</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredDesigns.map((design, index) => (
              <GalleryImage
                key={`${design.title}-${index}`}
                images={design.images}
                alt={design.title}
                onClick={() => handleDesignClick(design)}
                isNavigating={navigatingDesignId === design.id}
              />
            ))}
          </div>
        )}
        
        {isFetching && hasMore && <p className="loading-message">Loading more...</p>}
      </main>
      <AuthDialog
        isOpen={isAuthDialogOpen}
        onClose={closeAuthDialog}
      />
    </div>
  );
}
