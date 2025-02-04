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
      const response = await fetch(`/api/designs/${designId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched design data:', data)
        setDesign(data)
      } else {
        setError("Failed to fetch design")
      }
    } catch (error) {
      console.error("Error fetching design:", error)
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
        <h2 className={styles.title}>Edit Design</h2>
        <DesignForm initialData={design} onSubmitSuccess={handleSubmitSuccess} />
      </div>
    </div>
  )
}

