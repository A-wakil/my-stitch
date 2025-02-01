"use client"

import { useState, useEffect } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { ColorPicker } from "../../components/dashboard/color-picker"
import { FabricPicker } from "../../components/dashboard/fabric-picker"
import { ImageUpload } from "../../components/dashboard/image-upload"
import styles from "./styles/DesignForm.module.css"
import { Color, Fabric } from "../../types/design"

interface DesignFormProps {
  onSubmitSuccess: () => void
  initialData?: {
    id?: string
    title: string
    description: string
    images: string[]
    fabrics: {
      name: string
      image: string
      price: number
      colors: { name: string; image: string }[]
    }[]
  }
}

export function DesignForm({ onSubmitSuccess, initialData }: DesignFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [images, setImages] = useState<File[]>([])
  const [fabrics, setFabrics] = useState<Fabric[]>(
    initialData?.fabrics.map((f) => ({
      name: f.name,
      image: null,
      price: f.price || 0,
      colors: f.colors.map(c => ({ name: c.name, image: null }))
    })) || []
  )

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description)
      setFabrics(initialData.fabrics.map((f) => ({
        name: f.name,
        image: null,
        price: f.price || 0,
        colors: f.colors.map(c => ({ name: c.name, image: null }))
      })))
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    
    // Append images
    images.forEach((image, index) => {
      formData.append(`images`, image) // Changed from images[${index}]
    })
    
    // Convert fabrics array to JSON string and append as a single field
    const fabricsData = fabrics.map(fabric => ({
      name: fabric.name,
      image: null, // Handle image separately
      colors: fabric.colors
    }))
    formData.append('fabrics', JSON.stringify(fabricsData))
    
    // Append fabric images separately if they exist
    fabrics.forEach((fabric, index) => {
      if (fabric.image) {
        formData.append(`fabricImages[${index}]`, fabric.image)
      }
    })

    try {
      const url = initialData?.id ? `/api/designs/${initialData.id}` : "/api/designs"
      const method = initialData?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method: method,
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      onSubmitSuccess()
    } catch (error) {
      console.error("Error submitting design:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <Label htmlFor="title" className={styles.label}>
          Design Title
        </Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={styles.input} />
      </div>
      <div className={styles.formGroup}>
        <Label htmlFor="description" className={styles.label}>
          Description
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={styles.textarea}
        />
      </div>
      <div className={styles.uploadSection}>
        <h3 className={styles.sectionTitle}>Images</h3>
        <ImageUpload 
          images={images} 
          setImages={setImages} 
          initialImages={initialData?.images} 
        />
      </div>
      <div className={styles.fabricSection}>
        <h3 className={styles.sectionTitle}>Fabrics</h3>
        <FabricPicker 
          fabrics={fabrics} 
          setFabrics={setFabrics} 
        />
      </div>
      <Button 
        type="submit" 
        className={styles.submitButton}
      >
        {initialData?.id ? "Update Design" : "Submit Design"}
      </Button>
    </form>
  )
}

