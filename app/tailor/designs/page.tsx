"use client"

import { useState } from "react"
import { Button } from "../components/ui/button"
import { DesignForm } from "../components/dashboard/design-form"
import { DesignGrid } from "../components/dashboard/design-grid"
import styles from "../components/dashboard/styles/DesignsPage.module.css"

export default function DesignsPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Designs</h2>
        <Button className={styles['add-button']} onClick={() => setShowForm(!showForm)}>{showForm ? "Cancel" : "Add New Design"}</Button>
      </div>
      <div className={styles.contentWrapper}>
        {showForm ? <DesignForm onSubmitSuccess={() => setShowForm(false)} /> : <DesignGrid />}
      </div>
    </div>
  )
}

