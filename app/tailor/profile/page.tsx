'use client'
import { useState } from "react"
import { TailorProfileForm } from "../components/dashboard/tailor-profile-form"
import { TailorProfileDisplay } from "../components/dashboard/tailor-profile-display"
import styles from "./page.module.css"


export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className={styles.container}>
      {!isEditing ? (<TailorProfileDisplay onEdit={() => setIsEditing(true)} />) 
       : (<TailorProfileForm onComplete={() => setIsEditing(false)} />)}
    </div>
  )
}

