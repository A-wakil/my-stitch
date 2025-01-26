import Link from "next/link"
import { Home, Scissors, User, Settings } from "lucide-react"
import styles from "./sidebar.module.css"

export function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <div className={styles['sidebar-header']}>
        <span className={styles['sidebar-title']}>Tailor Dashboard</span>
      </div>
      <nav className={styles['sidebar-nav']}>
        <ul className={styles['sidebar-menu']}>
          <li>
            <Link href="/tailor" className={styles['sidebar-link']}>
              <Home className={styles['sidebar-icon']} size={20} />
              Home
            </Link>
          </li>
          <li>
            <Link href="/tailor/designs" className={styles['sidebar-link']}>
              <Scissors className={styles['sidebar-icon']} size={20} />
              Designs
            </Link>
          </li>
          <li>
            <Link href="/tailor/profile" className={styles['sidebar-link']}>
              <User className={styles['sidebar-icon']} size={20} />
              Profile
            </Link>
          </li>
          <li>
            <Link href="/tailor/settings" className={styles['sidebar-link']}>
              <Settings className={styles['sidebar-icon']} size={20} />
              Settings
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

