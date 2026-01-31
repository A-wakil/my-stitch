'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './orders.module.css'
import { Order, Profile } from '../../lib/types'
import { useRouter } from 'next/navigation'
import { Spinner } from '../components/ui/spinner'
import { sendOrderNotification } from '../../lib/notifications'
import { toast } from 'react-hot-toast'
import { FiChevronDown, FiChevronUp, FiPlayCircle } from 'react-icons/fi'

type OrderStatus = 'all' | 'pending' | 'accepted' | 'in_progress' | 'ready_to_ship' | 'shipped' | 'rejected'

const measurementVideoLinks: Record<string, string> = {
  cap: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/cap.mp4',
  shoulders: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shoulder.mp4',
  chest: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/chest.mp4',
  waist: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/waist.mp4',
  hips: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/hips.mp4',
  thigh: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/thigh.mp4',
  knee: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/knee.mp4',
  shoulder_to_elbow: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/sleeves.mp4',
  shoulder_to_wrist: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/sleeves.mp4',
  waist_to_knee: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/trouserLength.mp4',
  waist_to_ankle: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/trouserLength.mp4',
  round_sleeves: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/bicep.mp4',
  wrist: '',
  tummy: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/tummy.mp4',
  shirt_shoulder_to_wrist: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shirtLength.mp4',
  shirt_shoulder_to_knee: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shirtLength.mp4',
  shirt_shoulder_to_ankle: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/shirtLength.mp4',
  calves: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/calves.mp4',
  ankle_width: '',
  neck: 'https://ewfttdrfsdhgslldfgmz.supabase.co/storage/v1/object/public/tutorial-videos/neck.mp4',
  off_shoulder_top: '',
  underbust: '',
  top_length: '',
  bust_length: '',
  underbust_length: '',
  nipple_to_nipple: '',
  upper_waist: '',
  lower_waist: '',
  bust: '',
  ankle_trouser_end: '',
}

const ordersCache = new Map<string, {
  orders: Order[]
  clientProfiles: Record<string, Profile>
  tailorProfile: Profile | null
}>()

