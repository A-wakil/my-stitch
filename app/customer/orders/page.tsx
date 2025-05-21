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

          // Handle soft-deleted designs - still show them for existing orders
          if (designData && designData.is_deleted) {
            console.log(`Design ${order.design_id} has been soft-deleted`)
            return { ...order, design: { ...designData, is_soft_deleted: true } }
          }

          return { ...order, design: designData }
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