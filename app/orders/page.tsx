'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Order {
    id: string
    title: string
    description: string
    images: string[]
    fabrics: {
      name: string
      image: string
      price: number
      colors: { name: string; image: string }
    }
    created_by: string
    status: string
    total_amount: number
  }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    async function fetchOrders() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            design:designs(*)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        return
      }

      setOrders(data)
    }

    fetchOrders()
  }, [])

  return (
    <div>
      <h1>My Orders</h1>
      {orders.map(order => (
        <div key={order.id}>
          <h2>Order #{order.id}</h2>
          <p>Status: {order.status}</p>
          <p>Total: ${order.total_amount}</p>
          {/* Display order items */}
        </div>
      ))}
    </div>
  )
} 