'use client'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
import { useAuth } from "../lib/AuthContext"

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

// Add this utility function for timeouts
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject(new Error(errorMessage));
    }, ms);
    
    promise.then(
      (result) => {
        clearTimeout(timeoutId);
        resolve(result);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

export default function Dashboard() {
  const router = useRouter()
  const { user } = useAuth()
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
  const [dataLoaded, setDataLoaded] = useState(false) // Track if data has been loaded

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
      const designsResponse = await withTimeout(
        supabase
          .from('designs')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', userId) as unknown as Promise<any>,
        8000,
        'Designs count fetch timed out'
      );
      
      const designsCount = designsResponse.count || 0;
      if (designsResponse.error) {
        console.error('[fetchDashboardStats] Error fetching designs:', designsResponse.error.message);
      } else {
        console.log('[fetchDashboardStats] Designs count fetched:', designsCount);
      }

      const ordersResponse = await withTimeout(
        supabase
          .from('orders')
          .select('total_amount, status')
          .eq('tailor_id', userId)
          .in('status', ['delivered']) as unknown as Promise<any>,
        8000,
        'Orders fetch timed out'
      );
      
      const orders = ordersResponse.data || [];
      if (ordersResponse.error) {
        console.error('[fetchDashboardStats] Error fetching orders:', ordersResponse.error.message);
      } else {
        console.log('[fetchDashboardStats] Orders for revenue fetched.');
      }

      const totalOrders = orders.length || 0;
      const totalRevenue = orders.reduce((sum: number, order: {total_amount: number}) => 
        sum + (Number(order.total_amount) || 0), 0) || 0;

      const recentDesignsResponse = await withTimeout(
        supabase
          .from('designs')
          .select('id, title, created_at, images')
          .eq('created_by', userId)
          .order('created_at', { ascending: false })
          .limit(5) as unknown as Promise<any>,
        8000,
        'Recent designs fetch timed out'
      );
      
      const recentDesigns = recentDesignsResponse.data || [];
      if (recentDesignsResponse.error) {
        console.error('[fetchDashboardStats] Error fetching recent designs:', recentDesignsResponse.error.message);
      } else {
        console.log('[fetchDashboardStats] Recent designs fetched.');
      }

      const recentOrdersResponse = await withTimeout(
        supabase
          .from('orders')
          .select('id, created_at, total_amount, status')
          .eq('tailor_id', userId)
          .order('created_at', { ascending: false })
          .limit(5) as unknown as Promise<any>,
        8000,
        'Recent orders fetch timed out'
      );
      
      const recentOrders = recentOrdersResponse.data || [];
      if (recentOrdersResponse.error) {
        console.error('[fetchDashboardStats] Error fetching recent orders:', recentOrdersResponse.error.message);
      } else {
      }

      let averageRating = 0;
      try {
        const ratingResponse = await withTimeout(
          supabase
            .from('tailor_details')
            .select('rating, rating_sum, rating_count')
            .eq('id', userId) as unknown as Promise<any>,
          5000,
          'Tailor rating fetch timed out'
        );
        
        
        if (ratingResponse.error) {
          console.error('[fetchDashboardStats] Error fetching tailor rating:', ratingResponse.error);
        } else if (ratingResponse.data && ratingResponse.data.length > 0) {
          const ratingData = ratingResponse.data[0]; // Make sure we're accessing the first row
          
          // First check if we have sum and count to calculate average
          if (ratingData.rating_count && ratingData.rating_sum && ratingData.rating_count > 0) {
            averageRating = ratingData.rating_sum / ratingData.rating_count;
            console.log(`[fetchDashboardStats] Calculated rating from sum/count: sum=${ratingData.rating_sum}, count=${ratingData.rating_count}, avg=${averageRating.toFixed(1)}`);
          }
          // If no rating_count/sum but we have a direct rating, use that
          else if (ratingData.rating !== null && ratingData.rating !== undefined && ratingData.rating > 0) {
            averageRating = ratingData.rating;
          } else {
            console.log('[fetchDashboardStats] No valid rating data found:', 
              'rating=', ratingData.rating,
              'rating_sum=', ratingData.rating_sum,
              'rating_count=', ratingData.rating_count);
          }
        } else {
        }
      } catch (ratingError) {
        console.error('[fetchDashboardStats] Error in rating fetch:', ratingError);
      }
      
      
      setStats({
        totalDesigns: designsCount || 0,
        totalOrders,
        totalRevenue,
        averageRating: parseFloat(averageRating.toFixed(1)),
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
      setIsLoadingStats(false);
    }
  }, []); // Remove supabase dependency as it's stable

  useEffect(() => {
    // Prevent re-running if data is already loaded and user hasn't changed
    if (dataLoaded && user?.id) {
      return;
    }

    setIsLoading(true);

    const checkAndFetchData = async () => {
      try {
        // Skip auth check since we're now using the auth context
        if (!user) {
          setIsLoading(false);
          setIsLoadingStats(false);
          return;
        }
        
        try {
          const profileResponse = await withTimeout(
            // Cast this to Promise to avoid TypeScript error
            supabase
              .from('tailor_details')
              .select('*')
              .eq('id', user.id)
              .single() as unknown as Promise<any>,
            10000,
            'Tailor profile fetch timed out'
          );
          
          if (profileResponse.error) {
            if (profileResponse.error.code === 'PGRST116') {
              console.log('[checkAndFetchData] No tailor profile found - new user');
            } else {
              console.error('[checkAndFetchData] Error fetching tailor profile:', profileResponse.error);
            }
          } else {
            console.log('[checkAndFetchData] Tailor profile fetched successfully');
          }
          
          setTailorProfile(profileResponse.data);
          
        } catch (profileFetchError) {
          console.error('[checkAndFetchData] Failed to fetch profile:', profileFetchError);
        }
        
        // 3. Fetch dashboard stats with timeout
        try {
          await fetchDashboardStats(user.id);
        } catch (statsError) {
          console.error('[checkAndFetchData] Error fetching dashboard stats:', statsError);
          // Reset stats to empty state on error
          setStats({
            totalDesigns: 0,
            totalOrders: 0, 
            totalRevenue: 0,
            averageRating: 0,
            recentDesigns: [],
            recentOrders: []
          });
        }

        // Mark data as loaded
        setDataLoaded(true);
      } catch (e) {
        console.error('[checkAndFetchData] Top-level error:', e);
      } finally {
        // Always finish loading no matter what
        console.log('[checkAndFetchData] Setting loading states to false');
        setIsLoading(false);
        setIsLoadingStats(false);
      }
    };
    
    // Start data fetching
    checkAndFetchData();
    
  // Only depend on user.id, not the entire user object or other functions
  }, [user?.id, fetchDashboardStats]);

  // Handle page visibility changes to prevent unnecessary reloads
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Don't refetch data when coming back to tab if data is already loaded
      if (document.visibilityState === 'visible' && dataLoaded) {
        console.log('[visibilityChange] Page visible but data already loaded, skipping refetch');
        return;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dataLoaded]);

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

  // Memoize expensive computations
  const memoizedStats = useMemo(() => ({
    ...stats,
    formattedRevenue: stats.totalRevenue.toLocaleString(),
    formattedRating: (stats.averageRating !== null && stats.averageRating !== undefined && stats.averageRating > 0) 
      ? stats.averageRating.toFixed(1) 
      : '-',
    hasRating: (stats.averageRating !== null && stats.averageRating !== undefined && stats.averageRating > 0)
  }), [stats]);

  // Use combined loading state for the spinner
  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!hasProfile && user) {
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
            <h1>Create Your Tailor Account</h1>
            <p>To get started, you need to create your designer profile.</p>
            <Button 
              onClick={() => setShowProfileForm(true)}
              className={styles.createProfileButton}
            >
              Create Tailor Account
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
              <p className={styles.statNumber}>{memoizedStats.totalDesigns}</p>
            </Card>
            <Card className={styles.card}>
              <h3>Total Orders</h3>
              <p className={styles.statNumber}>{memoizedStats.totalOrders}</p>
            </Card>
            <Card className={styles.card}>
              <h3>Revenue</h3>
              <p className={styles.statNumber}>${memoizedStats.formattedRevenue}</p>
              <p className={styles.statSubtext}>From completed orders</p>
            </Card>
            <Card className={styles.card}>
              <h3>Rating</h3>
              <p className={styles.statNumber}>{memoizedStats.formattedRating}</p>
              {memoizedStats.hasRating ? (
                <p className={styles.statSubtext}>{`Based on ratings from customers`}</p>
              ) : (
                <p className={styles.statSubtext}>No ratings yet</p>
              )}
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Designs</h3>
              <div className={styles.recentItemsContainer}>
                {memoizedStats.recentDesigns.map((design) => (
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
              </div>
              <Button 
                className={styles.viewAllButton}
                onClick={handleViewAllDesigns}
              >
                View All Designs
              </Button>
            </Card>

            <Card className={`${styles.card} ${styles.wideCard}`}>
              <h3>Recent Orders</h3>
              <div className={styles.recentItemsContainer}>
                {memoizedStats.recentOrders.map((order) => (
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
              </div>
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