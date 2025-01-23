import Link from "next/link"
import { Home, Scissors, User, Settings } from "lucide-react"
import "./sidebar.css"

export function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Tailor Dashboard</span>
      </div>
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          <li>
            <Link href="/dashboard" className="sidebar-link">
              <Home className="sidebar-icon" size={20} />
              Home
            </Link>
          </li>
          <li>
            <Link href="/dashboard/designs" className="sidebar-link">
              <Scissors className="sidebar-icon" size={20} />
              Designs
            </Link>
          </li>
          <li>
            <Link href="/dashboard/profile" className="sidebar-link">
              <User className="sidebar-icon" size={20} />
              Profile
            </Link>
          </li>
          <li>
            <Link href="/dashboard/settings" className="sidebar-link">
              <Settings className="sidebar-icon" size={20} />
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

