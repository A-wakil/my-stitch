"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import styles from "./styles/DesignGrid.module.css"
import { Spinner } from "../../components/ui/spinner"
import { ConfirmationModal } from "../../components/ui/confirmation-modal"
import { supabase } from "../../../lib/supabaseClient"
import { useCurrency } from '../../../context/CurrencyContext'

interface Design {
  id: string
  title: string
  images: string[]
  fabrics: {
    name: string
    image: string
    yardPrice?: number
    stitchPrice?: number
    colors: { name: string; image: string }[]
  }[]
}

export function DesignGrid() {
  const { formatAmount, convertToPreferred } = useCurrency()
  const [designs, setDesigns] = useState<Design[] | null>(null)
  const [formattedPrices, setFormattedPrices] = useState<Record<string, { yardPrice: string, stitchPrice: string }>>({})
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [designToDelete, setDesignToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dataLoaded, setDataLoaded] = useState(false)
  const router = useRouter()

  const fetchDesigns = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        console.error("No authenticated user found")
        setIsLoading(false)
        return
      }

      // Fetch only designs created by the current tailor
      const response = await fetch(`/api/designs?created_by=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setDesigns(data)
        setDataLoaded(true)
      } else {
        console.error("Failed to fetch designs")
      }
    } catch (error) {
      console.error("Error fetching designs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Prevent re-running if data is already loaded
    if (dataLoaded) {
      return;
    }
    
    fetchDesigns()
  }, [fetchDesigns, dataLoaded])

  useEffect(() => {
    if (typeof window !== 'undefined' && designs) {
      const hash = window.location.hash.slice(1)
      if (hash) {
        const element = document.getElementById(hash)
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth' })
            element.style.backgroundColor = '#fef9c3'
            setTimeout(() => {
              element.style.transition = 'background-color 0.5s ease'
              element.style.backgroundColor = ''
            }, 1500)
          }, 100)
        }
      }
    }
  }, [designs])

  useEffect(() => {
    async function updatePrices() {
      if (!designs) return
      
      const newPrices: Record<string, { yardPrice: string, stitchPrice: string }> = {}
      
      for (const design of designs) {
        if (design.fabrics && design.fabrics.length > 0) {
          for (const [index, fabric] of design.fabrics.entries()) {
            const yardPrice = fabric.yardPrice || 0
            const stitchPrice = fabric.stitchPrice || 0
            
            const convertedYardPrice = await convertToPreferred(yardPrice, 'USD')
            const convertedStitchPrice = await convertToPreferred(stitchPrice, 'USD')
            
            newPrices[`${design.id}-${index}`] = {
              yardPrice: formatAmount(convertedYardPrice),
              stitchPrice: formatAmount(convertedStitchPrice)
            }
          }
        }
      }
      
      setFormattedPrices(newPrices)
    }
    
    updatePrices()
  }, [designs, convertToPreferred, formatAmount])

  const handleEdit = (id: string) => {
    router.push(`/tailor/designs/${id}/edit`)
  }

  const openDeleteModal = (id: string) => {
    setDesignToDelete(id)
    setIsDeleteModalOpen(true)
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDesignToDelete(null)
  }

  const confirmDelete = async () => {
    if (!designToDelete) return
    
    setIsDeleting(true)
    try {
      // Always use soft delete - mark as deleted but keep in database
      const response = await fetch(`/api/designs/${designToDelete}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_deleted: true }),
      })
      
      if (response.ok) {
        // Remove the deleted design from the UI
        if (designs) {
          setDesigns(designs.filter((design) => design.id !== designToDelete))
        }
        console.log("Design successfully marked as deleted")
      } else {
        const errorData = await response.json()
        console.error("Failed to delete design:", errorData)
      }
    } catch (error) {
      console.error("Error deleting design:", error)
    } finally {
      setIsDeleting(false)
      closeDeleteModal()
    }
  }

  const getCurrentImageIndex = (designId: string) => {
    return imageIndices[designId] || 0
  }

  const updateImageIndex = (designId: string, newIndex: number, maxLength: number) => {
    setImageIndices(prev => ({
      ...prev,
      [designId]: (newIndex + maxLength) % maxLength
    }))
  }

  if (isLoading || !designs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${styles.activeTab}`}>
          All Designs ({designs.length})
        </button>
      </div>

      <div className={styles.designsContainer}>
        {designs.length === 0 ? (
          <div className={styles['empty-state']}>
            <div className={styles['empty-state-content']}>
              <h2 className={styles['empty-state-title']}>No designs yet</h2>
              <p className={styles['empty-state-message']}>
                You haven&apos;t uploaded any designs. Start creating your first design!
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.grid}>
            {designs?.map((design) => {
              const currentIndex = getCurrentImageIndex(design.id)
              
              return (
                <div 
                  key={design.id}
                  id={design.id}
                  className={styles['card-content']}
                >
                  <div className={styles['carousel-container']}>
                    <div className={styles.mainImage}>
                      <img 
                        src={design.images?.[currentIndex] || "/placeholder.svg"} 
                        alt={`${design.title} - Image ${currentIndex + 1}`} 
                        className={styles.designImage} 
                      />
                    </div>
                    <div className={styles.thumbnails}>
                      {design.images?.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${design.title} view ${index + 1}`}
                          className={`${styles.thumbnail} ${currentIndex === index ? styles.activeThumbnail : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageIndices(prev => ({
                              ...prev,
                              [design.id]: index
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <h3 className={styles['card-title']}>{design.title}</h3>
                  
                  {/* Compact pricing display */}
                  {design.fabrics && design.fabrics.length > 0 && 
                    (design.fabrics.length === 1 || 
                     (design.fabrics.length > 0 && design.fabrics.every(f => f.name === "Custom"))) && (
                    <div className={styles['compact-pricing']}>
                      <div className={styles['price-tag']}>
                        <span>Yard Price: {formattedPrices[`${design.id}-0`]?.yardPrice}</span>
                        <span className={styles['price-divider']}>|</span>
                        <span>Stitching: {formattedPrices[`${design.id}-0`]?.stitchPrice}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Only render fabric section if there are real fabric options (not just placeholder) */}
                  {design.fabrics && design.fabrics.some(fabric => 
                    fabric.name !== "Custom" && fabric.image && fabric.colors && fabric.colors.length > 0
                  ) && (
                    <div className={styles['fabric-container']}>
                      {design.fabrics
                        .filter(fabric => fabric.name !== "Custom" || (fabric.image && fabric.colors && fabric.colors.length > 0))
                        .map((fabric, fabricIndex) => (
                          <div key={fabricIndex} className={styles['fabric-item']}>
                            <div className={styles['fabric-header']}>
                              <img 
                                src={fabric.image || "/placeholder.svg"}
                                alt={`${fabric.name} fabric`}
                                className={styles['fabric-image']}
                              />
                              <span className={styles['fabric-name']}>{fabric.name}</span>
                            </div>
                            
                            {/* Add pricing under each fabric when there are multiple fabrics */}
                            {design.fabrics && design.fabrics.length > 1 && (
                              <div className={styles['fabric-pricing']}>
                                <span>Yard: {formattedPrices[`${design.id}-${fabricIndex}`]?.yardPrice}</span>
                                <span className={styles['price-divider']}>|</span>
                                <span>Stitching: {formattedPrices[`${design.id}-${fabricIndex}`]?.stitchPrice}</span>
                              </div>
                            )}
                            
                            <div className={styles['color-list']}>
                              {fabric.colors?.map((color, colorIndex) => (
                                <div key={colorIndex} className={styles['color-item']}>
                                  <div 
                                    className={styles['color-swatch']} 
                                    style={{ backgroundColor: color.name }}
                                  />
                                  <span className={styles['color-name']}>{color.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  <div className={styles['card-footer']}>
                    <button 
                      className={styles['edit-button']}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(design.id);
                      }}
                    >
                      <Pencil size={20} />
                      Edit
                    </button>
                    <button 
                      className={styles['delete-button']}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(design.id);
                      }}
                    >
                      <Trash2 size={20} />
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Delete Design"
        message="Are you sure you want to delete this design? This action cannot be undone."
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
        isProcessing={isDeleting}
      />
    </div>
  )
}

