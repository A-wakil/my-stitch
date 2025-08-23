'use client'

import styles from './DesignFilters.module.css'

interface FilterProps {
  filters: {
    gender: string | null;
  };
  onFilterChange: (filters: {
    gender: string | null;
  }) => void;
}

export function DesignFilters({ filters, onFilterChange }: FilterProps) {
  const handleGenderChange = (value: string | null) => {
    // Toggle if same value is selected
    const newValue = value === filters.gender ? null : value
    onFilterChange({ gender: newValue })
  }

  const clearFilters = () => {
    onFilterChange({ gender: null })
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

      {filters.gender && (
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