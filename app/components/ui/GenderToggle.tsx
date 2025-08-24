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
    } else if (currentGender === 'female') {
      onGenderChange('male')
    } else {
      // If no gender selected, default to male
      onGenderChange('male')
    }
  }

  // Determine what to show in the pill
  const getDisplayText = () => {
    if (currentGender === 'female') {
      return 'Women'
    } else if (currentGender === 'male') {
      return 'Men'
    } else {
      return 'Men'
    }
  }

  const getDisplayIcon = () => {
    if (currentGender === 'female') {
      return '👗'
    } else if (currentGender === 'male') {
      return '👔'
    } else {
      return '👔'
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