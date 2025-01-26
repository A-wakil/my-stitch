import { Bell, LogOut } from "lucide-react"
import { Button } from "../../components/ui/button"
import styles from "./header.module.css"

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.buttonGroup}>
        <Button variant="ghost" size="icon">
          <Bell size={20} />
        </Button>
        <Button variant="ghost" size="icon">
          <LogOut size={20} />
        </Button>
      </div>
    </header>
  )
}

