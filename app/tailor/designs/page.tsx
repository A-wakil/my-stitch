"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "../components/ui/button"
import { DesignForm } from "../components/dashboard/design-form"
import { DesignGrid } from "../components/dashboard/design-grid"
import styles from "../components/dashboard/styles/DesignsPage.module.css"
import { supabase } from "../../lib/supabaseClient"

export default function DesignsPage() {
  const [showForm, setShowForm] = useState(false)
  const router = useRouter()

  const handleFormSuccess = async () => {
    // Clear the cache
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { clearDesignCache } = await import("../components/dashboard/design-grid")
      clearDesignCache(user.id)
    }
    
    // Reload the page to show the new design immediately
    window.location.reload()
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>{showForm ? "Add New Design" : "Designs"}</h2>
        <Button className={styles['add-button']} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add New Design"}</Button>
      </div>
      <div className={styles.contentWrapper}>
        {showForm ? <DesignForm onSubmitSuccess={handleFormSuccess} /> : <DesignGrid />}
      </div>
    </div>
  )
}

