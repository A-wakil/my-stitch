"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { DesignForm } from "../../../components/dashboard/design-form"

export default function EditDesignPage() {
  const params = useParams()
  const designId = params?.id as string
  const [design, setDesign] = useState(null)
  const router = useRouter()

  useEffect(() => {
    fetchDesign()
  }, [designId])

  const fetchDesign = async () => {
    try {
      const response = await fetch(`/api/designs/${designId}`)
      if (response.ok) {
        const data = await response.json()
        setDesign(data)
      } else {
        console.error("Failed to fetch design")
      }
    } catch (error) {
      console.error("Error fetching design:", error)
    }
  }

  const handleSubmitSuccess = () => {
    router.push("/dashboard/designs")
  }

  if (!design) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Edit Design</h2>
      <DesignForm initialData={design} onSubmitSuccess={handleSubmitSuccess} />
    </div>
  )
}

