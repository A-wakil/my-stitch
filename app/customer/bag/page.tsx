'use client'

import { useBag } from '../../context/BagContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './BagPage.module.css'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'

interface DesignData {
  id: string
  title: string
  images: string[]
}

interface BagItemWithDesign {
  id: string
  design_id: string
  price: number | null
  tailor_notes?: string | null
  design: DesignData | null
}

export default function BagPage() {
  const { bag, items, loading, removeItem, emptyBag, refresh } = useBag()
  const router = useRouter()
  const [shippingAddress, setShippingAddress] = useState({
    street_address: '',
    apartment: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States'
  })
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false)
  const [itemsWithDesigns, setItemsWithDesigns] = useState<BagItemWithDesign[]>([])
  const [loadingDesigns, setLoadingDesigns] = useState(false)
  const [isEmptyBagModalOpen, setIsEmptyBagModalOpen] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)

  useEffect(() => {
    refresh()
  }, [])

  // Fetch design data for each bag item
  useEffect(() => {
    async function fetchDesignData() {
      if (!items || items.length === 0) return
      
      setLoadingDesigns(true)
      try {
        const designPromises = items.map(async (item) => {
          const { data: design, error } = await supabase
            .from('designs')
            .select('id, title, images')
            .eq('id', item.design_id)
            .single()
          
          return {
            ...item,
            design: error ? null : design
          }
        })
        
        const results = await Promise.all(designPromises)
        setItemsWithDesigns(results)
      } catch (error) {
        console.error('Error fetching design data:', error)
        setItemsWithDesigns(items.map(item => ({ ...item, design: null })))
      } finally {
        setLoadingDesigns(false)
      }
    }
    
    fetchDesignData()
  }, [items])

  if (loading) {
    return <div className={styles.container}>Loading your bag...</div>
  }

  if (!bag || items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyBag}>
          <h2>Your bag is empty</h2>
          <p>Start shopping to add items to your bag</p>
          <button className={styles.shopButton} onClick={() => router.push('/')}>
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  const subtotal = items.reduce((sum, it) => {
    return sum + (it.price ?? 0)
  }, 0)

  const handleRemove = async (id: string) => {
    setRemovingItemId(id)
    try {
      await removeItem(id)
    } finally {
      setRemovingItemId(null)
    }
  }

  const handleEmptyBag = async () => {
    setIsEmptyBagModalOpen(true)
  }

  const confirmEmptyBag = async () => {
    setIsEmptyBagModalOpen(false)
    await emptyBag()
  }

  const isShippingComplete = () => {
    return shippingAddress.street_address.trim() && 
           shippingAddress.city.trim() && 
           shippingAddress.state.trim() && 
           shippingAddress.zip_code.trim()
  }

  const handleCheckout = async () => {
    if (!isShippingComplete()) {
      toast.error('Please complete all required shipping address fields')
      return
    }

    try {
      setIsProcessingCheckout(true)
      
      // Prepare structured address object (include apartment if provided)
      const structuredAddress = {
        street_address: shippingAddress.apartment 
          ? `${shippingAddress.street_address}, ${shippingAddress.apartment}` 
          : shippingAddress.street_address,
        city: shippingAddress.city,
        state: shippingAddress.state,
        zip_code: shippingAddress.zip_code,
        country: shippingAddress.country
      }
      
      const res = await fetch('/api/bag/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping_address: structuredAddress
        })
      })
      
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Checkout failed')
        return
      }

      const { checkout_url } = await res.json()
      if (checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = checkout_url
      } else {
        toast.error('Failed to create checkout session')
      }
    } catch (e) {
      console.error('Checkout error', e)
      toast.error('Checkout failed')
    } finally {
      setIsProcessingCheckout(false)
    }
  }

  const handleShippingChange = (field: string, value: string) => {
    setShippingAddress(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Your Bag ({items.length} {items.length === 1 ? 'item' : 'items'})</h2>
        <div className={styles.headerButtons}>
          <button 
            className={styles.emptyBagBtn}
            onClick={handleEmptyBag}
            title="Empty entire bag"
          >
            Empty Bag
          </button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.itemsList}>
          {loadingDesigns ? (
            <div className={styles.loading}>Loading design details...</div>
          ) : (
            itemsWithDesigns.map(item => (
              <div key={item.id} className={styles.itemCard}>
                <div className={styles.itemImages}>
                  {item.design?.images && item.design.images.length > 0 ? (
                    <>
                      <img 
                        src={item.design.images[0]} 
                        alt={item.design?.title || 'Design'}
                        className={styles.itemImage}
                      />
                      {item.design.images.length > 1 && (
                        <div className={styles.additionalImages}>
                          {item.design.images.slice(1, 3).map((img, idx) => (
                            <img 
                              key={idx}
                              src={img} 
                              alt={`${item.design?.title || 'Design'} view ${idx + 2}`}
                              className={styles.thumbnailImage}
                            />
                          ))}
                          {item.design.images.length > 3 && (
                            <div className={styles.moreImages}>
                              +{item.design.images.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.noImage}>No image available</div>
                  )}
                </div>
                
                <div className={styles.itemDetails}>
                  <h3 className={styles.designTitle}>
                    {item.design?.title || 'Custom Design'}
                  </h3>
                  
                  <div className={styles.itemSpecs}>
                    {item.tailor_notes && (
                      <p><strong>Notes:</strong> {item.tailor_notes}</p>
                    )}
                  </div>
                </div>
                
                <div className={styles.itemPrice}>
                  ${(item.price ?? 0).toFixed(2)}
                </div>
                
                <button 
                  onClick={() => handleRemove(item.id)} 
                  className={styles.removeBtn}
                  disabled={removingItemId === item.id}
                >
                  {removingItemId === item.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className={styles.sidebar}>
          <div className={styles.shippingSection}>
            <h3>Shipping Address</h3>
            <div className={styles.addressForm}>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="Street address *"
                  value={shippingAddress.street_address}
                  onChange={(e) => handleShippingChange('street_address', e.target.value)}
                  className={styles.addressInput}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="Apartment, suite, etc."
                  value={shippingAddress.apartment}
                  onChange={(e) => handleShippingChange('apartment', e.target.value)}
                  className={styles.addressInput}
                />
              </div>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="City *"
                  value={shippingAddress.city}
                  onChange={(e) => handleShippingChange('city', e.target.value)}
                  className={styles.addressInput}
                  required
                />
              </div>
              <div className={styles.formRowHalf}>
                <input
                  type="text"
                  placeholder="State *"
                  value={shippingAddress.state}
                  onChange={(e) => handleShippingChange('state', e.target.value)}
                  className={styles.addressInput}
                  required
                />
                <input
                  type="text"
                  placeholder="ZIP code *"
                  value={shippingAddress.zip_code}
                  onChange={(e) => handleShippingChange('zip_code', e.target.value)}
                  className={styles.addressInput}
                  required
                />
              </div>
              <div className={styles.formRow}>
                <select
                  value={shippingAddress.country}
                  onChange={(e) => handleShippingChange('country', e.target.value)}
                  className={styles.addressInput}
                >
                  <option value="United States">United States</option>
                  <option value="Canada">Canada</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Subtotal:</span>
              <span className={styles.subtotalAmount}>${subtotal.toFixed(2)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Shipping:</span>
              <span>FREE</span>
            </div>
            <div className={styles.summaryRow}>
              <span><strong>Total:</strong></span>
              <span className={styles.subtotalAmount}><strong>${subtotal.toFixed(2)}</strong></span>
            </div>
            
            <p className={styles.shippingNote}>
              Free shipping on all orders. Items will be shipped after completion.
            </p>

            <button 
              className={`${styles.checkoutBtn} ${!isShippingComplete() ? styles.checkoutBtnDisabled : ''}`}
              onClick={handleCheckout}
              disabled={!isShippingComplete() || isProcessingCheckout}
            >
              {isProcessingCheckout ? 'Redirecting to Payment...' : 'Proceed to Payment'}
            </button>
            
            <button 
              className={styles.continueLinkBtn}
              onClick={() => router.push('/')}
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </div>

      {/* Empty Bag Confirmation Modal */}
      {isEmptyBagModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Empty Bag?</h2>
            </div>
            <div className={styles.modalBody}>
              <p>Are you sure you want to empty your entire bag? This will remove all {items.length} item{items.length !== 1 ? 's' : ''} and cannot be undone.</p>
            </div>
            <div className={styles.modalButtons}>
              <button onClick={() => setIsEmptyBagModalOpen(false)} className={styles.cancelBtn}>
                Cancel
              </button>
              <button onClick={confirmEmptyBag} className={styles.confirmBtn}>
                Empty Bag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 