"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import styles from "./styles/DesignGrid.module.css"

interface Design {
  id: string
  title: string
  images: string[]
  fabrics: {
    name: string
    image: string
    colors: { name: string; image: string }[]
  }[]
}

export function DesignGrid() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetchDesigns()
  }, [])

  const fetchDesigns = async () => {
    try {
      const response = await fetch("/api/designs")
      if (response.ok) {
        const data = await response.json()
        setDesigns(data)
      } else {
        console.error("Failed to fetch designs")
      }
    } catch (error) {
      console.error("Error fetching designs:", error)
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
          setDesigns(designs.filter((design) => design.id !== id))
        } else {
          console.error("Failed to delete design")
        }
      } catch (error) {
        console.error("Error deleting design:", error)
      }
    }
  }

  return (
    <>
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
          {designs?.map((design) => (
            <div key={design.id} className={styles['card-content']}>
              <div className={styles['carousel-container']}>
                <img 
                  src={design.images?.[currentImageIndex] || "/placeholder.svg"} 
                  alt={`${design.title} - Image ${currentImageIndex + 1}`} 
                  className={styles['card-image']} 
                />
                {design.images?.length > 1 && (
                  <div className={styles['carousel-controls']}>
                    <button
                      className={styles['carousel-button']}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => 
                          prev === 0 ? design.images.length - 1 : prev - 1
                        );
                      }}
                    >
                      ←
                    </button>
                    <span className={styles['carousel-indicator']}>
                      {currentImageIndex + 1} / {design.images.length}
                    </span>
                    <button
                      className={styles['carousel-button']}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex((prev) => 
                          prev === design.images.length - 1 ? 0 : prev + 1
                        );
                      }}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
              <h3 className={styles['card-title']}>{design.title}</h3>
              <div className={styles['fabric-container']}>
                {design.fabrics?.map((fabric, fabricIndex) => (
                  <div key={fabricIndex} className={styles['fabric-item']}>
                    <div className={styles['fabric-header']}>
                      <img 
                        src={fabric.image || "/placeholder.svg"}
                        alt={`${fabric.name} fabric`}
                        className={styles['fabric-image']}
                      />
                      <span className={styles['fabric-name']}>{fabric.name}</span>
                    </div>
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
                ))}
              </div>
              <div className={styles['card-footer']}>
                <button 
                  className={styles['edit-button']}
                  onClick={() => handleEdit(design.id)}
                >
                  <Pencil size={20} />
                  Edit
                </button>
                <button 
                  className={styles['delete-button']}
                  onClick={() => handleDelete(design.id)}
                >
                  <Trash2 size={20} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

