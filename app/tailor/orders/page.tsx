'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './orders.module.css'
import { Order } from '../../lib/types'
import { useRouter } from 'next/navigation'
import { Spinner } from '../components/ui/spinner'

type OrderStatus = 'all' | 'pending' | 'accepted' | 'in_progress' | 'ready_to_ship' | 'shipped' | 'rejected'

export default function TailorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<OrderStatus>('all')
  const [selectedImages, setSelectedImages] = useState<Record<string, number>>({})  // Track selected image index for each order
  const router = useRouter()

  const fetchOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

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

    setOrders(ordersWithDesigns)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'accepted' && {
          estimated_completion_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
      })
      .eq('id', orderId)

    if (error) {
      console.error('Error updating order:', error)
      return
    }

    // Refresh orders
    fetchOrders()
  }

  const filteredOrders = orders.filter(order => 
    activeTab === 'all' ? true : order.status === activeTab
  )

  const orderCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

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
              </div>
              <div className={styles.orderNumber}>
                <div className={styles.label}>ORDER # {order.id}</div>
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
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}