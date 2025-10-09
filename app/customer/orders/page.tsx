'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './Orders.module.css'
import { useRouter } from 'next/navigation'
import { Order } from '../../lib/types'
import { IoArrowBack } from 'react-icons/io5'
import { RatingModal } from '../../components/ui/RatingModal'
import { toast } from 'react-hot-toast'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

type OrderStatus = 'all' | 'pending' | 'accepted' | 'in_progress' | 'ready_to_ship' | 'shipped' | 'cancelled' | 'rejected'

// Function to calculate delivery date range based on completion time
const calculateDeliveryDates = (completionTime: number | null | undefined) => {
  if (!completionTime) return null;
  
  const today = new Date();
  // Create new date objects to avoid mutation
  const minWeeks = completionTime + 2; // completion time + 2 weeks min shipping
  const maxWeeks = completionTime + 3; // completion time + 3 weeks max shipping
  
  // Important: Create a new Date object for each calculation
  const earliestDate = new Date(today);
  earliestDate.setDate(today.getDate() + (minWeeks * 7));
  
  const latestDate = new Date(today);
  latestDate.setDate(today.getDate() + (maxWeeks * 7));
  
  return {
    earliest: earliestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    latest: latestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  };
};

// Function to calculate delivery range from estimated completion date
const calculateDeliveryRangeFromEstimatedDate = (estimatedCompletionDate: string | null) => {
  if (!estimatedCompletionDate) return null;
  
  try {
    // Parse the estimated completion date (earliest date)
    const earliestDate = new Date(estimatedCompletionDate);
    
    // Latest date is 1 week after earliest date
    const latestDate = new Date(estimatedCompletionDate);
    latestDate.setDate(latestDate.getDate() + 7);
    
    return {
      earliest: earliestDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      latest: latestDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    };
  } catch (error) {
    console.error('Error parsing estimated completion date:', error);
    return null;
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus>('pending')
  const [selectedImages, setSelectedImages] = useState<Record<string, number>>({})
  const [isMobile, setIsMobile] = useState(false)
  const [isTabsExpanded, setIsTabsExpanded] = useState(false)
  const router = useRouter()
  const tabsRef = useRef<HTMLDivElement>(null)
  
  // Add state for rating modal
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)
  const [ratingOrderId, setRatingOrderId] = useState<string | null>(null)
  const [ratingTailorId, setRatingTailorId] = useState<string | null>(null)

  // Check if screen is mobile size
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Initial check
    checkIsMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Scroll active tab into view
  useEffect(() => {
    if (tabsRef.current) {
      const activeTabElement = tabsRef.current.querySelector(`.${styles.activeTab}`);
      if (activeTabElement) {
        activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // First fetch orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        return
      }

      // Then fetch design details and order items for each order
      const ordersWithDesigns = await Promise.all(
        (ordersData || []).map(async (order) => {
          // First check if this order has order_items (new multi-item system)
          const { data: orderItems, error: orderItemsError } = await supabase
            .from('order_items')
            .select('id, design_id, price, tailor_notes, measurement_id, created_at')
            .eq('order_id', order.id)

          if (orderItemsError) {
            console.error(`Error fetching order items for order ${order.id}:`, orderItemsError)
          }

          console.log(`Order ${order.id} has ${orderItems?.length || 0} items:`, orderItems)

          if (orderItems && orderItems.length > 0) {
            // New multi-item order - fetch designs for each item
            const itemsWithDesigns = await Promise.all(
              orderItems.map(async (item) => {
                const { data: designData, error: designError } = await supabase
                  .from('designs')
                  .select('*')
                  .eq('id', item.design_id)
                  .single()

                if (designError) {
                  console.error(`Error fetching design ${item.design_id}:`, designError)
                  return { ...item, design: null }
                }

                // Handle soft-deleted designs
                if (designData && designData.is_deleted) {
                  return { ...item, design: { ...designData, is_soft_deleted: true } }
                }

                return { ...item, design: designData }
              })
            )

            return { ...order, orderItems: itemsWithDesigns, design: null }
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
              return { ...order, design: { ...designData, is_soft_deleted: true }, orderItems: [] }
            }

            return { ...order, design: designData, orderItems: [] }
          }
        })
      )

      setOrders(ordersWithDesigns)
      setIsLoading(false)
    }

    fetchOrders()
  }, [])

  const handleBuyAgain = (order: Order) => {
    if (!order.design_id) return;

    // Redirect to the design page with pre-selected options
    router.push(`/customer/designs/${order.design_id}?`)
  }

  const handleOpenRatingModal = (orderId: string, tailorId: string) => {
    setRatingOrderId(orderId);
    setRatingTailorId(tailorId);
    setIsRatingModalOpen(true);
  };

  const filteredOrders = orders.filter(order => 
    activeTab === 'all' ? true : 
    activeTab === 'accepted' ? (order.status === 'accepted' || order.status === 'in_progress') :
    order.status === activeTab
  )

  const orderCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const toggleTabs = () => {
    setIsTabsExpanded(!isTabsExpanded);
  };

  // Simplified tab display for mobile view
  const getTabLabel = (status: OrderStatus) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'In Production';
      case 'ready_to_ship': return 'Ready to Ship';
      case 'shipped': return 'Shipped';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      case 'all': return 'All Orders';
      default: return status.replace(/_/g, ' ');
    }
  };

  // Get the count for a tab
  const getTabCount = (status: OrderStatus) => {
    if (status === 'accepted') {
      return (orderCounts['accepted'] || 0) + (orderCounts['in_progress'] || 0);
    }
    return orderCounts[status] || 0;
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading your orders...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <button onClick={() => router.push('/')} className={styles.backButton} aria-label="Go back">
          <IoArrowBack size={24} />
          <span>Back</span>
        </button>
        <h1 className={styles.pageTitle}>Your Orders</h1>
      </div>

      {isMobile && (
        <div className={styles.mobileTabSelector} onClick={toggleTabs}>
          <span>{getTabLabel(activeTab)} ({getTabCount(activeTab)})</span>
          {isTabsExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      )}

      <div className={styles.tabsContainer}>
        <div ref={tabsRef} className={`${styles.tabs} ${isMobile && !isTabsExpanded ? styles.tabsCollapsed : ''}`}>
          <button 
            className={`${styles.tab} ${activeTab === 'pending' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('pending');
              if (isMobile) setIsTabsExpanded(false);
            }}
            aria-pressed={activeTab === 'pending'}
          >
            Pending ({orderCounts['pending'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'accepted' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('accepted');
              if (isMobile) setIsTabsExpanded(false);
            }}
            aria-pressed={activeTab === 'accepted'}
          >
            In Production ({(orderCounts['accepted'] || 0) + (orderCounts['in_progress'] || 0)})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'ready_to_ship' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('ready_to_ship');
              if (isMobile) setIsTabsExpanded(false);
            }}
            aria-pressed={activeTab === 'ready_to_ship'}
          >
            Ready to Ship ({orderCounts['ready_to_ship'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'shipped' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('shipped');
              if (isMobile) setIsTabsExpanded(false);
            }}
            aria-pressed={activeTab === 'shipped'}
          >
            Shipped ({orderCounts['shipped'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'rejected' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('rejected');
              if (isMobile) setIsTabsExpanded(false);
            }}
            aria-pressed={activeTab === 'rejected'}
          >
            Rejected ({orderCounts['rejected'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'cancelled' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('cancelled');
              if (isMobile) setIsTabsExpanded(false);
            }}
            aria-pressed={activeTab === 'cancelled'}
          >
            Cancelled ({orderCounts['cancelled'] || 0})
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
            onClick={() => {
              setActiveTab('all');
              if (isMobile) setIsTabsExpanded(false);
            }}
            aria-pressed={activeTab === 'all'}
          >
            All Orders ({orders.length})
          </button>
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        filteredOrders.map(order => (
          <div key={order.id} className={styles.orderCard}>
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
                    <div className={styles.label}>SHIP TO</div>
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
                  <div className={styles.label}>ORDER # {order.id}</div>
                  <div className={styles.orderActions}>
                    <a href={`/orders/${order.id}`} className={styles.link}>View order details</a>
                    <span className={styles.separator}>|</span>
                    <a href={`/orders/${order.id}/invoice`} className={styles.link}>View invoice</a>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.orderStatus}>
              <div className={styles.status} data-status={order.status}>{order.status.replace(/_/g, ' ')}</div>
              {order.status === 'shipped' && (
                <button className={styles.trackButton}>Track package</button>
              )}
              {order.status === 'rejected' && order.rejection_reason && (
                <div className={styles.rejectionReason}>
                  <p className={styles.rejectionTitle}>Rejection Reason:</p>
                  <p className={styles.rejectionMessage}>{order.rejection_reason}</p>
                </div>
              )}
              {/* Add estimated delivery date range for orders in appropriate statuses */}
              {['pending', 'accepted', 'in_progress', 'ready_to_ship'].includes(order.status) && (
                <div className={styles.estimatedDelivery}>
                  {(() => {
                    // First try to use the stored estimated_completion_date
                    if (order.estimated_completion_date) {
                      const deliveryDates = calculateDeliveryRangeFromEstimatedDate(order.estimated_completion_date);
                      return deliveryDates ? (
                        <p>Arriving between {deliveryDates.earliest} - {deliveryDates.latest}</p>
                      ) : null;
                    } 
                    // Fall back to calculating from design completion_time
                    else if (order.design?.completion_time) {
                      const deliveryDates = calculateDeliveryDates(order.design.completion_time);
                      return deliveryDates ? (
                        <p>Arriving between {deliveryDates.earliest} - {deliveryDates.latest}</p>
                      ) : null;
                    }
                    
                    return null;
                  })()}
                </div>
              )}
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
                          {item.design?.title || (item.design_id ? `Design #${item.design_id}` : 'Design Unavailable')}
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
                          <p>Price: ${(item.price ?? 0).toFixed(2)}</p>
                          {order.style_type && <p>Style: {order.style_type}</p>}
                          {order.fabric_yards && <p>Fabric Yards: {order.fabric_yards}</p>}
                          {item.tailor_notes && (
                            <div className={styles.tailorNotes}>
                              <h4>Notes:</h4>
                              <p>{item.tailor_notes}</p>
                            </div>
                          )}
                        </div>
                        <div className={styles.itemActions}>
                          <button
                            className={styles.buyAgainButton}
                            onClick={() => handleBuyAgain({ ...order, design_id: item.design_id })}
                            disabled={!item.design_id}
                          >
                            Buy it again
                          </button>
                          <div className={styles.itemPrice}>${(item.price ?? 0).toFixed(2)}</div>
                          {(order.status === 'shipped' || order.status === 'delivered') && (
                            <button
                              className={styles.rateButton}
                              onClick={() => handleOpenRatingModal(order.id, order.tailor_id)}
                            >
                              Rate this order
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
                          <h4>Notes:</h4>
                          <p>{order.tailor_notes}</p>
                        </div>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        className={styles.buyAgainButton}
                        onClick={() => handleBuyAgain(order)}
                        disabled={!order.design_id}
                      >
                        Buy it again
                      </button>
                      {(order.status === 'shipped' || order.status === 'delivered') && (
                        <button
                          className={styles.rateButton}
                          onClick={() => handleOpenRatingModal(order.id, order.tailor_id)}
                        >
                          Rate this order
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
          <div className={styles.noOrdersIcon}>📦</div>
          <h3 className={styles.noOrdersTitle}>
            {activeTab === 'all' 
              ? "You haven't placed any orders yet"
              : `No ${activeTab.replace(/_/g, ' ')} orders`}
          </h3>
          <p className={styles.noOrdersMessage}>
            {activeTab === 'all'
              ? "When you place an order, you'll find it here"
              : `Check other tabs to view orders in different states`}
          </p>
        </div>
      )}

      {isRatingModalOpen && ratingOrderId && ratingTailorId && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          orderId={ratingOrderId}
          tailorId={ratingTailorId}
          onSuccess={() => {
            toast.success('Thank you for your rating!');
            setIsRatingModalOpen(false);
          }}
        />
      )}
    </div>
  )
} 