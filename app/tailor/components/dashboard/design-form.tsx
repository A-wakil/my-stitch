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
import { Fabric } from "../../types/design"
import { supabase } from "../../../lib/supabaseClient"
import { toast } from "react-hot-toast"

interface DesignFormProps {
  onSubmitSuccess: () => void
  initialData?: {
    id?: string
    title: string
    description: string
    images: string[]
    fabrics: Array<Fabric>
  }
}

export function DesignForm({ onSubmitSuccess, initialData }: DesignFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])
  const [fabrics, setFabrics] = useState<Fabric[]>(
    initialData?.fabrics.map((f) => ({
      name: f.name,
      image: f.image,
      yardPrice: f.yardPrice || 0,
      stitchPrice: f.stitchPrice || 0,
      colors: f.colors.map(c => ({ name: c.name, image: c.image }))
    })) || []
  )

  useEffect(() => {
    if (initialData) {
      console.log('Initial fabrics data:', initialData.fabrics)
      setTitle(initialData.title)
      setDescription(initialData.description)
      setExistingImages(initialData.images || [])
      setFabrics(initialData.fabrics.map((f) => {
        console.log('Processing fabric:', f.name, 'Image:', f.image)
        return {
          name: f.name,
          image: f.image,
          yardPrice: f.yardPrice || 0,
          stitchPrice: f.stitchPrice || 0,
          colors: f.colors.map(c => ({ name: c.name, image: c.image }))
        }
      }))
    }
  }, [initialData])

  console.log('Current fabrics state:', fabrics)

  const isFormValid = () => {
    // Check basic form fields
    if (!title.trim()) return { valid: false, message: "Please enter a design title" }
    if (!description.trim()) return { valid: false, message: "Please enter a description" }
    
    // Check if there are either new images or existing images
    if (images.length === 0 && existingImages.length === 0) {
      return { valid: false, message: "Please upload at least one image" }
    }

    // Check if there's at least one fabric
    if (fabrics.length === 0) {
      return { valid: false, message: "Please add at least one fabric" }
    }

    // Check if each fabric has complete information
    for (const fabric of fabrics) {
      if (!fabric.name || !fabric.image || !fabric.yardPrice || !fabric.stitchPrice) {
        return { valid: false, message: "Please complete all fabric information" }
      }
      if (fabric.colors.length === 0) {
        return { valid: false, message: `Please add at least one color for ${fabric.name}` }
      }
    }

    return { valid: true, message: "" }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = isFormValid()
    if (!validation.valid) {
      toast.error(validation.message, {
        duration: 2000,
        position: 'top-center',
      })
      return
    }

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("existingImages", JSON.stringify(existingImages))
    
    // Append new images
    images.forEach((image) => {
      formData.append("images", image)
    })
    
    // Convert fabrics array to JSON string and handle fabric images
    const fabricsData = await Promise.all(fabrics.map(async (fabric, index) => {
      let fabricImageUrl = fabric.image

      // Upload fabric image to Supabase if it's a File
      if (fabric.image instanceof File) {
        const fabricImageKey = `fabrics/${Date.now()}_${fabric.image.name}`
        formData.append('fabricImages', fabric.image)
        formData.append('fabricImageKeys', fabricImageKey)
        fabricImageUrl = fabricImageKey // The API will handle the actual upload
      }

      // Handle color images
      const colors = await Promise.all(fabric.colors.map(async (color, colorIndex) => {
        let colorImageUrl = color.image

        if (color.image instanceof File) {
          const colorImageKey = `colors/${Date.now()}_${color.image.name}`
          formData.append('colorImages', color.image)
          formData.append('colorImageKeys', colorImageKey)
          colorImageUrl = colorImageKey // The API will handle the actual upload
        }

        return {
          name: color.name,
          image: colorImageUrl
        }
      }))

      return {
        name: fabric.name,
        image: fabricImageUrl,
        yardPrice: fabric.yardPrice,
        stitchPrice: fabric.stitchPrice,
        colors
      }
    }))
    
    formData.append('fabrics', JSON.stringify(fabricsData))

    // Add the user ID to the form data
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    console.log('User ID:', user.id)
    formData.append('created_by', user.id)

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
          initialImages={existingImages} 
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
        className={`${styles.submitButton} ${!isFormValid().valid ? styles.submitButtonDisabled : ''}`}
      >
        {initialData?.id ? "Update Design" : "Submit Design"}
      </Button>
    </form>
  )
}

