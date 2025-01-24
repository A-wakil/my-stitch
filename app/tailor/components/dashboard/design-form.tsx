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

interface Color {
  name: string
  image: File | null
}

interface Fabric {
  name: string
  image: File | null
}

interface DesignFormProps {
  onSubmitSuccess: () => void
  initialData?: {
    id?: string
    title: string
    description: string
    images: string[]
    colors: { name: string; image: string }[]
    fabrics: { name: string; image: string }[]
  }
}

export function DesignForm({ onSubmitSuccess, initialData }: DesignFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [images, setImages] = useState<File[]>([])
  const [colors, setColors] = useState<Color[]>(initialData?.colors.map((c) => ({ name: c.name, image: null })) || [])
  const [fabrics, setFabrics] = useState<Fabric[]>(
    initialData?.fabrics.map((f) => ({ name: f.name, image: null })) || [],
  )

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description)
      setColors(initialData.colors.map((c) => ({ name: c.name, image: null })))
      setFabrics(initialData.fabrics.map((f) => ({ name: f.name, image: null })))
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    images.forEach((image, index) => {
      formData.append(`images[${index}]`, image)
    })
    colors.forEach((color, index) => {
      formData.append(`colors[${index}][name]`, color.name)
      if (color.image) {
        formData.append(`colors[${index}][image]`, color.image)
      }
    })
    fabrics.forEach((fabric, index) => {
      formData.append(`fabrics[${index}][name]`, fabric.name)
      if (fabric.image) {
        formData.append(`fabrics[${index}][image]`, fabric.image)
      }
    })

    try {
      const url = initialData?.id ? `/api/designs/${initialData.id}` : "/api/designs"
      const method = initialData?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method: method,
        body: formData,
      })
      if (response.ok) {
        onSubmitSuccess()
      } else {
        console.error("Failed to submit design")
      }
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
      <ImageUpload images={images} setImages={setImages} initialImages={initialData?.images} />
      <ColorPicker colors={colors} setColors={setColors} />
      <FabricPicker fabrics={fabrics} setFabrics={setFabrics} />
      <Button type="submit">{initialData?.id ? "Update Design" : "Submit Design"}</Button>
    </form>
  )
}

