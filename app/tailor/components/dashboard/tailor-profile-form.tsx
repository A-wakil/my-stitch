"use client"

import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import { Textarea } from "../../components/ui/textarea"
import "./tailor-profile-form.css"

interface TailorProfileFormProps {
  onComplete: () => void;
}

export function TailorProfileForm({ onComplete }: TailorProfileFormProps) {
  const [logo, setLogo] = useState<File | null>(null)

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete()
    // Handle form submission here
  }

  return (
    <form onSubmit={handleSubmit} className="tailor-profile-form">
      <div className="form-group">
        <Label htmlFor="brandName">Brand Name</Label>
        <Input id="brandName" required />
      </div>
      <div className="form-group">
        <Label htmlFor="tailorName">Tailor Name</Label>
        <Input id="tailorName" required />
      </div>
      <div className="form-group">
        <Label htmlFor="logo">Logo</Label>
        <div className="file-upload">
          <Input id="logo" type="file" accept="image/*" onChange={handleLogoUpload} />
        </div>
      </div>
      <div className="form-group">
        <Label htmlFor="address">Address</Label>
        <Textarea id="address" required />
      </div>
      <div className="form-group">
        <Label htmlFor="phone">Phone Number</Label>
        <Input id="phone" type="tel" required />
      </div>
      <div className="form-group">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required />
      </div>
      <div className="form-group">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" />
      </div>
      <Button type="submit" className="submit-button">Update Profile</Button>
    </form>
  )
}

