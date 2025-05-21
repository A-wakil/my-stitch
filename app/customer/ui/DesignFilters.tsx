'use client'

import styles from './DesignFilters.module.css'

interface FilterProps {
  filters: {
    gender: string | null;
    ageGroup: string | null;
  };
  onFilterChange: (filters: {
    gender: string | null;
    ageGroup: string | null;
  }) => void;
}

export function DesignFilters({ filters, onFilterChange }: FilterProps) {
  const handleGenderChange = (value: string | null) => {
    // Toggle if same value is selected
    const newValue = value === filters.gender ? null : value
    onFilterChange({ ...filters, gender: newValue })
  }

  const handleAgeGroupChange = (value: string | null) => {
    // Toggle if same value is selected
    const newValue = value === filters.ageGroup ? null : value
    onFilterChange({ ...filters, ageGroup: newValue })
  }

  const clearFilters = () => {
    onFilterChange({ gender: null, ageGroup: null })
  }

  return (
    <div className={styles.filterContainer}>
      <div className={styles.filterGroup}>
        <div className={styles.filterTitle}>Gender</div>
        <div className={styles.filterOptions}>
          <button 
            className={`${styles.filterButton} ${filters.gender === 'male' ? styles.active : ''}`}
            onClick={() => handleGenderChange('male')}
          >
            Male
          </button>
          <button 
            className={`${styles.filterButton} ${filters.gender === 'female' ? styles.active : ''}`}
            onClick={() => handleGenderChange('female')}
          >
            Female
          </button>
        </div>
      </div>

      <div className={styles.filterGroup}>
        <div className={styles.filterTitle}>Age Group</div>
        <div className={styles.filterOptions}>
          <button 
            className={`${styles.filterButton} ${filters.ageGroup === 'adult' ? styles.active : ''}`}
            onClick={() => handleAgeGroupChange('adult')}
          >
            Adult
          </button>
          <button 
            className={`${styles.filterButton} ${filters.ageGroup === 'kids' ? styles.active : ''}`}
            onClick={() => handleAgeGroupChange('kids')}
          >
            Kids
          </button>
        </div>
      </div>

      {(filters.gender || filters.ageGroup) && (
        <button 
          className={styles.clearButton}
          onClick={clearFilters}
        >
          Clear Filters
        </button>
      )}
    </div>
  )
} 