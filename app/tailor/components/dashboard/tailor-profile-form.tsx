"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import "./tailor-profile-form.css"

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="tailor-profile-form">
      <div className="form-group">
        <Label htmlFor="brandName">Brand Name</Label>
        <Input 
          id="brandName" 
          value={formData.brandName}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="form-group">
        <Label htmlFor="tailorName">Tailor Name</Label>
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
        <Button type="submit" className="submit-button">Update Profile</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

