'use client'
import React, { useState, useEffect } from 'react'
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { Card } from "../tailor/components/ui/card"
import { Button } from "../tailor/components/ui/button"
import styles from './page.module.css'
import { supabase } from "../lib/supabaseClient"
import { User } from '@supabase/supabase-js'
import { AuthDialog } from "../AuthDialog/AuthDialog"
import { IoArrowBack } from "react-icons/io5";
import { TailorProfileForm } from "./components/dashboard/tailor-profile-form"
import { useProfile } from "../context/ProfileContext"
import { Spinner } from "../tailor/components/ui/spinner"

// Add these interfaces at the top of the file, after the imports
interface Design {
  id: string;
  title: string;
  created_at: string;
  // price: number;
}

interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
}

interface DashboardStats {
  totalDesigns: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  recentDesigns: Design[];
  recentOrders: Order[];
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [tailorProfile, setTailorProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { hasProfile, refreshProfile } = useProfile()
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalDesigns: 0,
    totalOrders: 0,
    totalRevenue: 0,
    averageRating: 0,
    recentDesigns: [],
    recentOrders: []
  })
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  // Combine both loading states
  const isPageLoading = isLoading || isLoadingStats

  useEffect(() => {
    // Check auth status when component mounts
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setIsAuthDialogOpen(!session?.user)
      
      if (session?.user) {
        // Don't set isLoading to false until all data is loaded
        const { data, error } = await supabase
          .from('tailor_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching tailor profile:', error)
        }
        
        setTailorProfile(data)
        // Fetch dashboard stats when user is authenticated
        await fetchDashboardStats()
      }
      setIsLoading(false)
    })

    // Initial auth check
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const { data, error } = await supabase
          .from('tailor_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching tailor profile:', error)
        }
        
        setTailorProfile(data)
        // Fetch dashboard stats on initial load
        await fetchDashboardStats()
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      setIsAuthDialogOpen(false)
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
      setIsAuthDialogOpen(false)
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
    } catch (error) {
      console.error('Error signing in with Google:', error)
    }
  }

  // Don't allow closing the dialog if user is not authenticated
  const handleCloseDialog = () => {
    if (user) {
      setIsAuthDialogOpen(false)
    }
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  const handleProfileComplete = async (profile: any) => {
    await refreshProfile()
    setShowProfileForm(false)
  }

  const fetchDashboardStats = async () => {
    try {
      setIsLoadingStats(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No user found')
        return
      }

      console.log('Fetching stats for user:', user.id)

      // Fetch total designs count
      const { data: designs, count: designsCount, error: designsError } = await supabase
        .from('designs')
        .select('*', { count: 'exact' })
        .eq('created_by', user.id)

      if (designsError) {
        console.error('Error fetching designs:', designsError.message)
        return
      }

      console.log('Designs found:', designsCount)

      // Fetch orders
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('tailor_id', user.id)

      if (ordersError) {
        console.error('Error fetching orders:', ordersError.message)
        return
      }

      const totalOrders = orders?.length || 0
      const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0

      // Fetch recent designs
      const { data: recentDesigns, error: recentDesignsError } = await supabase
        .from('designs')
        .select('id, title, created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentDesignsError) {
        console.error('Error fetching recent designs:', recentDesignsError.message)
        return
      }

      // Fetch recent orders
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status')
        .eq('tailor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentOrdersError) {
        console.error('Error fetching recent orders:', recentOrdersError.message)
        return
      }

      setStats({
        totalDesigns: designsCount || 0,
        totalOrders,
        totalRevenue,
        averageRating: 4.8,
        recentDesigns: recentDesigns || [],
        recentOrders: recentOrders || []
      })

      console.log('Stats updated successfully')
    } catch (error) {
      console.error('Error in fetchDashboardStats:', error instanceof Error ? error.message : error)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const handleViewAllDesigns = () => {
    router.push('/tailor/designs')
  }

  const handleViewAllOrders = () => {
    router.push('/tailor/orders')
  }

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.authContainer}>
        <Button 
          onClick={handleBackToHome}
          className={styles.backButton}
          variant="outline"
        >
          <IoArrowBack width={80}/> Back to Home
        </Button>
        <AuthDialog
          isOpen={isAuthDialogOpen}
          onClose={handleCloseDialog}
          onSubmit={handleSubmit}
          onSignUp={handleSignUp}
          onGoogleSignIn={handleGoogleSignIn}
        />
      </div>
    )
  }

  if (!hasProfile) {
    return (
      <div className={styles.createProfileContainer}>
        {showProfileForm ? (
          <TailorProfileForm
            onComplete={handleProfileComplete}
            onCancel={() => setShowProfileForm(false)}
            initialData={{
              brandName: '',
              tailorName: '',
              logo: '',
              bannerImage: '',
              address: '',
              phone: '',
              email: '',
              bio: '',
              rating: 0,
              website: '',
              experience: '',
              specializations: [],
            }}
          />
        ) : (
          <>
            <h1>Create Your Fashion House</h1>
            <p>To get started, you need to create your designer profile.</p>
            <Button 
              onClick={() => setShowProfileForm(true)}
              className={styles.createProfileButton}
            >
              Create Fashion House
            </Button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainContent}>
        <div className={styles.mainContentInner}>
          <div className={styles.cardsGrid}>
            <Card className={styles.card}>
              <h3>Total Designs</h3>
              <p className={styles.statNumber}>{stats.totalDesigns}</p>
            </Card>
            <Card className={styles.card}>
              <h3>Total Orders</h3>
              <p className={styles.statNumber}>{stats.totalOrders}</p>
            </Card>
            <Card className={styles.card}>
              <h3>Revenue</h3>
              <p className={styles.statNumber}>${stats.totalRevenue.toLocaleString()}</p>
            </Card>
            <Card className={styles.card}>
              <h3>Rating</h3>
              <p className={styles.statNumber}>{stats.averageRating.toFixed(1)}</p>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Designs</h3>
              {stats.recentDesigns.map((design) => (
                <div key={design.id} className={styles.recentItem}>
                  <span>{design.title}</span>
                  {/* <span>$10</span> */}
                </div>
              ))}
              <Button 
                className={styles.viewAllButton}
                onClick={handleViewAllDesigns}
              >
                View All Designs
              </Button>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Orders</h3>
              {stats.recentOrders.map((order) => (
                <div key={order.id} className={styles.recentItem}>
                  <span>Order #{order.id.slice(0, 8)}</span>
                  <span>${order.total_amount}</span>
                </div>
              ))}
              <Button 
                className={styles.viewAllButton}
                onClick={handleViewAllOrders}
              >
                View All Orders
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}