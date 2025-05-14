'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './orders.module.css'
import { Order, Profile } from '../../lib/types'
import { useRouter } from 'next/navigation'
import { Spinner } from '../components/ui/spinner'
import { sendOrderNotification } from '../../lib/notifications'
import { toast } from 'react-hot-toast'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

type OrderStatus = 'all' | 'pending' | 'accepted' | 'in_progress' | 'ready_to_ship' | 'shipped' | 'rejected'

export default function TailorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus>('pending')
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
  const [isMobile, setIsMobile] = useState(false)
  const [isTabsExpanded, setIsTabsExpanded] = useState(false)
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

  const fetchOrders = async () => {
    if (!user) return
    console.log('Current user ID:', user.id)
    // First fetch orders
    try {
      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('tailor_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        setOrders([]);
        setIsLoading(false);
        return;
      }

      if (ordersData.length === 0) {
        console.log('No orders found for tailor ID:', user.id);
        setOrders([]);
        setIsLoading(false);
        return;
      }

      console.log(`Found ${ordersData.length} orders for tailor ID:`, user.id);

      // Then fetch design details for each order that has a design_id
      const ordersWithDesigns = await Promise.all(
        ordersData.map(async (order) => {
          if (!order.design_id) return { ...order, design: null }

          const { data: designData, error: designError } = await supabase
            .from('designs')
            .select('*')
            .eq('id', order.design_id)
            .single()

          if (designError) {
            console.error(`Error fetching design ${order.design_id}:`, designError)
            return { ...order, design: null }
          }

          // Handle soft-deleted designs - ensure we still render them correctly
          if (designData && designData.is_deleted) {
            console.log(`Design ${order.design_id} has been soft-deleted`)
            // Add a flag to indicate this is a deleted design
            return { ...order, design: { ...designData, is_soft_deleted: true } }
          }

          return { ...order, design: designData }
        })
      )

      // Collect unique user IDs from orders
      const userIds = [...new Set(ordersWithDesigns.map(order => order.user_id))];
      console.log('Customer IDs from orders:', userIds);
      
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
          
          const profileMap: Record<string, Profile> = {};
          profiles.forEach(profile => {
            profileMap[profile.id] = profile;
          });
          setClientProfiles(profileMap);
        }
      }

      setOrders(ordersWithDesigns);
    } catch (err) {
      console.error('Error in fetchOrders:', err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }

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
    if(user) {
      fetchOrders()
    }
  }, [user])

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
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('all');
              if (isMobile) setIsTabsExpanded(false);
            }}
          >
            All Orders ({orders.length})
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
                          const address = typeof order.shipping_address === 'string' 
                            ? JSON.parse(order.shipping_address)
                            : order.shipping_address;
                          
                          return [
                            address?.street_address,
                            address?.city
                          ]
                            .filter(Boolean)
                            .join(', ');
                        } catch (e) {
                          return 'Address not available';
                        }
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className={styles.label}>MEASUREMENTS</div>
                    <button 
                      className={styles.measurementsButton}
                      onClick={() => openMeasurementsModal(order.measurements)}
                    >
                      View Measurements
                    </button>
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
                  <button 
                    className={styles.shipButton}
                    onClick={() => updateOrderStatus(order.id, 'shipped')}
                    disabled={processingOrderId === order.id}
                  >
                    {processingOrderId === order.id ? 'Processing...' : 'Mark as Shipped'}
                  </button>
                )}
              </div>
            </div>

            <div className={styles.orderItems}>
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
                    {order.fabric_yards && (
                      <p>Fabric Yards: {order.fabric_yards}</p>
                    )}
                    {order.tailor_notes && (
                      <div className={styles.tailorNotes}>
                        <h4>Customer Notes:</h4>
                        <p>{order.tailor_notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
                const skipFields = ['id', 'user_id', 'created_at', 'updated_at'];
                
                return Object.entries(measurements)
                  .filter(([key]) => !skipFields.includes(key))
                  .map(([key, value]) => (
                    <div key={key} className={styles.measurementRow}>
                      <span className={styles.measurementLabel}>
                        {key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}:
                      </span>
                      <span className={styles.measurementValue}>
                        {typeof value === 'number' ? `${value} inches` : String(value)}
                      </span>
                    </div>
                  ));
              })()}
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