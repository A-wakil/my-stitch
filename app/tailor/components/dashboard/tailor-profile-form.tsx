"use client"
import { useState } from "react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
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
  const [isLoading, setIsLoading] = useState(false)
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
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('No user found')

      // Upload images if they exist
      let logoUrl = formData.logo
      let bannerUrl = formData.bannerImage

      if (logo) {
        logoUrl = await uploadImage(logo, 'logos')
      }
      if (banner) {
        bannerUrl = await uploadImage(banner, 'banners')
      }

      const profileData = {
        id: user.id,
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

      console.log('Sending profile data:', profileData)

      const { data, error: upsertError } = await supabase
        .from('tailor_profiles')
        .upsert(profileData)

      if (upsertError) {
        console.error('Upsert error:', upsertError)
        throw upsertError
      }

      console.log('Upsert response:', data)

      onComplete({
        ...formData,
        logo: logoUrl,
        bannerImage: bannerUrl,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error updating profile:', err)
    } finally {
      setIsLoading(false)
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
        <Label htmlFor="brandName">Fashion House Name</Label>
        <Input 
          id="brandName" 
          value={formData.brandName}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="tailorName">Designer's Name</Label>
        <Input 
          id="tailorName" 
          value={formData.tailorName}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="logo">Logo</Label>
        <Input 
          id="logo" 
          type="file" 
          accept="image/*" 
          onChange={handleLogoUpload} 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="bannerImage">Banner Image</Label>
        <Input 
          id="bannerImage" 
          type="file" 
          accept="image/*" 
          onChange={handleBannerUpload} 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="address">Address</Label>
        <Textarea 
          id="address" 
          value={formData.address}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          id="phone" 
          type="tel" 
          value={formData.phone}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          value={formData.email}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="website">Website</Label>
        <Input 
          id="website" 
          type="url" 
          value={formData.website}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <Label htmlFor="experience">Experience</Label>
        <Input 
          id="experience" 
          value={formData.experience}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="specialization">Specializations</Label>
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
            placeholder="Type and press Enter to add"
          />
        </div>
      </div>
      <div className="form-group">
        <Label htmlFor="bio">Bio</Label>
        <Textarea 
          id="bio" 
          value={formData.bio}
          onChange={handleChange}
        />
      </div>
      <div className="form-actions">
        <Button 
          type="submit" 
          className="submit-button"
          disabled={isLoading}
        >
          {isLoading ? 'Updating...' : 'Update Profile'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
          className="cancel-button"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

