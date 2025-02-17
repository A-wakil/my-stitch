'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import styles from './orders.module.css'

interface OrderItem {
  id: string
  fabric_id: string
  color_id: string
  design: {
    title: string
    images: string[]
  }
}

interface Order {
  id: string
  status: string
  total_amount: number
  created_at: string
  estimated_completion_date?: string
  customer: {
    full_name: string
    email: string
  } | null
  order_items: OrderItem[]
}

export default function TailorOrdersDashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTailorOrders()
  }, [])

  const fetchTailorOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        customer:users!user_id(email, full_name),
        order_items (
          *,
          design:designs(*)
        )
      `)
      .eq('tailor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders:', error.message)
      return
    }

    setOrders(data || [])
    setLoading(false)
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'accepted' && {
          estimated_completion_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
        })
      })
      .eq('id', orderId)

    if (error) {
      console.error('Error updating order:', error)
      return
    }

    // Refresh orders
    fetchTailorOrders()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className={styles.dashboard}>
      <h1>Order Management</h1>
      
      <div className={styles.ordersList}>
        {orders.map(order => (
          <div key={order.id} className={styles.orderCard}>
            <div className={styles.orderHeader}>
              <h3>Order #{order.id}</h3>
              <span className={styles.status}>{order.status}</span>
            </div>

            <div className={styles.orderDetails}>
              <p>Customer: {order.customer?.full_name || 'Unknown'}</p>
              <p>Total: ${order.total_amount}</p>
              <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
              
              {order.estimated_completion_date && (
                <p>Estimated Completion: {new Date(order.estimated_completion_date).toLocaleDateString()}</p>
              )}
            </div>

            <div className={styles.orderItems}>
              {order.order_items.map(item => (
                <div key={item.id} className={styles.orderItem}>
                  <img src={item.design.images[0]} alt={item.design.title} />
                  <div>
                    <h4>{item.design.title}</h4>
                    <p>Fabric: {item.fabric_id}</p>
                    <p>Color: {item.color_id}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              {order.status === 'pending' && (
                <>
                  <button onClick={() => updateOrderStatus(order.id, 'accepted')}>
                    Accept Order
                  </button>
                  <button onClick={() => updateOrderStatus(order.id, 'rejected')}>
                    Reject Order
                  </button>
                </>
              )}
              
              {order.status === 'accepted' && (
                <button onClick={() => updateOrderStatus(order.id, 'in_progress')}>
                  Start Production
                </button>
              )}

              {order.status === 'in_progress' && (
                <button onClick={() => updateOrderStatus(order.id, 'ready_to_ship')}>
                  Mark Ready to Ship
                </button>
              )}

              {order.status === 'ready_to_ship' && (
                <button onClick={() => updateOrderStatus(order.id, 'shipped')}>
                  Mark as Shipped
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}