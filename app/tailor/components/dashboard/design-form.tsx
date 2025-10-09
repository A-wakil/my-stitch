"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { ImageUpload } from "../../components/dashboard/image-upload"
import styles from "./styles/DesignForm.module.css"
import { supabase } from "../../../lib/supabaseClient"
import { toast } from "react-hot-toast"
import { Info } from "lucide-react"
import { Toaster } from 'react-hot-toast'

interface DesignFormProps {
  onSubmitSuccess: () => void
  initialData?: {
    id?: string
    title: string
    description: string
    images: string[]
    fabrics: Array<{
      name: string
      image: string | null
      totalPrice: number
      colors: Array<{ name: string; image: string | null }>
    }>
    gender?: 'male' | 'female' | null
    completion_time?: number | null
  }
}

type Duration = number | null; // This will represent weeks

// Add interface for errors
interface FormErrors {
  duration?: string;
  // add other error types if needed
}

export function DesignForm({ onSubmitSuccess, initialData }: DesignFormProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])
  const [duration, setDuration] = useState<Duration>(null);
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalPrice, setTotalPrice] = useState<string>('')
  const [gender, setGender] = useState<'male' | 'female' | null>(
    initialData?.gender !== undefined ? initialData.gender : null
  )

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description)
      setExistingImages(initialData.images || [])
      setDuration(
        typeof initialData.completion_time === 'number'
          ? initialData.completion_time
          : initialData.completion_time === null
            ? null
            : null
      )
      
      // Extract price from existing fabrics (should be simple mode with one "Custom" fabric)
      if (initialData.fabrics.length > 0) {
        setTotalPrice(initialData.fabrics[0].totalPrice.toString())
      }
    }
  }, [initialData])

  // Form validation
  const formValidation = useMemo(() => {
    const newErrors: FormErrors = {}

    // Check basic fields
    if (!title.trim()) {
      return { valid: false, message: "Please enter a design title" }
    }
    if (!description.trim()) {
      return { valid: false, message: "Please enter a description" }
    }
    
    // Check if completion time is set
    if (duration === null) {
      return { valid: false, message: "Please specify a completion time" }
    }

    // Add validation for gender
    if (!gender) {
      return { valid: false, message: "Please select a gender category" }
    }

    // Check if there are either new images or existing images
    if (images.length === 0 && existingImages.length === 0) {
      return { valid: false, message: "Please upload at least one image" }
    }

    // Validate total price
    const trimmedPrice = totalPrice.trim()
    const numericPrice = parseFloat(trimmedPrice)
    
    if (!trimmedPrice || isNaN(numericPrice) || numericPrice < 0) {
      return { valid: false, message: "Please enter a valid total price" }
    }

    setErrors(newErrors)
    return { valid: true, message: "" }
  }, [title, description, duration, images, existingImages, totalPrice, gender]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formValidation.valid) {
      toast.error(formValidation.message, {
        duration: 2000,
        position: 'top-center',
      });
      return
    }

    setIsSubmitting(true)

    const formData = new FormData()
    formData.append("title", title)
    formData.append("description", description)
    formData.append("existingImages", JSON.stringify(existingImages))
    formData.append("completion_time", duration === null ? "" : duration.toString())

    if (gender !== null) {
      formData.append("gender", gender)
    }
    
    // Append new images
    images.forEach((image) => {
      formData.append("images", image)
    })
    
    // Create simple fabric data with total price
    const simpleFabricData = [{
      name: "Custom",
      image: null,
      totalPrice: parseFloat(totalPrice),
      colors: [{ name: "Custom", image: null }]
    }]
    
    formData.append('fabrics', JSON.stringify(simpleFabricData))
    formData.append('useSimplePricing', 'true')

    // Add the user ID to the form data
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
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
      toast.error("Failed to save design. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Toaster />
      <div className={styles.formGroup}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Design Title</h2>
          <div className={styles.infoTooltip}>
            <Info className={styles.infoIcon} />
            <div className={styles.tooltipContent}>
              <p>Choose a clear, descriptive name for your design.</p>
              <p>Good examples:</p>
              <ul>
                <li>"Classic Oxford Shirt"</li>
                <li>"Summer Linen Dress"</li>
                <li>"Tailored Wool Blazer"</li>
              </ul>
            </div>
          </div>
        </div>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className={styles.input} />
      </div>
      <div className={styles.formGroup}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Description</h2>
          <div className={styles.infoTooltip}>
            <Info className={styles.infoIcon} />
            <div className={styles.tooltipContent}>
              <p>Describe your design in detail, including:</p>
              <ul>
                <li>Style features (collar type, sleeves, etc.)</li>
                <li>Recommended occasions or uses</li>
                <li>Special design elements</li>
                <li>Fitting information</li>
              </ul>
            </div>
          </div>
        </div>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className={styles.textarea}
        />
      </div>
      <div className={styles.categorySection}>
        <div className={styles.formGroup}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Gender</h2>
            <div className={styles.infoTooltip}>
              <Info className={styles.infoIcon} />
              <div className={styles.tooltipContent}>
                <p>Select which gender this design is intended for.</p>
              </div>
            </div>
          </div>
          <div className={styles.radioGroup}>
            <label className={`${styles.radioLabel} ${gender === 'male' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="gender"
                value="male"
                checked={gender === 'male'}
                onChange={() => setGender('male')}
              />
              <span>Male</span>
            </label>
            <label className={`${styles.radioLabel} ${gender === 'female' ? styles.selected : ''}`}>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={() => setGender('female')}
              />
              <span>Female</span>
            </label>
          </div>
        </div>
      </div>
      <div className={styles.formGroup}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Completion Time (weeks)</h2>
          <div className={styles.infoTooltip}>
            <Info className={styles.infoIcon} />
            <div className={styles.tooltipContent}>
              <p>Specify how long it will take to complete this design after order.</p>
              <p>This information helps customers plan their orders and creates realistic expectations.</p>
            </div>
          </div>
        </div>
        <input
          type="number"
          min="1"
          value={duration === null ? '' : duration}
          onChange={(e) => {
            const value = e.target.value === '' ? null : parseInt(e.target.value);
            setDuration(value === null ? null : Math.max(1, value || 1));
          }}
          onWheel={(e) => {
            // Prevent scroll from changing the number input
            (e.currentTarget as HTMLInputElement).blur()
            setTimeout(() => (e.currentTarget as HTMLInputElement).focus(), 0)
          }}
          onKeyDown={(e) => {
            // Prevent arrow keys from incrementing/decrementing
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
            }
          }}
          placeholder="Enter number of weeks"
          required
          className={styles.input}
        />
      </div>
      <div className={styles.uploadSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Images</h2>
          <div className={styles.infoTooltip}>
            <Info className={styles.infoIcon} />
            <div className={styles.tooltipContent}>
              <p>Upload high-quality images of your design.</p>
              <p>Best practices:</p>
              <ul>
                <li>Include front, back and detail views</li>
                <li>Use good lighting and neutral backgrounds</li>
                <li>Show the design on a model if possible</li>
                <li>Recommended resolution: 1000px × 1000px minimum</li>
              </ul>
            </div>
          </div>
        </div>
        <ImageUpload 
          images={images} 
          setImages={setImages} 
          initialImages={existingImages} 
        />
      </div>
      <div className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Pricing</h2>
          <div className={styles.infoTooltip}>
            <Info className={styles.infoIcon} />
            <div className={styles.tooltipContent}>
              <p>Set the total price for your design.</p>
              <p>This should include all materials, labor, and any additional costs.</p>
            </div>
          </div>
        </div>
        <div className={styles.pricingContainer}>
          <div className={styles.formGroup}>
            <Label htmlFor="total-price">Total Price ($)</Label>
            <Input
              id="total-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g., 120.00"
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
              onWheel={(e) => {
                // Prevent scroll from changing the number input
                (e.currentTarget as HTMLInputElement).blur()
                setTimeout(() => (e.currentTarget as HTMLInputElement).focus(), 0)
              }}
              onKeyDown={(e) => {
                // Prevent arrow keys from incrementing/decrementing
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                  e.preventDefault()
                }
              }}
              required
              className={styles.input}
            />
          </div>
        </div>
      </div>
      
      <Button 
        type="submit" 
        className={`${styles.submitButton} ${(!formValidation.valid || isSubmitting) ? styles.submitButtonDisabled : ''}`}
        disabled={!formValidation.valid || isSubmitting}
      >
        {isSubmitting ? 
          "Saving..." : 
          (initialData?.id ? "Update Design" : "Submit Design")
        }
      </Button>
    </form>
  )
}