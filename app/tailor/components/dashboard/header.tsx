import { Bell, LogOut, Menu } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Card } from "../../components/ui/card"
import styles from "./header.module.css"
import { useState } from "react"
import { CurrencyToggle } from "../../../components/ui/CurrencyToggle"

interface HeaderProps {
  toggleLogoutDialog: () => Promise<void>
  toggleSidebar?: () => void
  isMobile?: boolean
}

export function Header({ toggleLogoutDialog, toggleSidebar, isMobile }: HeaderProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <header className={styles.header}>
      {isMobile && toggleSidebar && (
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className={styles.iconButton} data-tooltip="Menu">
          <Menu size={20} />
        </Button>
      )}
      <div className={styles.buttonGroup}>
        <CurrencyToggle />
        <Button variant="ghost" size="icon" className={styles.iconButton} data-tooltip="Notifications">
          <Bell size={20} />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setShowConfirm(true)} className={styles.iconButton} data-tooltip="Log Out">
          <LogOut size={20} />
        </Button>
      </div>

      {showConfirm && (
        <div className={styles.confirmOverlay}>
          <Card className={styles.confirmDialog}>
            <h3>Logout Confirmation</h3>
            <p>Are you sure you want to log out?</p>
            <div className={styles.confirmButtons}>
              <Button 
                variant="secondary" 
                className={styles.cancelButton}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                className={styles.logoutButton}
                onClick={toggleLogoutDialog}
              >
                Logout
              </Button>
            </div>
          </Card>
        </div>
      )}
    </header>
  )
}

