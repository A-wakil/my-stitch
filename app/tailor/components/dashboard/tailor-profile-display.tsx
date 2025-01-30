import "./tailor-profile-display.css"
import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Send, Phone, Edit } from "lucide-react"

// Mock data for tailor profile


interface TailorProfileDisplayProps {
  onEdit: () => void;
  profile: {
    brandName: string;
    tailorName: string;
    logo: string;
    bannerImage: string;
    address: string;
    phone: string;
    email: string;
    bio: string;
    website: string;
    experience: string;
    specializations: string[];
  };
}

export function TailorProfileDisplay({ onEdit, profile }: TailorProfileDisplayProps) {
  return (
    <Card className="profile-card">
      <div className="profile-banner">
        <img src={profile.bannerImage} alt="Profile Banner" className="banner-image" />
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
          <img src={profile.logo} alt="Profile" className="profile-image" />
          <div className="profile-badges">
            <span className="badge experience">{profile.experience}</span>
            {profile.specializations.map((specialization, index) => (
              <span className="badge specialization" key={index}>{specialization}</span>
            ))}
          </div>
        </div>

        <div className="profile-info">
          <h1 className="profile-name">{profile.tailorName}</h1>
          <h2 className="profile-title">{profile.brandName}</h2>
          
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

