"use client"
import { useEffect, useState } from "react"
import "./tailor-profile-display.css"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Send, Phone, Edit } from "lucide-react"
import { supabase } from "../../../lib/supabaseClient"
interface TailorProfile {
  brand_name: string;
  tailor_name: string;
  logo_url: string;
  banner_image_url: string;
  address: string;
  phone: string;
  email: string;
  bio: string;
  website: string;
  experience: string;
  specializations: string[];
}

interface TailorProfileDisplayProps {
  onEdit: () => void;
}

export function TailorProfileDisplay({ onEdit }: TailorProfileDisplayProps) {
  const [profile, setProfile] = useState<TailorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) throw new Error('No user found')

        const { data, error } = await supabase
          .from('tailor_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) throw error

        setProfile(data)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [supabase])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error || !profile) {
    return <div>Error loading profile. Please try again later.</div>
  }

  return (
    <Card className="profile-card">
      <div className="profile-banner">
        <img src={profile.banner_image_url} alt="Profile Banner" className="banner-image" />
        <Button 
          onClick={onEdit} 
          className="edit-button" 
          variant="secondary"
        >
          <Edit className="button-icon" />
          Edit Profile
        </Button>
      </div>
      <CardContent className="profile-content">
        <div className="profile-header">
          <img src={profile.logo_url} alt="Profile" className="profile-image" />
          <div className="profile-badges">
            <span className="badge experience">{profile.experience}</span>
            {profile.specializations.map((specialization, index) => (
              <span className="badge specialization" key={index}>{specialization}</span>
            ))}
          </div>
        </div>

        <div className="profile-info">
          <h1 className="profile-name">{profile.tailor_name}</h1>
          <h2 className="profile-title">{profile.brand_name}</h2>
          
          <p className="profile-bio">{profile.bio}</p>

          <div className="social-links">
            <a href="#" className="social-link">Instagram</a>
            <a href="#" className="social-link">Twitter</a>
            <a href="#" className="social-link">Facebook</a>
            <a href="#" className="social-link">YouTube</a>
            <a href={`https://${profile.website}`} className="social-link website">{profile.website}</a>
          </div>

          <div className="action-buttons">
            <Button className="follow-button">Follow</Button>
            <Button variant="outline" className="email-button">
              <Send className="button-icon" />
              Send Email
            </Button>
            <Button variant="outline" className="phone-button">
              <Phone className="button-icon" />
              Show Phone Number
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

