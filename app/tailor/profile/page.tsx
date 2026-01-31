'use client'
import { useState, useEffect, useCallback } from "react"
import { supabase } from '../../lib/supabaseClient'
import { TailorProfileForm } from "../components/dashboard/tailor-profile-form"
import { TailorProfileDisplay } from "../components/dashboard/tailor-profile-display"
import styles from "./page.module.css"
import { Profile } from "../types/design"

const profileCache = new Map<string, Profile>()

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cachedProfile = profileCache.get(user.id)
      if (cachedProfile) {
        setProfileData(cachedProfile)
        setDataLoaded(true)
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('tailor_details')
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
        profileCache.set(user.id, transformedData)
        setDataLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Prevent re-running if data is already loaded
    if (dataLoaded) {
      return;
    }

    fetchProfile()
  }, [fetchProfile, dataLoaded])

  const handleProfileUpdate = (updatedProfile: typeof profileData) => {
    setProfileData(updatedProfile)
    setIsEditing(false)
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && updatedProfile) {
        profileCache.set(user.id, updatedProfile)
      }
    })
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

