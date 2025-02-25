'use client'
import Link from "next/link"
import { Home, Scissors, User, ShoppingBag } from "lucide-react"
import styles from "./sidebar.module.css"
import { useProfile } from "../../../context/ProfileContext"

export function Sidebar() {
  const { hasProfile, isLoading } = useProfile()

  if (isLoading) {
    return <div className={styles.sidebar}>Loading...</div>
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles['sidebar-header']}>
        <span className={styles['sidebar-title']}>Tailor Dashboard</span>
        <Link href="/" className={styles['marketplace-link']}>
          ← Go back to Marketplace
        </Link>
      </div>
      <nav className={styles['sidebar-nav']}>
        <ul className={styles['sidebar-menu']}>
          <li>
            <Link 
              href="/tailor" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => !hasProfile && e.preventDefault()}
            >
              <Home className={styles['sidebar-icon']} size={20} />
              Home
            </Link>
          </li>
          <li>
            <Link 
              href="/tailor/designs" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => !hasProfile && e.preventDefault()}
              title={!hasProfile ? "Create your profile first" : ""}
            >
              <Scissors className={styles['sidebar-icon']} size={20} />
              Designs
            </Link>
          </li>
          <li>
            <Link 
              href="/tailor/profile" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => !hasProfile && e.preventDefault()}
              title={!hasProfile ? "Create your profile first" : ""}
            >
              <User className={styles['sidebar-icon']} size={20} />
              Profile
            </Link>
          </li>
          <li>
            <Link 
              href="/tailor/orders" 
              className={`${styles['sidebar-link']} ${!hasProfile && styles['sidebar-link-disabled']}`}
              onClick={e => !hasProfile && e.preventDefault()}
              title={!hasProfile ? "Create your profile first" : ""}
            >
              <ShoppingBag className={styles['sidebar-icon']} size={20} />
              Orders
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

