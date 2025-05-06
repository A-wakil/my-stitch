'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './orders.module.css'
import { Order, Profile } from '../../lib/types'
import { useRouter } from 'next/navigation'
import { Spinner } from '../components/ui/spinner'
import { sendOrderNotification } from '../../lib/notifications'
type OrderStatus = 'all' | 'pending' | 'accepted' | 'in_progress' | 'ready_to_ship' | 'shipped' | 'rejected'

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
        return
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
        (ordersData || []).map(async (order) => {
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
      setIsLoading(false);
    } catch (err) {
      console.error('Error in fetchOrders:', err);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const loadUserAndProfile = async () => {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error fetching auth user:', error)
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
    fetchOrders()
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
    try {
      console.log(`Updating order ${orderId} to status: ${newStatus}`);
      
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        console.error(`Order ${orderId} not found in local state`);
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
      fetchOrders();
    } catch (err) {
      console.error('Error in updateOrderStatus:', err);
    }
  }

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

  if (isLoading) {
    return <Spinner />
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Your Orders</h1>
      </div>

      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Orders ({orders.length})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'pending' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({orderCounts['pending'] || 0})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'accepted' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          Accepted ({orderCounts['accepted'] || 0})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'in_progress' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('in_progress')}
        >
          In Progress ({orderCounts['in_progress'] || 0})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'ready_to_ship' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('ready_to_ship')}
        >
          Ready to Ship ({orderCounts['ready_to_ship'] || 0})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'shipped' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('shipped')}
        >
          Shipped ({orderCounts['shipped'] || 0})
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'rejected' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('rejected')}
        >
          Rejected ({orderCounts['rejected'] || 0})
        </button>
      </div>

      {filteredOrders.map(order => (
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
                  >
                    Accept Order
                  </button>
                  <button 
                    className={styles.rejectButton}
                    onClick={() => updateOrderStatus(order.id, 'rejected')}
                  >
                    Reject Order
                  </button>
                </>
              )}
              
              {order.status === 'accepted' && (
                <button 
                  className={styles.progressButton}
                  onClick={() => updateOrderStatus(order.id, 'in_progress')}
                >
                  Start Production
                </button>
              )}

              {order.status === 'in_progress' && (
                <button 
                  className={styles.readyButton}
                  onClick={() => updateOrderStatus(order.id, 'ready_to_ship')}
                >
                  Mark Ready to Ship
                </button>
              )}

              {order.status === 'ready_to_ship' && (
                <button 
                  className={styles.shipButton}
                  onClick={() => updateOrderStatus(order.id, 'shipped')}
                >
                  Mark as Shipped
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
                </div>
                <div className={styles.customerInfo}>
                  <p>Customer: {clientProfiles[order.user_id]?.firstname} {clientProfiles[order.user_id]?.lastname}</p>
                  <p>Email: {clientProfiles[order.user_id]?.email}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

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