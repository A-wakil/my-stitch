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
  colors: { name: string; image: string }[]
  fabrics: { name: string; image: string }[]
}

export function DesignGrid() {
  const [designs, setDesigns] = useState<Design[]>([])
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
    router.push(`/dashboard/designs/${id}/edit`)
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
      <div className={styles.grid}>
        {designs.map((design) => (
          <div key={design.id} className={styles['card-content']}>
            <img 
              src={design.images[0] || "/placeholder.svg"} 
              alt={design.title} 
              className={styles['card-image']} 
            />
            <h3 className={styles['card-title']}>{design.title}</h3>
            <div className={styles['color-container']}>
              {design.colors.map((color, index) => (
                <div key={index} className={styles['color-item']}>
                  <div 
                    className={styles['color-swatch']} 
                    style={{ backgroundColor: color.name }}
                  ></div>
                  <span className={styles['color-name']}>{color.name}</span>
                </div>
              ))}
            </div>
            <div className={styles['fabric-container']}>
              {design.fabrics.map((fabric, index) => (
                <span key={index} className={styles['fabric-item']}>
                  {fabric.name}
                </span>
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
    </>
  )
}

