'use client'
import Link from "next/link"
import { Home, Scissors, User, ShoppingBag, X } from "lucide-react"
import styles from "./sidebar.module.css"
import { useProfile } from "../../../context/ProfileContext"

interface SidebarProps {
  isMobile?: boolean;
  toggleSidebar?: () => void;
}

export function Sidebar({ isMobile, toggleSidebar }: SidebarProps) {
  const { hasProfile, isLoading } = useProfile()

  if (isLoading) {
    return <div className={styles.sidebar}>Loading...</div>
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles['sidebar-header']}>
        <span className={styles['sidebar-title']}>
          Tailor Dashboard
          {isMobile && toggleSidebar && (
            <button 
              onClick={toggleSidebar}
              className={styles['close-button']}
              aria-label="Close sidebar"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </span>
        <Link href="/" className={styles['marketplace-link']} onClick={() => {
          if (isMobile && toggleSidebar) toggleSidebar();
        }}>
          ← Go back to Marketplace
        </Link>
      </div>
      <nav className={styles['sidebar-nav']}>
        <ul className={styles['sidebar-menu']}>
          <li>
            <Link 
              href="/tailor" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => {
                if (!hasProfile) {
                  e.preventDefault();
                }
                if (isMobile && toggleSidebar) {
                  toggleSidebar();
                }
              }}
              data-tooltip="Home"
            >
              <Home className={styles['sidebar-icon']} size={20} />
              Home
            </Link>
          </li>
          <li>
            <Link 
              href="/tailor/orders" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => {
                if (!hasProfile) {
                  e.preventDefault();
                }
                if (isMobile && toggleSidebar) {
                  toggleSidebar();
                }
              }}
              title={!hasProfile ? "Create your profile first" : ""}
              data-tooltip="Orders"
            >
              <ShoppingBag className={styles['sidebar-icon']} size={20} />
              Orders
            </Link>
          </li>
          <li>
            <Link 
              href="/tailor/designs" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => {
                if (!hasProfile) {
                  e.preventDefault();
                }
                if (isMobile && toggleSidebar) {
                  toggleSidebar();
                }
              }}
              title={!hasProfile ? "Create your profile first" : ""}
              data-tooltip="Designs"
            >
              <Scissors className={styles['sidebar-icon']} size={20} />
              Designs
            </Link>
          </li>
          <li>
            <Link 
              href="/tailor/profile" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => {
                if (!hasProfile) {
                  e.preventDefault();
                }
                if (isMobile && toggleSidebar) {
                  toggleSidebar();
                }
              }}
              title={!hasProfile ? "Create your profile first" : ""}
              data-tooltip="Profile"
            >
              <User className={styles['sidebar-icon']} size={20} />
              Profile
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

