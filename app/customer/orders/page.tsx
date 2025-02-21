'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './orders.module.css'
import { useRouter } from 'next/navigation'
import { Order } from '../../lib/types'
import { IoArrowBack } from 'react-icons/io5'


export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

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

  if (isLoading) {
    return <div className={styles.loading}>Loading your orders...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <IoArrowBack size={24} />
          <span>Back</span>
        </button>
        <h1 className={styles.pageTitle}>Your Orders</h1>
      </div>

      {orders.map(order => (
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
            <div className={styles.status}>{order.status}</div>
            {order.status === 'shipped' && (
              <button className={styles.trackButton}>Track package</button>
            )}
          </div>

          <div className={styles.orderItems}>
            <div className={styles.orderItem}>
              {order.design && (
                <div className={styles.itemImageContainer}>
                  <div className={styles.mainImage}>
                    {order.design.images?.[0] && (
                      <img
                        src={order.design.images[0]}
                        alt={order.design.title}
                        className={styles.designImage}
                      />
                    )}
                  </div>
                  <div className={styles.thumbnails}>
                    {order.design.images?.slice(1).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${order.design?.title} view ${index + 2}`}
                        className={styles.thumbnail}
                      />
                    ))}
                  </div>
                </div>
              )}
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
                <div className={styles.itemActions}>
                  <button
                    className={styles.buyAgainButton}
                    onClick={() => handleBuyAgain(order)}
                    disabled={!order.design_id}
                  >
                    Buy it again
                  </button>
                  <button className={styles.writeReviewButton}>
                    Write a product review
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 