export default function TailorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus>('all')
  const [selectedImages, setSelectedImages] = useState<Record<string, number>>({})  // Track selected image index for each order
  const [clientProfiles, setClientProfiles] = useState<Record<string, Profile>>({})
  const [tailorProfile, setTailorProfile] = useState<Profile | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMeasurements, setSelectedMeasurements] = useState<any>(null)
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [activeVideoGuide, setActiveVideoGuide] = useState<{ title: string; url: string } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [isTabsExpanded, setIsTabsExpanded] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false) // Track if data has been loaded
  const tabsRef = useRef<HTMLDivElement>(null)

  // Add effect to detect viewport size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setOrders([]);
    setClientProfiles({});

    try {
      // Fetch orders for this tailor
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('tailor_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        setOrders([]);
        setIsLoading(false);
        return;
      }

      console.log(`Fetched ${ordersData?.length || 0} orders for tailor`);

      // Then fetch design details and order items for each order
      const ordersWithDesigns = await Promise.all(
        (ordersData || []).map(async (order) => {
          // First check if this order has order_items (new multi-item system)
          const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

          if (orderItemsError) {
            console.error(`Error fetching order items for order ${order.id}:`, orderItemsError)
          }

          if (orderItems && orderItems.length > 0) {
            // New multi-item order - fetch designs and measurements for each item
            const itemsWithDesignsAndMeasurements = await Promise.all(
              orderItems.map(async (item) => {
                // Fetch design
                const { data: designData, error: designError } = await supabase
                  .from('designs')
                  .select('*')
                  .eq('id', item.design_id)
                  .single()

                if (designError) {
                  console.error(`Error fetching design ${item.design_id}:`, designError)
                }

                // Handle soft-deleted designs
                let design = null;
                if (designData) {
                  if (designData.is_deleted) {
                    design = { ...designData, is_soft_deleted: true };
                  } else {
                    design = designData;
                  }
                }

                // Fetch measurements if measurement_id exists
                let measurements = null;
                if (item.measurement_id) {
                  const { data: measurementData, error: measurementError } = await supabase
                    .from('measurements')
                    .select('*')
                    .eq('id', item.measurement_id)
                    .single()

                  if (measurementError) {
                    console.error(`Error fetching measurements ${item.measurement_id}:`, measurementError)
                  } else {
                    measurements = measurementData;
                  }
                }

                return { ...item, design, measurements }
              })
            )

            return { ...order, orderItems: itemsWithDesignsAndMeasurements, design: null }
          } else {
            // Legacy single-item order - fetch design directly
            if (!order.design_id) return { ...order, design: null, orderItems: [] }

            const { data: designData, error: designError } = await supabase
              .from('designs')
              .select('*')
              .eq('id', order.design_id)
              .single()

            if (designError) {
              console.error(`Error fetching design ${order.design_id}:`, designError)
              return { ...order, design: null, orderItems: [] }
            }

            // Handle soft-deleted designs
            if (designData && designData.is_deleted) {
              console.log(`Design ${order.design_id} has been soft-deleted`)
              return { ...order, design: { ...designData, is_soft_deleted: true }, orderItems: [] }
            }

            return { ...order, design: designData, orderItems: [] }
          }
        })
      )

      // Collect unique user IDs from orders
      const userIds = [...new Set(ordersWithDesigns.map(order => order.user_id))];
      console.log('Customer IDs from orders:', userIds);
      
      let profileMap: Record<string, Profile> = {};
      if (userIds.length > 0) {
        // Fetch client profiles - with improved query
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching customer profiles:', profilesError);
        } else if (!profiles || profiles.length === 0) {
          console.error('No customer profiles found for IDs:', userIds);
        } else {
          console.log(`Found ${profiles.length} customer profiles`);
          
          profiles.forEach(profile => {
            profileMap[profile.id] = profile;
          });
          setClientProfiles(profileMap);
        }
      }

      setOrders(ordersWithDesigns);
      ordersCache.set(user.id, {
        orders: ordersWithDesigns,
        clientProfiles: profileMap,
        tailorProfile
      });
    } catch (err) {
      console.error('Error in fetchOrders:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const loadUserAndProfile = async () => {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error fetching auth user:', error)
        setIsLoading(false);
        return
      }
      setUser(currentUser)
      if (currentUser) {
        const cached = ordersCache.get(currentUser.id)
        if (cached) {
          setOrders(cached.orders)
          setClientProfiles(cached.clientProfiles)
          setTailorProfile(cached.tailorProfile)
          setDataLoaded(true)
          setIsLoading(false)
          return
        }
      }
      if (currentUser) {
        const profile = await ensureProfileExists(
          currentUser.id,
          currentUser.email || '',
          'tailor'
        )
        if (profile) setTailorProfile(profile)
      }
    }
    loadUserAndProfile()
  }, [])

  useEffect(() => {
    // Prevent re-running if data is already loaded and user hasn't changed
    if (dataLoaded && user?.id) {
      return;
    }

    if(user) {
      fetchOrders().then(() => {
        setDataLoaded(true);
      });
    }
  }, [user?.id, fetchOrders])

  // Add new effect to handle hash-based scrolling
  useEffect(() => {
    if (typeof window !== 'undefined' && orders.length > 0) {
      const hash = window.location.hash.slice(1) // Remove the # from the hash
      if (hash) {
        const element = document.getElementById(hash)
        if (element) {
          // Wait a bit for the layout to stabilize
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' })
            // Add a highlight effect
            element.style.backgroundColor = '#fef9c3'
            setTimeout(() => {
              element.style.transition = 'background-color 0.5s ease'
              element.style.backgroundColor = ''
            }, 1500)
          }, 100)
        }
      }
    }
  }, [orders])

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (newStatus === 'shipped') {
      toast.error('Only admins can mark orders as shipped.');
      console.warn('Attempted to set order status to shipped from tailor UI');
      return;
    }

    setProcessingOrderId(orderId);
    try {
      console.log(`Updating order ${orderId} to status: ${newStatus}`);
      
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.error(`Order ${orderId} not found in local state`);
        toast.error('Order not found.');
        return;
      }

      const additionalData: Record<string, any> = {};
      
      if (newStatus === 'accepted') {
        const estimatedCompletionDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        additionalData.estimatedCompletionDate = estimatedCompletionDate;
      }

      console.log('Updating order in database...');
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'accepted' && {
            estimated_completion_date: additionalData.estimatedCompletionDate
          })
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order:', error);
        toast.error('Failed to update order status.');
        return;
      }

      console.log('Order updated in database successfully');

      // Ensure tailor profile is loaded
      let currentTailorProfile = tailorProfile
      if (!currentTailorProfile && user) {
        currentTailorProfile = await ensureProfileExists(
          user.id,
          user.email || '',
          'tailor'
        )
        if (currentTailorProfile) setTailorProfile(currentTailorProfile)
      }
      
      // Get customer profile directly from order's user_id
      const { data: customerProfileData, error: customerProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', order.user_id);
      
      let customerProfile = customerProfileData && customerProfileData.length > 0 ? customerProfileData[0] : null;
      if (!customerProfile) {
        // Try to create a customer profile automatically if we have enough info
        // Use tailor email for development purposes or lookup actual user email
        const email = currentTailorProfile?.email || 'customer@example.com';
        customerProfile = await ensureProfileExists(order.user_id, email, 'customer');
        if (customerProfile) {
          setClientProfiles(prev => ({...prev, [order.user_id]: customerProfile}));
        }
      }
      
      console.log('Customer profile:', customerProfile ? 'Found' : 'Not found', 
                 customerProfile ? `(${customerProfile.email})` : '');
      console.log('Tailor profile:', currentTailorProfile ? 'Found' : 'Not found',
                 currentTailorProfile ? `(${currentTailorProfile.email})` : '');
      
      if (customerProfile && currentTailorProfile) {
        // Map order status to notification type
        const notificationType = `order_${newStatus}` as const;
        
        console.log(`Attempting to send ${notificationType} notification to ${customerProfile.email}`);
        
        try {
          // Send notification to customer
          const result = await sendOrderNotification(
            notificationType,
            order,
            customerProfile,
            additionalData
          );
          
          console.log('Notification result:', result);
          
          if (result.success) {
            console.log(`Notification sent to customer for order ${orderId} status change to ${newStatus}`);
            toast.success(`Order status updated to ${newStatus}.`);
          } else {
            console.error(`Failed to send notification: ${result.error}`);
          }
        } catch (err) {
          console.error('Failed to send notification:', err);
        }
      } else {
        console.error('Cannot send notification: missing profile data',
                     !customerProfile ? 'Customer profile missing' : '',
                     !currentTailorProfile ? 'Tailor profile missing' : '');
      }

      // Refresh orders
      console.log('Refreshing orders...');
      await fetchOrders();
    } catch (err) {
      console.error('Error in updateOrderStatus:', err);
      toast.error('An error occurred while updating status.');
    } finally {
      setProcessingOrderId(null);
    }
  }

  const handleRejectOrder = (orderId: string) => {
    setRejectingOrderId(orderId);
    setRejectionReason('');
    setIsRejectionModalOpen(true);
  };

  const submitOrderRejection = async () => {
    if (!rejectingOrderId || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    // Close modal first for better UX
    setIsRejectionModalOpen(false);
    
    setProcessingOrderId(rejectingOrderId);
    
    try {
      const orderToUpdate = orders.find(o => o.id === rejectingOrderId);
      if (!orderToUpdate) {
        console.error(`Order ${rejectingOrderId} not found in local state`);
        toast.error('Order not found for rejection.');
        return;
      }

      console.log('Updating order in database with rejection reason...');
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason,
          updated_at: new Date().toISOString()
        })
        .eq('id', rejectingOrderId);

      if (error) {
        console.error('Error updating order:', error);
        toast.error('Failed to reject order.');
        return;
      }

      console.log('Order rejected in database successfully');
      toast.success('Order rejected successfully.');

      // Send notification to customer about rejection
      const { data: customerProfileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', orderToUpdate.user_id);
      
      let customerProfile = customerProfileData && customerProfileData.length > 0 ? customerProfileData[0] : null;
      
      if (customerProfile && tailorProfile) {
        try {
          // Send notification to customer
          await sendOrderNotification(
            'order_rejected',
            orderToUpdate,
            customerProfile,
            { reason: rejectionReason }
          );
          
          console.log(`Rejection notification sent to customer for order ${rejectingOrderId}`);
        } catch (err) {
          console.error('Failed to send rejection notification:', err);
        }
      }

      // Clear state and refresh orders
      setRejectingOrderId(null);
      setRejectionReason('');
      await fetchOrders();
    } catch (err) {
      console.error('Error in submitOrderRejection:', err);
      toast.error('An error occurred while rejecting the order.');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const filteredOrders = orders.filter(order => 
    activeTab === 'all' ? true : order.status === activeTab
  )

  const orderCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const openMeasurementsModal = (measurements: any) => {
    setSelectedMeasurements(measurements)
    setIsModalOpen(true)
  }

  const openMeasurementVideo = (label: string, key: string) => {
    const url = measurementVideoLinks[key]
    if (!url) {
      toast('Video guide coming soon.')
      return
    }
    setActiveVideoGuide({ title: label, url })
  }

  const closeMeasurementVideo = () => setActiveVideoGuide(null)

  const renderVideoContent = (url: string, title: string) => {
    const trimmed = url.trim()
    const isFile = /\.(mp4|webm|ogg|mov)$/i.test(trimmed)
    if (isFile) {
      return (
        <video className={styles.videoPlayer} src={trimmed} controls autoPlay playsInline />
      )
    }
    return (
      <iframe
        className={styles.videoPlayer}
        src={trimmed}
        title={`${title} tutorial`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    )
  }

  const toggleTabs = () => {
    setIsTabsExpanded(!isTabsExpanded);
  };

  // Get a nice label for the current tab
  const getTabLabel = (status: OrderStatus) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'in_progress': return 'In Progress';
      case 'ready_to_ship': return 'Ready to Ship';
      case 'shipped': return 'Shipped';
      case 'rejected': return 'Rejected';
      case 'all': return 'All Orders';
      default: return String(status).replace(/_/g, ' ');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Your Orders</h1>
      </div>

      {isMobile && (
        <div className={styles.mobileTabSelector} onClick={toggleTabs}>
          <span>{getTabLabel(activeTab)} ({activeTab === 'all' ? orders.length : (orderCounts[activeTab] || 0)})</span>
          {isTabsExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      )}

      <div className={styles.tabsContainer}>
        <div 
          ref={tabsRef} 
          className={`${styles.tabs} ${isMobile && !isTabsExpanded ? styles.tabsCollapsed : ''}`}
        >
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('all');
              if (isMobile) setIsTabsExpanded(false);
            }}
          >
            All Orders ({orders.length})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'pending' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('pending');
              if (isMobile) setIsTabsExpanded(false);
            }}
          >
            Pending ({orderCounts['pending'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'accepted' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('accepted');
              if (isMobile) setIsTabsExpanded(false);
            }}
          >
            Accepted ({orderCounts['accepted'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'in_progress' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('in_progress');
              if (isMobile) setIsTabsExpanded(false);
            }}
          >
            In Progress ({orderCounts['in_progress'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'ready_to_ship' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('ready_to_ship');
              if (isMobile) setIsTabsExpanded(false);
            }}
          >
            Ready to Ship ({orderCounts['ready_to_ship'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'shipped' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('shipped');
              if (isMobile) setIsTabsExpanded(false);
            }}
          >
            Shipped ({orderCounts['shipped'] || 0})
          </button>
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        filteredOrders.map(order => (
          <div 
            key={order.id} 
            id={order.id}
            className={styles.orderCard}
          >
            <div className={styles.orderHeader}>
              <div className={styles.orderInfo}>
                <div className={styles.orderMeta}>
                  <div>
                    <div className={styles.label}>ORDER PLACED</div>
                    <div>{new Date(order.created_at).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className={styles.label}>TOTAL</div>
                    <div>${order.total_amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className={styles.label}>SHIPPING ADDRESS</div>
                    <div className={styles.shipTo}>
                      {(() => {
                        try {
                          // Handle both string and object formats
                          let address;
                          if (typeof order.shipping_address === 'string') {
                            try {
                              // Try to parse as JSON first
                              address = JSON.parse(order.shipping_address);
                            } catch {
                              // If parsing fails, treat as a plain string
                              return order.shipping_address;
                            }
                          } else {
                            address = order.shipping_address;
                          }

                          // Handle structured address object
                          if (address && typeof address === 'object') {
                            const parts = [];
                            if (address.street_address) parts.push(address.street_address);
                            if (address.city) parts.push(address.city);
                            if (address.state) parts.push(address.state);
                            
                            return parts.length > 0 ? parts.join(', ') : 'Address not available';
                          }

                          return 'Address not available';
                        } catch (e) {
                          console.error('Error parsing shipping address:', e);
                          return 'Address not available';
                        }
                      })()}
                    </div>
                  </div>
                </div>
                <div className={styles.orderNumber}>
                  <div className={styles.label}>Client Name: {clientProfiles[order.user_id]?.firstname} {clientProfiles[order.user_id]?.lastname}</div>
                </div>
              </div>
            </div>

            <div className={styles.orderStatus}>
              <div className={styles.status} data-status={order.status}>
                {order.status}
              </div>
              <div className={styles.statusActions}>
                {order.status === 'pending' && (
                  <>
                    <button 
                      className={styles.acceptButton}
                      onClick={() => updateOrderStatus(order.id, 'accepted')}
                      disabled={processingOrderId === order.id}
                    >
                      {processingOrderId === order.id ? 'Processing...' : 'Accept Order'}
                    </button>
                    <button 
                      className={styles.rejectButton}
                      onClick={() => handleRejectOrder(order.id)}
                      disabled={processingOrderId === order.id}
                    >
                      {processingOrderId === order.id ? 'Processing...' : 'Reject Order'}
                    </button>
                  </>
                )}
                
                {order.status === 'accepted' && (
                  <button 
                    className={styles.progressButton}
                    onClick={() => updateOrderStatus(order.id, 'in_progress')}
                    disabled={processingOrderId === order.id}
                  >
                    {processingOrderId === order.id ? 'Processing...' : 'Start Production'}
                  </button>
                )}

                {order.status === 'in_progress' && (
                  <button 
                    className={styles.readyButton}
                    onClick={() => updateOrderStatus(order.id, 'ready_to_ship')}
                    disabled={processingOrderId === order.id}
                  >
                    {processingOrderId === order.id ? 'Processing...' : 'Mark Ready to Ship'}
                  </button>
                )}

                {order.status === 'ready_to_ship' && (
                  <div className={styles.statusNote}>
                    Orders ready to ship will be finalized by an admin.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.orderItems}>
              {order.orderItems && order.orderItems.length > 0 ? (
                // Multi-item order (new bag checkout)
                order.orderItems.map((item, itemIndex) => {
                  const itemKey = `${order.id}-${itemIndex}`;
                  return (
                    <div key={itemIndex} className={styles.orderItem}>
                      <div className={styles.itemImageContainer}>
                        <div className={styles.mainImage}>
                          {item.design?.images?.[selectedImages[itemKey] || 0] && (
                            <img 
                              src={item.design.images[selectedImages[itemKey] || 0]} 
                              alt={item.design.title} 
                              className={styles.designImage}
                            />
                          )}
                        </div>
                        <div className={styles.thumbnails}>
                          {item.design?.images?.map((image, index) => (
                            <img 
                              key={index}
                              src={image}
                              alt={`${item.design?.title} view ${index + 1}`}
                              className={`${styles.thumbnail} ${selectedImages[itemKey] === index ? styles.activeThumbnail : ''}`}
                              onClick={() => setSelectedImages(prev => ({
                                ...prev,
                                [itemKey]: index
                              }))}
                            />
                          ))}
                        </div>
                      </div>
                      <div className={styles.itemDetails}>
                        <h3 className={styles.itemTitle}>
                          {item.design?.title || `Design #${item.design_id}`}
                          {item.design?.is_soft_deleted && (
                            <span className={styles.designArchivedBadge}>
                              (Archived Design)
                            </span>
                          )}
                        </h3>
                        {item.design?.description && (
                          <p className={styles.designDescription}>{item.design.description}</p>
                        )}
                        <div className={styles.itemMeta}>
                          {item.design?.fabrics && (
                            <p>Fabric: {
                              typeof item.design.fabrics[item.fabric_idx] === 'string' 
                                ? item.design.fabrics[item.fabric_idx]
                                : (item.design.fabrics[item.fabric_idx] as any)?.name || 'Selected fabric'
                            }</p>
                          )}
                          {item.design?.fabrics && item.color_idx !== null && (
                            <div className={styles.colorPill}>
                              <span 
                                className={styles.colorDot} 
                                style={{ 
                                  backgroundColor: typeof item.design.fabrics[item.fabric_idx] === 'object' 
                                    ? (item.design.fabrics[item.fabric_idx] as any)?.colors?.[item.color_idx]?.name?.toLowerCase() || 'gray'
                                    : 'gray'
                                }}
                              />
                              <span>Color: {
                                typeof item.design.fabrics[item.fabric_idx] === 'object' 
                                  ? (item.design.fabrics[item.fabric_idx] as any)?.colors?.[item.color_idx]?.name || 'Selected color'
                                  : 'Selected color'
                              }</span>
                            </div>
                          )}
                          {item.style_type && <p>Style: {item.style_type}</p>}
                          {item.fabric_yards && <p>Fabric Yards: {item.fabric_yards}</p>}
                          {item.tailor_notes && (
                            <div className={styles.tailorNotes}>
                              <h4>Customer Notes:</h4>
                              <p>{item.tailor_notes}</p>
                            </div>
                          )}
                        </div>
                        <div className={styles.itemActions}>
                          {item.measurements && (
                            <button 
                              className={styles.measurementsButton}
                              onClick={() => openMeasurementsModal(item.measurements)}
                            >
                              View Measurements
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Legacy single-item order
                <div className={styles.orderItem}>
                  <div className={styles.itemImageContainer}>
                    <div className={styles.mainImage}>
                      {order.design?.images?.[selectedImages[order.id] || 0] && (
                        <img 
                          src={order.design.images[selectedImages[order.id] || 0]} 
                          alt={order.design.title} 
                          className={styles.designImage}
                        />
                      )}
                    </div>
                    <div className={styles.thumbnails}>
                      {order.design?.images?.map((image, index) => (
                        <img 
                          key={index}
                          src={image}
                          alt={`${order.design?.title} view ${index + 1}`}
                          className={`${styles.thumbnail} ${selectedImages[order.id] === index ? styles.activeThumbnail : ''}`}
                          onClick={() => setSelectedImages(prev => ({
                            ...prev,
                            [order.id]: index
                          }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.itemDetails}>
                    <h3 className={styles.itemTitle}>
                      {order.design?.title || `Design #${order.design_id}`}
                      {order.design?.is_soft_deleted && (
                        <span className={styles.designArchivedBadge}>
                          (Archived Design)
                        </span>
                      )}
                    </h3>
                    {order.design?.description && (
                      <p className={styles.designDescription}>{order.design.description}</p>
                    )}
                    <div className={styles.itemMeta}>
                      {order.fabric_name && <p>Fabric: {order.fabric_name}</p>}
                      {order.color_name && (
                        <div className={styles.colorPill}>
                          <span 
                            className={styles.colorDot} 
                            style={{ backgroundColor: order.color_name.toLowerCase() }} 
                          />
                          <span>Color: {order.color_name}</span>
                        </div>
                      )}
                      {order.style_type && <p>Style: {order.style_type}</p>}
                      {order.fabric_yards && <p>Fabric Yards: {order.fabric_yards}</p>}
                      {order.tailor_notes && (
                        <div className={styles.tailorNotes}>
                          <h4>Customer Notes:</h4>
                          <p>{order.tailor_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      {order.measurements && (
                        <button 
                          className={styles.measurementsButton}
                          onClick={() => openMeasurementsModal(order.measurements)}
                        >
                          View Measurements
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className={styles.noOrders}>
          <div className={styles.noOrdersIcon}>📂</div> {/* Using a folder icon for tailors */}
          <h3 className={styles.noOrdersTitle}>
            {activeTab === 'all' 
              ? "You don\'t have any orders yet"
              : `No ${activeTab.replace(/_/g, ' ')} orders`}
          </h3>
          <p className={styles.noOrdersMessage}>
            {activeTab === 'all'
              ? "When you receive an order, you'll find it here."
              : `Check other tabs to view orders in different states.`}
          </p>
        </div>
      )}

      {isModalOpen && selectedMeasurements && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Measurements</h2>
              <button 
                className={styles.closeButton}
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              {(() => {
                const measurements = typeof selectedMeasurements === 'string' 
                  ? JSON.parse(selectedMeasurements)
                  : selectedMeasurements;

                // Skip these technical fields
                const skipFields = ['id', 'user_id', 'created_at', 'updated_at', 'deleted_at', 'name', 'gender'];
                
                // Define gender-specific measurements
                const maleSpecificFields = [
                  'round_sleeves', 'wrist', 'waist_shirt', 'shirt_length', 'calves', 'agbada_length', 'agbada_width'
                ];
                
                const femaleSpecificFields = [
                  'neck', 'off_shoulder_top', 'underbust', 'top_length', 'bust_length', 'underbust_length', 
                  'nipple_to_nipple', 'upper_waist', 'lower_waist', 'bust', 'ankle_trouser_end'
                ];
                
                // Header section with name and gender
                const headerSection = (
                  <div className={styles.measurementHeader}>
                    <div className={styles.measurementHeaderRow}>
                      <div className={styles.measurementName}>
                        <h3>{measurements.name || 'Customer Measurements'}</h3>
                      </div>
                      <div className={styles.measurementGender}>
                        <span className={`${styles.genderBadge} ${styles[measurements.gender || 'male']}`}>
                          {measurements.gender === 'female' ? '👩 Female' : '👨 Male'}
                        </span>
                      </div>
                    </div>
                  </div>
                );

                
                // Filter measurements based on gender
                const filteredMeasurements = Object.entries(measurements)
                  .filter(([key, value]) => {
                    // Skip technical fields and null/undefined values
                    if (skipFields.includes(key) || value === null || value === undefined || value === '') {
                      return false;
                    }
                    
                    // If no gender specified, show all measurements (legacy data)
                    if (!measurements.gender) {
                      return true;
                    }
                    
                    // For male measurements, exclude female-specific fields
                    if (measurements.gender === 'male' && femaleSpecificFields.includes(key)) {
                      return false;
                    }
                    
                    // For female measurements, exclude male-specific fields  
                    if (measurements.gender === 'female' && maleSpecificFields.includes(key)) {
                      return false;
                    }
                    
                    return true;
                  })
                  .map(([key, value]) => {
                    const label = key
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')
                    const videoUrl = measurementVideoLinks[key]
                    return (
                      <div key={key} className={styles.measurementRow}>
                        <span className={styles.measurementLabel}>
                          {label}:
                        </span>
                        <span className={styles.measurementValue}>
                          {typeof value === 'number' ? `${value} inches` : String(value)}
                          {videoUrl && (
                            <button
                              type="button"
                              className={styles.measurementVideoButton}
                              onClick={() => openMeasurementVideo(label, key)}
                              aria-label={`Play ${label} tutorial`}
                            >
                              <FiPlayCircle aria-hidden="true" />
                            </button>
                          )}
                        </span>
                      </div>
                    )
                  });
                
                return (
                  <>
                    {headerSection}
                    <div className={styles.measurementsList}>
                      {filteredMeasurements.length > 0 ? filteredMeasurements : (
                        <div className={styles.noMeasurements}>
                          <p>No measurements available for this {measurements.gender || 'customer'}.</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {activeVideoGuide && (
        <div
          className={styles.videoOverlay}
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeMeasurementVideo()
            }
          }}
        >
          <div className={styles.videoModal}>
            <div className={styles.videoModalHeader}>
              <h3>{activeVideoGuide.title} Tutorial</h3>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeMeasurementVideo}
                aria-label="Close video tutorial"
              >
                ×
              </button>
            </div>
            <div className={styles.videoModalBody}>
              {renderVideoContent(activeVideoGuide.url, activeVideoGuide.title)}
            </div>
          </div>
        </div>
      )}

      {isRejectionModalOpen && (
        <div className={styles.rejectionModalOverlay} onClick={() => !processingOrderId && setIsRejectionModalOpen(false)}>
          <div className={styles.rejectionModal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Rejection Reason</h2>
              <button 
                className={styles.closeButton}
                onClick={() => !processingOrderId && setIsRejectionModalOpen(false)}
                disabled={processingOrderId === rejectingOrderId}
              >
                ×
              </button>
            </div>
            <div className={styles.modalContent}>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please enter your reason for rejecting the order"
                className={styles.rejectionReasonInput}
                disabled={processingOrderId === rejectingOrderId}
              />
              <button 
                className={styles.submitRejectionButton}
                onClick={submitOrderRejection}
                disabled={processingOrderId === rejectingOrderId || !rejectionReason.trim()}
              >
                {processingOrderId === rejectingOrderId ? 'Submitting...' : 'Submit Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const ensureProfileExists = async (userId: string, email: string, role: 'tailor' | 'customer' | 'both') => {
  try {
    console.log(`Checking if ${role} profile exists for user ${userId}`);
    
    // Check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId);
      
    if (checkError) {
      console.error(`Error checking ${role} profile:`, checkError);
      return null;
    }
    
    // If profile exists, return it
    if (existingProfile && existingProfile.length > 0) {
      console.log(`Profile exists for user ${userId} with role ${existingProfile[0].roles}`);
      
      // If the user has a profile but with a different role, update to 'both'
      if (existingProfile[0].roles !== role && existingProfile[0].roles !== 'both') {
        console.log(`Updating user ${userId} to role 'both'`);
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            roles: 'both', 
            updated_at: new Date().toISOString() 
          })
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating role:', updateError);
        } else {
          // Return the updated profile
          return { ...existingProfile[0], roles: 'both' };
        }
      }
      
      return existingProfile[0];
    }
    
    // Create a new profile
    console.log(`Creating new profile for user ${userId} with role ${role}`);
    // Create profile record using provided email
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert([{
        id: userId,
        email: email,
        firstname: role === 'tailor' ? 'Tailor' : 'Customer',
        lastname: 'User',
        roles: role, // Simple string now
        created_at: new Date().toISOString()
      }])
      .select();
      
    if (createError) {
      console.error(`Error creating ${role} profile:`, createError);
      return null;
    }
    
    console.log(`Profile created successfully for user ${userId} with role ${role}`);
    return newProfile ? newProfile[0] : null;
  } catch (error) {
    console.error('Error in ensureProfileExists:', error);
    return null;
  }
};