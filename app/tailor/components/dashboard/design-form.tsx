"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import { FabricPicker } from "../../components/dashboard/fabric-picker"
import { ImageUpload } from "../../components/dashboard/image-upload"
import styles from "./styles/DesignForm.module.css"
import { Fabric } from "../../types/design"
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
    fabrics: Array<Fabric>
    gender?: 'male' | 'female' | null
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
  const [fabrics, setFabrics] = useState<Fabric[]>(
    initialData?.fabrics.map((f) => ({
      name: f.name,
      image: f.image,
      yardPrice: f.yardPrice || 0,
      stitchPrice: f.stitchPrice || 0,
      colors: f.colors.map(c => ({ name: c.name, image: c.image }))
    })) || []
  )
  const [duration, setDuration] = useState<Duration>(null);
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFabricPicker, setShowFabricPicker] = useState<boolean>(true)
  const [simplePricePerYard, setSimplePricePerYard] = useState<string>('')
  const [simpleStitchingPrice, setSimpleStitchingPrice] = useState<string>('')
  const [gender, setGender] = useState<'male' | 'female' | null>(
    initialData?.gender !== undefined ? initialData.gender : null
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

  // Move isFormValid to a memoized value
  const formValidation = useMemo(() => {
    const newErrors: FormErrors = {}
    const isUpdate = !!initialData?.id;
    
    console.log('[Validation] Checking form validity, isUpdate:', isUpdate);

    // Check basic fields
    if (!title.trim()) {
      console.log('[Validation] Missing title');
      return { valid: false, message: "Please enter a design title" }
    }
    if (!description.trim()) {
      console.log('[Validation] Missing description');
      return { valid: false, message: "Please enter a description" }
    }
    
    // Check if completion time is set
    if (duration === null) {
      console.log('[Validation] Missing completion time');
      return { valid: false, message: "Please specify a completion time" }
    }

    // Add validation for gender
    if (!gender) {
      console.log('[Validation] Missing gender');
      return { valid: false, message: "Please select a gender category" }
    }

    // Check if there are either new images or existing images
    if (images.length === 0 && existingImages.length === 0) {
      console.log('[Validation] Missing images');
      return { valid: false, message: "Please upload at least one image" }
    }

    // For updates, don't require fabrics if none were changed
    if (!showFabricPicker) {
      // Simple pricing mode validation
      if (!simplePricePerYard.trim() || isNaN(parseFloat(simplePricePerYard))) {
        console.log('[Validation] Missing or invalid simple price per yard');
        return { valid: false, message: "Please enter a valid price per yard" }
      }
      if (!simpleStitchingPrice.trim() || isNaN(parseFloat(simpleStitchingPrice))) {
        console.log('[Validation] Missing or invalid simple stitching price');
        return { valid: false, message: "Please enter a valid stitching price" }
      }
    } else if (fabrics.length === 0 && !isUpdate) {
      console.log('[Validation] Missing fabrics on new design');
      return { valid: false, message: "Please add at least one fabric" }
    } else if (showFabricPicker) {
      // When updating an existing design, check if fabrics have changed
      if (isUpdate) {
        console.log('[Validation] Processing update - fabrics:', fabrics.length, 
                    'initialFabrics:', initialData?.fabrics.length);
        
        // Special case - always allow updates when only changing basic fields
        return { valid: true, message: "" };
      } else {
        // For new designs with fabric picker on, validate all fabrics
        for (const fabric of fabrics) {
          if (!fabric.name || !fabric.image || !fabric.yardPrice || !fabric.stitchPrice) {
            const missingFields = [];
            if (!fabric.name) missingFields.push("name");
            if (!fabric.image) missingFields.push("image");
            if (!fabric.yardPrice) missingFields.push("yard price");
            if (!fabric.stitchPrice) missingFields.push("stitching price");
            
            const errorMsg = `Please complete all fields for fabric: ${missingFields.join(", ")}`;
            console.log('[Validation] Error:', errorMsg);
            return { 
              valid: false, 
              message: errorMsg
            }
          }
          
          if (fabric.colors.length === 0) {
            const errorMsg = `Please add at least one color for ${fabric.name}`;
            console.log('[Validation] Error:', errorMsg);
            return { valid: false, message: errorMsg }
          }
        }
      }
    }

    console.log('[Validation] All checks passed');
    setErrors(newErrors)
    return { valid: true, message: "" }
  }, [title, description, duration, images, existingImages, fabrics, initialData?.id, showFabricPicker, simplePricePerYard, simpleStitchingPrice, gender]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formValidation.valid) {
      // Check specifically for color-related validation errors
      console.log('[ handleSubmit ] Validation failed. Message:', formValidation.message, 'Valid:', formValidation.valid);
      if (formValidation.message && formValidation.message.includes('color for')) {
        const fabricName = formValidation.message.split('color for ')[1];
        toast.error(
          <div>
            <strong>Missing colors!</strong>
            <p>Please add at least one color for fabric: {fabricName}</p>
          </div>,
          {
            duration: 4000,
            position: 'top-center',
            style: { 
              borderLeft: '4px solid red',
              padding: '16px'
            }
          }
        );
      } else {
        console.log('[ handleSubmit ] About to show generic toast for:', formValidation.message);
        toast.error(formValidation.message, {
          duration: 2000,
          position: 'top-center',
        });
      }
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
    
    // Handle fabrics data based on mode
    if (showFabricPicker) {
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
    } else {
      // Use simple pricing mode - create a generic fabric entry with just prices
      const simpleFabricData = [{
        name: "Custom",
        image: null,
        yardPrice: parseFloat(simplePricePerYard),
        stitchPrice: parseFloat(simpleStitchingPrice),
        colors: [{ name: "Custom", image: null }]
      }]
      
      formData.append('fabrics', JSON.stringify(simpleFabricData))
      formData.append('useSimplePricing', 'true')
    }

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
      <div className={styles.fabricSection}>
        <div className={styles.fabricToggleContainer}>
          <div className={styles.fabricToggleHeader}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
              <h2 className={styles.sectionTitle}>Fabric Options</h2>
              <div className={styles.infoTooltip}>
                <Info className={styles.infoIcon} />
                <div className={styles.tooltipContent}>
                  <p>Choose how to specify fabric options for your design:</p>
                  <ul>
                    <li><strong>Detailed mode (toggle ON):</strong> Add specific fabrics with images, colors, and individual pricing</li>
                    <li><strong>Simple mode (toggle OFF):</strong> Just set basic pricing without fabric details</li>
                  </ul>
                  <p>Use simple mode when you don't need to specify different fabric types or colors.</p>
                </div>
              </div>
            </div>
            <div className={styles.fabricModeToggle}>
              <label className={styles.toggleLabel}>
                <span>Detailed fabric options</span>
                <div className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={showFabricPicker}
                    onChange={() => setShowFabricPicker(!showFabricPicker)}
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </div>
              </label>
            </div>
          </div>
          
          {!showFabricPicker ? (
            <div className={styles.simplePricingContainer}>
              <div className={styles.simplePricingExplanation}>
                <p>Enter basic pricing information without specifying fabric options</p>
              </div>
              <div className={styles.simplePricingForm}>
                <div className={styles.formGroup}>
                  <Label htmlFor="price-per-yard">Price Per Yard ($)</Label>
                  <Input
                    id="price-per-yard"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g., 15.99"
                    value={simplePricePerYard}
                    onChange={(e) => setSimplePricePerYard(e.target.value)}
                    required={!showFabricPicker}
                  />
                </div>
                <div className={styles.formGroup}>
                  <Label htmlFor="stitching-price">Stitching Price ($)</Label>
                  <Input
                    id="stitching-price"
                    type="number"
                    min="0" 
                    step="0.01"
                    placeholder="e.g., 45.00"
                    value={simpleStitchingPrice}
                    onChange={(e) => setSimpleStitchingPrice(e.target.value)}
                    required={!showFabricPicker}
                  />
                </div>
              </div>
            </div>
          ) : (
            <FabricPicker 
              fabrics={fabrics} 
              setFabrics={setFabrics} 
            />
          )}
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

