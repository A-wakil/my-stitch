'use client'

import styles from './GenderToggle.module.css'

interface GenderToggleProps {
  currentGender: string | null;
  onGenderChange: (gender: string | null) => void;
}

export function GenderToggle({ currentGender, onGenderChange }: GenderToggleProps) {
  const handleToggle = () => {
    if (currentGender === 'male') {
      onGenderChange('female')
    } else {
      // If female or null, switch to male
      onGenderChange('male')
    }
  }

  // Determine what to show in the pill
  const getDisplayText = () => {
    if (currentGender === 'male') {
      return 'Men'
    } else if (currentGender === 'female') {
      return 'Women'
    } else {
      return 'Men' // Default fallback
    }
  }

  const getDisplayIcon = () => {
    if (currentGender === 'male') {
      return '👔'
    } else if (currentGender === 'female') {
      return '👗'
    } else {
      return '👔' // Default fallback
    }
  }

  return (
    <button 
      className={styles.genderToggle}
      onClick={handleToggle}
      title={`Switch to ${getDisplayText()}'s collection`}
    >
      <span className={styles.icon}>{getDisplayIcon()}</span>
      <span className={styles.text}>{getDisplayText()}</span>
    </button>
  )
} 