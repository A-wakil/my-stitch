"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import styles from "./styles/DesignGrid.module.css"
import { Spinner } from "../../components/ui/spinner"

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
  const [designs, setDesigns] = useState<Design[] | null>(null)
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDesigns()
  }, [])

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

  const fetchDesigns = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/designs")
      if (response.ok) {
        const data = await response.json()
        setDesigns(data)
      } else {
        console.error("Failed to fetch designs")
      }
    } catch (error) {
      console.error("Error fetching designs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (id: string) => {
    router.push(`/tailor/designs/${id}/edit`)
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this design?")) {
      try {
        const response = await fetch(`/api/designs/${id}`, {
          method: "DELETE",
        })
        if (response.ok) {
          if (designs) {
            setDesigns(designs.filter((design) => design.id !== id))
          }
        } else {
          console.error("Failed to delete design")
        }
      } catch (error) {
        console.error("Error deleting design:", error)
      }
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
                        <span>Yard Price: ${design.fabrics[0].yardPrice?.toFixed(2)}</span>
                        <span className={styles['price-divider']}>|</span>
                        <span>Stitching: ${design.fabrics[0].stitchPrice?.toFixed(2)}</span>
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
                                <span>Yard: ${fabric.yardPrice?.toFixed(2)}</span>
                                <span className={styles['price-divider']}>|</span>
                                <span>Stitching: ${fabric.stitchPrice?.toFixed(2)}</span>
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
                        handleDelete(design.id);
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
    </div>
  )
}

