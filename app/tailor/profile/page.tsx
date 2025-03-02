'use client'
import { useState, useEffect } from "react"
import { supabase } from '../../lib/supabaseClient'
import { TailorProfileForm } from "../components/dashboard/tailor-profile-form"
import { TailorProfileDisplay } from "../components/dashboard/tailor-profile-display"
import styles from "./page.module.css"
import { Profile } from "../types/design"


export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('tailor_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error
        if (data) {
          const transformedData = {
            brandName: data.brand_name,
            tailorName: data.tailor_name,
            logo: data.logo_url,
            bannerImage: data.banner_image_url,
            address: data.address,
            phone: data.phone,
            email: data.email,
            bio: data.bio,
            rating: data.rating,
            website: data.website,
            experience: data.experience,
            specializations: data.specializations || [],
          }
          setProfileData(transformedData)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleProfileUpdate = (updatedProfile: typeof profileData) => {
    setProfileData(updatedProfile)
    setIsEditing(false)
  }

  if (loading) return <div>Loading...</div>
  if (!profileData) return <div>No profile found</div>

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

