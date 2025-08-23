'use client'


import "./page.css"
import { useState, useCallback, useEffect } from 'react'
import { Header } from "./customer/ui/Header/Header"
import { GalleryImage } from "./customer/ui/GalleryImage/GalleryImage"
import { DesignFilters } from "./customer/ui/DesignFilters"
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { AuthDialog } from "./AuthDialog/AuthDialog";
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
  const [filters, setFilters] = useState<{ gender: string | null }>({
    gender: null
  })
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchDesigns = async () => {
    try {
      // Build the URL with query parameters for filters
      let apiUrl = '/api/designs?';
      
      if (filters.gender) {
        apiUrl += `gender=${filters.gender}&`;
      }
      
      // Remove trailing & if present
      apiUrl = apiUrl.endsWith('&') ? apiUrl.slice(0, -1) : apiUrl;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDesigns(data);
      setHasMore(data.length >= 10);
    } catch (error) {
      console.error('Error fetching designs:', error);
    }
  }

  useEffect(() => {
    fetchDesigns()
  }, [filters]) // Re-fetch when filters change

  // No need for client-side filtering since we're filtering in the database query
  const filteredDesigns = designs;
  
  const handleFilterChange = (newFilters: { gender: string | null }) => {
    setFilters(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({ gender: null });
  };

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
        <DesignFilters filters={filters} onFilterChange={handleFilterChange} />
        
        {filteredDesigns.length === 0 ? (
          <div className="no-results">
            <p>No designs match your selected filters.</p>
            <button 
              className="clear-filters-btn"
              onClick={clearAllFilters}
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="gallery-grid">
            {filteredDesigns.map((design, index) => (
              <GalleryImage
                key={`${design.title}-${index}`}
                images={design.images}
                alt={design.title}
                onClick={() => handleDesignClick(design)}
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
