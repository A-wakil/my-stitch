'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import styles from './DesignDetail.module.css'
import { useRouter } from 'next/navigation'

interface DesignDetail {
  id: string
  title: string
  description: string
  images: string[]
  fabrics: Array<{
    name: string
    image: string
    price: number
    colors: Array<{ name: string; image: string }>
  }>
  created_by: string
}

export default function DesignDetail({ params }: { params: { id: string } }) {
  const [design, setDesign] = useState<DesignDetail | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedFabric, setSelectedFabric] = useState(0)
  const [selectedColor, setSelectedColor] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const id = params.id

  useEffect(() => {
    async function fetchDesign() {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching design:', error)
        return
      }

      setDesign(data)
    }

    fetchDesign()
  }, [id])

  const handleAddToCart = async () => {
    setLoading(true)
    try {
      if (!design) {
        throw new Error('Design not found')
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Create a new order with tailor_id
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          tailor_id: design.created_by,
          status: 'pending',
          total_amount: design.fabrics[selectedFabric].price,
          shipping_address: null
        })
        .select()
        .single()

      if (orderError) throw orderError


      // Show success message or redirect to cart
      alert('Added to cart successfully!')
    } catch (error) {
      console.error('Error adding to cart:', error)
      if (error instanceof Error && error.message === 'Design not found') {
        alert('Sorry, this design could not be found')
      } else {
        alert('Failed to add to cart')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!design) {
    return <div>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.productGrid}>
        {/* Left side - Image gallery */}
        <div className={styles.imageSection}>
          <div className={styles.mainImage}>
            <img 
              src={design.images[selectedImage]} 
              alt={design.title}
              className={styles.primaryImage}
            />
          </div>
          <div className={styles.thumbnails}>
            {design.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${design.title} view ${index + 1}`}
                className={`${styles.thumbnail} ${selectedImage === index ? styles.selected : ''}`}
                onClick={() => setSelectedImage(index)}
              />
            ))}
          </div>
        </div>

        {/* Right side - Product details */}
        <div className={styles.detailsSection}>
          <h1 className={styles.title}>{design.title}</h1>
          <p className={styles.price}>${design.fabrics[selectedFabric].price.toFixed(2)}</p>

          <div className={styles.fabricSelection}>
            <h3>Fabrics</h3>
            <div className={styles.fabricOptions}>
              {design.fabrics.map((fabric, index) => (
                <div
                  key={index}
                  className={`${styles.fabricOption} ${selectedFabric === index ? styles.selectedFabric : ''}`}
                  onClick={() => {
                    setSelectedFabric(index);
                    setSelectedColor(0);
                  }}
                >
                  <img src={fabric.image} alt={fabric.name} />
                  <span>{fabric.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.colorSelection}>
            <h3>Colors</h3>
            <div className={styles.colorOptions}>
              {design.fabrics[selectedFabric].colors.map((color, index) => (
                <div
                  key={index}
                  className={styles.colorOption}
                  onClick={() => setSelectedColor(index)}
                >
                  <div 
                    className={`${styles.colorPill} ${selectedColor === index ? styles.selectedColor : ''}`}
                    style={{ backgroundColor: color.name }}
                    title={color.name}
                  />
                </div>
              ))}
            </div>
          </div>

          <button 
            className={styles.addToCartButton}
            onClick={handleAddToCart}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Place Order'}
          </button>

          <div className={styles.description}>
            <h3>Description</h3>
            <p>{design.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
} 