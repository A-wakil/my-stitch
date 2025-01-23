import { Bell, LogOut } from "lucide-react"
import { Button } from "../components/ui/button"
import styles from "./header.module.css"

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.actions}>
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

