import "./tailor-profile-display.css"
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card"

// Mock data for tailor profile
const tailorProfile = {
  brandName: "Elegant Stitches",
  tailorName: "Jane Doe",
  logo: "/logo-placeholder.svg",
  address: "123 Fashion St, Styleville, ST 12345",
  phone: "+1 (555) 123-4567",
  email: "jane@elegantstitches.com",
  bio: "Creating bespoke fashion for over 20 years",
  rating: 4.8,
}

interface TailorProfileDisplayProps {
  onEdit: () => void;
}

export function TailorProfileDisplay({ onEdit }: TailorProfileDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <div className="profile-header-container">
        <h2 className="title">Tailor Profile</h2>
          <button 
            onClick={onEdit}
            className="edit-profile-button"
          >
            Edit Profile
          </button>
        </div>
      </CardHeader>
      <CardContent className="tailor-profile-content">
        <div className="profile-header">
          <img src={tailorProfile.logo || "/placeholder.svg"} alt="Brand Logo" className="brand-logo" />
          <div>
            <h3 className="brand-name">{tailorProfile.brandName}</h3>
            <p>{tailorProfile.tailorName}</p>
          </div>
        </div>
        <div className="profile-section">
          <h4 className="section-title">Address:</h4>
          <p>{tailorProfile.address}</p>
        </div>
        <div className="profile-section">
          <h4 className="section-title">Contact:</h4>
          <p>Phone: {tailorProfile.phone}</p>
          <p>Email: {tailorProfile.email}</p>
        </div>
        <div className="profile-section">
          <h4 className="section-title">Bio:</h4>
          <p>{tailorProfile.bio}</p>
        </div>
        <div className="profile-section">
          <h4 className="section-title">Rating:</h4>
          <p>{tailorProfile.rating} / 5</p>
        </div>
      </CardContent>
    </Card>
  )
}

