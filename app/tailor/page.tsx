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

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false)
  const [tailorProfile, setTailorProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { hasProfile, refreshProfile } = useProfile()
  const [showProfileForm, setShowProfileForm] = useState(false)

  useEffect(() => {
    // Check auth status when component mounts
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setIsAuthDialogOpen(!session?.user)
      
      if (session?.user) {
        // Fetch tailor profile when user is authenticated
        const { data, error } = await supabase
          .from('tailor_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
          console.error('Error fetching tailor profile:', error)
        }
        
        setTailorProfile(data)
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

  if (isLoading) {
    return <div>Loading...</div>
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
              <p className={styles.statNumber}>24</p>
            </Card>
            <Card className={styles.card}>
              <h3>Total Orders</h3>
              <p className={styles.statNumber}>120</p>
            </Card>
            <Card className={styles.card}>
              <h3>Revenue</h3>
              <p className={styles.statNumber}>$12,345</p>
            </Card>
            <Card className={styles.card}>
              <h3>Rating</h3>
              <p className={styles.statNumber}>4.8</p>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Designs</h3>
              <Button className={styles.viewAllButton}>
                View All Designs
              </Button>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Orders</h3>
              <Button className={styles.viewAllButton}>
                View All Orders
              </Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}