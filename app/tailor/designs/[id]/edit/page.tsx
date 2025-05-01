"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { DesignForm } from "../../../components/dashboard/design-form"
import styles from "./page.module.css"

export default function EditDesignPage() {
  const params = useParams()
  const designId = params?.id as string
  const [design, setDesign] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    fetchDesign()
  }, [designId])

  const fetchDesign = async () => {
    try {
      setIsLoading(true)
      setError("")
      const response = await fetch(`/api/designs/${designId}`, {
        cache: 'no-store'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.fabric?.image) {
          data.fabric.image = new URL(data.fabric.image, window.location.origin).toString()
        }
        setDesign(data)
      } else {
        setError("Failed to fetch design")
      }
    } catch (error) {
      console.error("Error fetching design:", error)
      setError("An error occurred while fetching the design")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitSuccess = () => {
    router.push("/tailor/designs")
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.errorText}>{error}</div>
      </div>
    )
  }

  if (!design) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingText}>Design not found</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>Edit Design</h2>
          <button 
            onClick={() => router.push('/tailor/designs')} 
            className={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
        <DesignForm initialData={design} onSubmitSuccess={handleSubmitSuccess} />
      </div>
    </div>
  )
}

