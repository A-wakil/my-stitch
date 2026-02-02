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
import { useCurrency } from '../../../context/CurrencyContext'
import { CURRENCIES, CurrencyCode } from '../../../lib/types'
import { getCurrencyFractionDigits } from '../../../lib/services/currencyService'

interface DesignFormProps {
  onSubmitSuccess: () => void
  initialData?: {
    id?: string
    title: string
    description: string
    images: string[]
    videos?: string[]
    price?: number
    currency_code?: CurrencyCode
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
  const { currency, convertToPreferred } = useCurrency()
  const [title, setTitle] = useState(initialData?.title || "")
  const [description, setDescription] = useState(initialData?.description || "")
  const [images, setImages] = useState<File[]>([])
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || [])
  const [videos, setVideos] = useState<File[]>([])
  const [existingVideos, setExistingVideos] = useState<string[]>(initialData?.videos || [])
  const [duration, setDuration] = useState<Duration>(null);
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [totalPrice, setTotalPrice] = useState<string>('')
  const [storedPrice, setStoredPrice] = useState<number | null>(null)
  const [storedCurrency, setStoredCurrency] = useState<CurrencyCode>('USD')
  const [isApproved, setIsApproved] = useState<boolean | null>(null)
  const [gender, setGender] = useState<'male' | 'female' | null>(
    initialData?.gender !== undefined ? initialData.gender : null
  )

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title)
      setDescription(initialData.description)
      setExistingImages(initialData.images || [])
      setExistingVideos(initialData.videos || [])
      setDuration(
        typeof initialData.completion_time === 'number'
          ? initialData.completion_time
          : initialData.completion_time === null
            ? null
            : null
      )
      // Set the price if available (stored in its original currency in database)
      if (initialData.price !== undefined && initialData.price !== null) {
        setStoredPrice(initialData.price)
        setStoredCurrency(initialData.currency_code || 'USD')
      }
    }
  }, [initialData])

  useEffect(() => {
    let isMounted = true

    const checkApproval = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase
        .from('tailor_details')
        .select('is_approved')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking approval status:', error)
        return
      }

      if (isMounted) {
        setIsApproved(!!data?.is_approved)
      }
    }

    checkApproval()

    return () => {
      isMounted = false
    }
  }, [])

  // Convert price to selected currency whenever currency or priceInUSD changes
  useEffect(() => {
    async function updateDisplayPrice() {
      if (storedPrice !== null) {
        const convertedPrice = await convertToPreferred(storedPrice, storedCurrency)
        const fractionDigits = getCurrencyFractionDigits(currency)
        setTotalPrice(convertedPrice.toFixed(fractionDigits))
      }
    }
    updateDisplayPrice()
  }, [currency, storedPrice, storedCurrency, convertToPreferred])

  // Form validation
  const formValidation = useMemo(() => {
    const newErrors: FormErrors = {}

    if (isApproved === false) {
      return { valid: false, message: "Your tailor account is pending approval" }
    }

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

    // Check if there are either new images/videos or existing images/videos
    const totalMedia = images.length + existingImages.length + videos.length + existingVideos.length
    if (totalMedia === 0) {
      return { valid: false, message: "Please upload at least one image or video" }
    }

    // Validate total price
    const trimmedPrice = totalPrice.trim()
    const numericPrice = parseFloat(trimmedPrice)
    
    if (!trimmedPrice || isNaN(numericPrice) || numericPrice < 0) {
      return { valid: false, message: "Please enter a valid total price" }
    }

    setErrors(newErrors)
    return { valid: true, message: "" }
  }, [title, description, duration, images, existingImages, videos, existingVideos, totalPrice, gender]);

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

    try {
      // Save price in the selected currency
      const priceInSelectedCurrency = parseFloat(totalPrice)
      const selectedFractionDigits = getCurrencyFractionDigits(currency)
      const priceForSaving = Number(priceInSelectedCurrency.toFixed(selectedFractionDigits))

      const formData = new FormData()
      formData.append("title", title)
      formData.append("description", description)
      formData.append("existingImages", JSON.stringify(existingImages))
      formData.append("existingVideos", JSON.stringify(existingVideos))
      formData.append("completion_time", duration === null ? "" : duration.toString())
      formData.append("price", priceForSaving.toString())
      formData.append("currency_code", currency)

      if (gender !== null) {
        formData.append("gender", gender)
      }
      
      // Append new images
      images.forEach((image) => {
        formData.append("images", image)
      })

      // Append new videos
      videos.forEach((video) => {
        formData.append("videos", video)
      })

      // Add the user ID to the form data
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      formData.append('created_by', user.id)

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
      {isApproved === false && (
        <div className={styles.approvalNotice}>
          Your tailor account is pending approval. You can complete your profile,
          but design uploads are disabled until you are approved.
        </div>
      )}
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
            <label className={`${styles.radioLabel} ${styles.comingSoon}`}>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === 'female'}
                onChange={() => setGender('female')}
                disabled
              />
              <span>Female</span>
              <span className={styles.comingSoonBadge}>Coming Soon</span>
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
          <h2 className={styles.sectionTitle}>Media (Images & Videos)</h2>
          <div className={styles.infoTooltip}>
            <Info className={styles.infoIcon} />
            <div className={styles.tooltipContent}>
              <p>Upload high-quality images and videos of your design.</p>
              <p>Images - Best practices:</p>
              <ul>
                <li>Include front, back and detail views</li>
                <li>Use good lighting and neutral backgrounds</li>
                <li>Show the design on a model if possible</li>
                <li>Recommended resolution: 1000px × 1000px minimum</li>
              </ul>
              <p>Videos - Best practices:</p>
              <ul>
                <li>Maximum duration: 20 seconds</li>
                <li>Show 360° views and fabric movement</li>
                <li>Good lighting and stable camera</li>
                <li>Formats: MP4, MOV, WebM</li>
              </ul>
            </div>
          </div>
        </div>
        <ImageUpload 
          images={images} 
          setImages={setImages} 
          initialImages={existingImages}
          setExistingImages={setExistingImages}
          videos={videos}
          setVideos={setVideos}
          initialVideos={existingVideos}
          setExistingVideos={setExistingVideos}
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
              <p className="text-sm text-gray-500 mt-2">Price is shown in {CURRENCIES[currency]?.name || currency}. It will be stored in USD and converted for customers based on their currency preference.</p>
            </div>
          </div>
        </div>
        <div className={styles.pricingContainer}>
          <div className={styles.formGroup}>
            <Label htmlFor="total-price">Total Price ({CURRENCIES[currency]?.symbol || currency})</Label>
            <Input
              id="total-price"
              type="number"
              min="0"
              step="0.01"
              placeholder={`e.g., ${currency === 'NGN' ? '50000' : '120.00'}`}
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