'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { toast } from 'react-hot-toast'

interface Bag {
  id: string
  tailor_id: string
  status: 'open' | 'checked_out'
}

export interface BagItem {
  id: string
  bag_id: string
  design_id: string
  price: number | null
  tailor_notes: string | null
  measurement_id: string | null
}

interface AddItemPayload {
  tailor_id: string
  design_id: string
  price: number
  tailor_notes?: string
  measurement_id?: string
}

interface BagContextType {
  bag: Bag | null
  items: BagItem[]
  loading: boolean
  addItem: (payload: AddItemPayload) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  emptyBag: () => Promise<void>
  refresh: () => Promise<void>
}

const BagContext = createContext<BagContextType | undefined>(undefined)

export function BagProvider({ children }: { children: React.ReactNode }) {
  const [bag, setBag] = useState<Bag | null>(null)
  const [items, setItems] = useState<BagItem[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bag', { method: 'GET' })
      if (!res.ok) {
        if (res.status !== 404) {
          console.error('Failed to fetch bag', await res.json())
        }
        setBag(null)
        setItems([])
      } else {
        const data = await res.json()
        setBag(data.bag)
        setItems(data.items || [])
      }
    } catch (e) {
      console.error('Bag refresh error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addItem = async (payload: AddItemPayload) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in to add items')
        return
      }

      const body = {
        user_id: user.id,
        ...payload
      }

      const res = await fetch('/api/bag/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to add to bag')
        return
      }

      toast.success('Added to bag')
      await refresh()
    } catch (e) {
      console.error('Add item error', e)
      toast.error('Failed to add to bag')
    }
  }

  const removeItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/bag/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to remove item')
        return
      }
      toast.success('Removed from bag')
      setItems(prev => prev.filter(it => it.id !== itemId))
    } catch (e) {
      console.error('Remove item error', e)
      toast.error('Failed to remove item')
    }
  }

  const emptyBag = async () => {
    try {
      const res = await fetch('/api/bag', { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to empty bag')
        return
      }
      toast.success('Bag emptied successfully')
      setBag(null)
      setItems([])
    } catch (e) {
      console.error('Empty bag error', e)
      toast.error('Failed to empty bag')
    }
  }

  return (
    <BagContext.Provider value={{ bag, items, loading, addItem, removeItem, emptyBag, refresh }}>
      {children}
    </BagContext.Provider>
  )
}

export function useBag() {
  const context = useContext(BagContext)
  if (!context) {
    throw new Error('useBag must be used within a BagProvider')
  }
  return context
} 