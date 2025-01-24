"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import styles from "@/styles/DesignGrid.module.css"

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
    <div className={styles.grid}>
      {designs.map((design) => (
        <Card key={design.id}>
          <CardContent className={styles.cardContent}>
            <img src={design.images[0] || "/placeholder.svg"} alt={design.title} className={styles.cardImage} />
            <h3 className={styles.cardTitle}>{design.title}</h3>
            <div className={styles.colorContainer}>
              {design.colors.map((color, index) => (
                <div key={index} className={styles.colorItem}>
                  <div className={styles.colorSwatch} style={{ backgroundColor: color.name }}></div>
                  <span>{color.name}</span>
                </div>
              ))}
            </div>
            <div className={styles.fabricContainer}>
              {design.fabrics.map((fabric, index) => (
                <span key={index} className={styles.fabricItem}>
                  {fabric.name}
                </span>
              ))}
            </div>
          </CardContent>
          <CardFooter className={styles.cardFooter}>
            <Button variant="outline" onClick={() => handleEdit(design.id)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(design.id)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}

