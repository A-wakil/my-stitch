'use client'
import React, { useState, useEffect, useCallback } from 'react'
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
  images: string[];
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

  // Combined page loading state
  const isPageLoading = isLoading || (user != null && isLoadingStats);

  // Memoize fetchDashboardStats with useCallback
  const fetchDashboardStats = useCallback(async (userId: string) => {
    if (!userId) {
      console.log('[fetchDashboardStats] No user ID provided.');
      setIsLoadingStats(false);
      setStats({ 
        totalDesigns: 0, totalOrders: 0, totalRevenue: 0, 
        averageRating: 0, recentDesigns: [], recentOrders: [] 
      });
      return;
    }

    console.log(`[fetchDashboardStats] Starting for user: ${userId}`);
    setIsLoadingStats(true);
    try {
      console.log('[fetchDashboardStats] Fetching designs count...');
      const { count: designsCount, error: designsError } = await supabase
        .from('designs')
        .select('*', { count: 'exact', head: true }) // Use head:true for count-only
        .eq('created_by', userId);
      if (designsError) console.error('[fetchDashboardStats] Error fetching designs:', designsError.message);
      else console.log('[fetchDashboardStats] Designs count fetched:', designsCount);

      console.log('[fetchDashboardStats] Fetching orders for revenue...');
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('total_amount, status')
        .eq('tailor_id', userId)
        .in('status', ['delivered']);
      if (ordersError) console.error('[fetchDashboardStats] Error fetching orders:', ordersError.message);
      else console.log('[fetchDashboardStats] Orders for revenue fetched.');

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0) || 0;

      console.log('[fetchDashboardStats] Fetching recent designs...');
      const { data: recentDesigns, error: recentDesignsError } = await supabase
        .from('designs')
        .select('id, title, created_at, images')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentDesignsError) console.error('[fetchDashboardStats] Error fetching recent designs:', recentDesignsError.message);
      else console.log('[fetchDashboardStats] Recent designs fetched.');

      console.log('[fetchDashboardStats] Fetching recent orders...');
      const { data: recentOrders, error: recentOrdersError } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status')
        .eq('tailor_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (recentOrdersError) console.error('[fetchDashboardStats] Error fetching recent orders:', recentOrdersError.message);
      else console.log('[fetchDashboardStats] Recent orders fetched.');

      setStats({
        totalDesigns: designsCount || 0,
        totalOrders,
        totalRevenue,
        averageRating: 4.8, 
        recentDesigns: recentDesigns || [],
        recentOrders: recentOrders || []
      });
      console.log('[fetchDashboardStats] Stats updated successfully');
    } catch (error) {
      console.error('[fetchDashboardStats] Error:', error instanceof Error ? error.message : error);
      setStats({ 
          totalDesigns: 0, totalOrders: 0, totalRevenue: 0, 
          averageRating: 0, recentDesigns: [], recentOrders: [] 
      });
    } finally {
      console.log('[fetchDashboardStats] Finished. Setting isLoadingStats to false.');
      setIsLoadingStats(false);
    }
  }, [supabase]); // Added supabase as a dependency, assuming it's stable.
                 // If supabase client instance can change, this might need adjustment.

  useEffect(() => {
    console.log('[useEffect] Mounting. Setting isLoading to true.');
    setIsLoading(true); 

    const { data: authSubscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentAuthUser = session?.user ?? null;
        console.log(`[useEffect onAuthStateChange] Event: ${event}, User: ${currentAuthUser?.id}`);
        setUser(currentAuthUser);
        setIsAuthDialogOpen(!currentAuthUser);

        if (currentAuthUser) {
          console.log('[useEffect onAuthStateChange] User authenticated. Preparing to fetch data...');
          setIsLoading(true); 
          try {
            console.log(`[useEffect onAuthStateChange] Attempting to fetch tailor profile for user ID: ${currentAuthUser.id}...`);
            const { data: profileData, error: profileError, status: profileStatus, statusText: profileStatusText } = await supabase
              .from('tailor_details')
              .select('*')
              .eq('id', currentAuthUser.id)
              .single();

            console.log(`[useEffect onAuthStateChange] Tailor profile query completed. Status: ${profileStatus}, StatusText: ${profileStatusText}`);

            if (profileError) {
              console.log(`[useEffect onAuthStateChange] Tailor profile query returned an error object. Code: ${profileError.code}, Message: ${profileError.message}`);
              if (profileError.code !== 'PGRST116') {
                console.error('[useEffect onAuthStateChange] Critical error fetching tailor profile:', profileError);
              } else {
                console.log('[useEffect onAuthStateChange] Tailor profile not found (PGRST116), which is acceptable if new user.');
              }
            } else {
              console.log('[useEffect onAuthStateChange] Tailor profile data fetched successfully:', profileData);
            }
            setTailorProfile(profileData);
            
            console.log('[useEffect onAuthStateChange] Calling fetchDashboardStats...');
            await fetchDashboardStats(currentAuthUser.id);
            console.log('[useEffect onAuthStateChange] fetchDashboardStats call completed.');

          } catch (e) {
            console.error("[useEffect onAuthStateChange] Error in authenticated user data fetching path catch block:", e);
          } finally {
            console.log('[useEffect onAuthStateChange] Authenticated path finally block. Setting isLoading to false.');
            setIsLoading(false); 
          }
        } else {
          console.log('[useEffect onAuthStateChange] User not authenticated or session ended. Resetting state.');
          setTailorProfile(null);
          setStats({ 
            totalDesigns: 0, totalOrders: 0, totalRevenue: 0, 
            averageRating: 0, recentDesigns: [], recentOrders: [] 
          });
          setIsLoading(false);
          setIsLoadingStats(false); 
        }
      }
    );

    console.log('[useEffect] Subscription created.');
    return () => {
      console.log('[useEffect] Unsubscribing from auth changes.');
      authSubscription.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshProfile, fetchDashboardStats]); // Added fetchDashboardStats to dependencies. Supabase client from context if used.

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
      // Hide the profile form
      setShowProfileForm(false)
  }

  const handleViewAllDesigns = () => {
    router.push('/tailor/designs')
  }

  const handleViewAllOrders = () => {
    router.push('/tailor/orders')
  }

  // Use combined loading state for the spinner
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
              <p className={styles.statSubtext}>From completed orders</p>
            </Card>
            <Card className={styles.card}>
              <h3>Rating</h3>
              <p className={styles.statNumber}>{stats.averageRating.toFixed(1)}</p>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Designs</h3>
              {stats.recentDesigns.map((design) => (
                <div 
                  key={design.id} 
                  className={styles.recentItem}
                  onClick={() => {
                    router.push(`/tailor/designs#${design.id}`);
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      router.push(`/tailor/designs#${design.id}`);
                    }
                  }}
                >
                  <div className={styles.recentItemContent}>
                    <img 
                      src={design.images?.[0] || "/placeholder.svg"} 
                      alt={design.title}
                      className={styles.recentItemImage}
                    />
                    <div className={styles.recentItemDetails}>
                      <div className={styles.recentItemTitle}>{design.title}</div>
                      <div className={styles.recentItemMeta}>
                        Created {new Date(design.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
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
                <div 
                  key={order.id} 
                  className={styles.recentItem}
                  onClick={() => {
                    router.push(`/tailor/orders#${order.id}`);
                  }}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      router.push(`/tailor/orders#${order.id}`);
                    }
                  }}
                >
                  <div className={styles.recentItemContent}>
                    <div className={styles.recentItemDetails}>
                      <div className={styles.recentItemTitle}>Order #{order.id.slice(0, 8)}</div>
                      <div className={styles.recentItemMeta}>
                        Placed {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={styles.recentItemStatus} data-status={order.status}>
                    {order.status.replace(/_/g, ' ')}
                  </div>
                  <div className={styles.recentItemPrice}>
                    ${order.total_amount}
                  </div>
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