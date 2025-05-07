"use client"
import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import "./tailor-profile-form.css"
import { supabase } from "../../../lib/supabaseClient"

interface TailorProfile {
  brandName: string;
  tailorName: string;
  logo: string;
  bannerImage: string;
  address: string;
  phone: string;
  email: string;
  bio: string;
  rating: number;
  website: string;
  experience: string;
  specializations: string[];
}

interface TailorProfileFormProps {
  onComplete: (profile: TailorProfile) => void;
  onCancel: () => void;
  initialData: TailorProfile;
}

export function TailorProfileForm({ onComplete, onCancel, initialData }: TailorProfileFormProps) {
  const [formData, setFormData] = useState<TailorProfile>(initialData)
  const [logo, setLogo] = useState<File | null>(null)
  const [banner, setBanner] = useState<File | null>(null)
  const [newSpecialization, setNewSpecialization] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    if (id === "specialization") {
      setNewSpecialization(value)
    } else {
      setFormData(prev => ({
        ...prev,
        [id]: value
      }))
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0])
    }
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBanner(e.target.files[0])
    }
  }

  const handleSpecializationKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newSpecialization.trim()) {
      e.preventDefault()
      if (!formData.specializations.includes(newSpecialization.trim())) {
        setFormData(prev => ({
          ...prev,
          specializations: [...prev.specializations, newSpecialization.trim()]
        }))
      }
      setNewSpecialization("")
    }
  }

  const removeSpecialization = (specializationToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter(spec => spec !== specializationToRemove)
    }))
  }

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${path}/${fileName}`

    const { error: uploadError, data } = await supabase.storage
      .from('tailor-images')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    const { data: { publicUrl } } = supabase.storage
      .from('tailor-images')
      .getPublicUrl(filePath)

    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUploading(true)
    setError(null)

    try {
      // Validate all required fields including images
      const hasLogo = logo || formData.logo
      const hasBanner = banner || formData.bannerImage
      if (!hasLogo || !hasBanner) {
        throw new Error('Please upload both a logo and banner image')
      }

      if (formData.specializations.length === 0) {
        throw new Error('Please add at least one specialization')
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Authentication error')

      // Upload images if they exist
      let logoUrl = formData.logo
      let bannerUrl = formData.bannerImage

      try {
        if (logo) {
          logoUrl = await uploadImage(logo, 'logos')
        }
        if (banner) {
          bannerUrl = await uploadImage(banner, 'banners')
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError)
        throw new Error('Error uploading images. Please try again.')
      }

      // Check if this is a new profile creation or an update to an existing profile
      const { data: existingProfile } = await supabase
        .from('tailor_details')
        .select('id')
        .eq('id', user.id)
        .single();
      
      const isNewProfile = !existingProfile;
      
      // Only update the role if this is a new profile creation
      if (isNewProfile) {
        // Use a raw SQL query to update the role
        const { error: sqlError } = await supabase
          .rpc('update_user_role', { 
            user_id: user.id,
            new_role: 'both'
          });

        if (sqlError) {
          console.error('SQL role update error:', sqlError);
          throw new Error('Error updating profile role. Please try again.');
        }
      }

      const profileData = {
        brand_name: formData.brandName,
        tailor_name: formData.tailorName,
        logo_url: logoUrl,
        banner_image_url: bannerUrl,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        bio: formData.bio,
        rating: formData.rating || 0,
        website: formData.website,
        experience: formData.experience,
        specializations: formData.specializations,
      }

      // Upsert into tailor_details, matching on the user ID
      const { error: upsertError } = await supabase
        .from('tailor_details')
        .upsert({ ...profileData, id: user.id }, { onConflict: 'id' })

      if (upsertError) {
        console.error('Tailor details save error:', upsertError)
        throw new Error('Error saving tailor details. Please try again.')
      }

      // Call onComplete with the updated profile data
      onComplete({
        ...formData,
        logo: logoUrl,
        bannerImage: bannerUrl,
      })
    } catch (err) {
      console.error('[handleSubmit] Error caught:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsUploading(false) // Always reset loading state, whether success or error
    }
  }

  return (
    <form onSubmit={handleSubmit} className="tailor-profile-form">
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <div className="form-group">
        <Label htmlFor="brandName">Fashion House Name *</Label>
        <Input 
          id="brandName" 
          value={formData.brandName}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="tailorName">Designer's Name *</Label>
        <Input 
          id="tailorName" 
          value={formData.tailorName}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="logo">Logo</Label>
        {formData.logo && (
          <div className="current-image">
            <img 
              src={formData.logo} 
              alt="Current logo" 
              style={{ 
                maxWidth: '150px',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '15px',
                border: '2px solid #eee'
              }} 
            />
          </div>
        )}
        <Input 
          id="logo" 
          type="file" 
          accept="image/*" 
          onChange={handleLogoUpload}
          required={!formData.logo}
        />
      </div>
      <div className="form-group">
        <Label htmlFor="bannerImage">Banner Image</Label>
        {formData.bannerImage && (
          <div className="current-image">
            <img 
              src={formData.bannerImage} 
              alt="Current banner" 
              style={{ 
                maxWidth: '300px',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                marginBottom: '15px',
                border: '2px solid #eee'
              }} 
            />
          </div>
        )}
        <Input 
          id="bannerImage" 
          type="file" 
          accept="image/*" 
          onChange={handleBannerUpload}
          required={!formData.bannerImage}
        />
      </div>
      <div className="form-group">
        <Label htmlFor="address">Address *</Label>
        <Textarea 
          id="address" 
          value={formData.address}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input 
          id="phone" 
          type="tel" 
          value={formData.phone}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="email">Email *</Label>
        <Input 
          id="email" 
          type="email" 
          value={formData.email}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="website">Website *</Label>
        <Input 
          id="website" 
          type="url" 
          value={formData.website}
          onChange={handleChange}
          required
          placeholder="https://example.com"
        />
      </div>
      <div className="form-group">
        <Label htmlFor="experience">Years of Experience *</Label>
        <Input 
          id="experience" 
          type="number"
          min="0"
          max="100"
          value={formData.experience}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="specialization">Specializations *</Label>
        <div className="specializations-container">
          <div className="specializations-tags">
            {formData.specializations.map((spec, index) => (
              <span key={index} className="specialization-tag">
                {spec}
                <button
                  type="button"
                  onClick={() => removeSpecialization(spec)}
                  className="tag-remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <Input 
            id="specialization" 
            value={newSpecialization}
            onChange={handleChange}
            onKeyDown={handleSpecializationKeyDown}
            placeholder="Type a specialization and press Enter to add it"
          />
          <p className="helper-text">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
              <line x1="6" y1="8" x2="6" y2="8"></line>
              <line x1="10" y1="8" x2="10" y2="8"></line>
              <line x1="14" y1="8" x2="14" y2="8"></line>
              <line x1="18" y1="8" x2="18" y2="8"></line>
              <line x1="6" y1="12" x2="6" y2="12"></line>
              <line x1="10" y1="12" x2="10" y2="12"></line>
              <line x1="14" y1="12" x2="14" y2="12"></line>
              <line x1="18" y1="12" x2="18" y2="12"></line>
              <line x1="6" y1="16" x2="18" y2="16"></line>
            </svg>
            After typing your specialization, press the <strong>Enter</strong> key to add it to the list
          </p>
        </div>
      </div>
      <div className="form-group">
        <Label htmlFor="bio">Bio *</Label>
        <Textarea 
          id="bio" 
          value={formData.bio}
          onChange={handleChange}
          required
        />
      </div>
      <div className="form-actions">
        <Button 
          type="submit" 
          className="submit-button"
          disabled={isUploading}
        >
          {isUploading ? 'Updating...' : 'Update Profile'}
        </Button>
        <Button 
          type="button" 
          variant="secondary"
          className="cancel-button"
          onClick={onCancel}
          disabled={isUploading}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

