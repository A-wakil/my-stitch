'use client'
import { useState } from "react"
import { TailorProfileForm } from "../components/dashboard/tailor-profile-form"
import { TailorProfileDisplay } from "../components/dashboard/tailor-profile-display"
import styles from "./page.module.css"

// Initial profile data
const initialProfile = {
  brandName: "Elegant Stitches",
  tailorName: "Jane Doe",
  logo: "/image_1.webp",
  bannerImage: "/syari_2.jpg",
  address: "123 Fashion St, Styleville, ST 12345",
  phone: "+1 (555) 123-4567",
  email: "jane@elegantstitches.com",
  bio: "Creating bespoke fashion for over 20 years",
  rating: 4.8,
  website: "elegantstitches.com",
  experience: "10+ years",
  specializations: ["Custom Suits", "Custom Shirts", "Custom Pants", "Custom Ties", "Custom Shoes"],
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState(initialProfile)

  const handleProfileUpdate = (updatedProfile: typeof initialProfile) => {
    setProfileData(updatedProfile)
    setIsEditing(false)
  }

  return (
    <div className={styles.container}>
      {!isEditing ? (
        <TailorProfileDisplay 
          onEdit={() => setIsEditing(true)} 
          profile={profileData}
        />
      ) : (
        <TailorProfileForm 
          onComplete={handleProfileUpdate}
          onCancel={() => setIsEditing(false)}
          initialData={profileData}
        />
      )}
    </div>
  )
}

