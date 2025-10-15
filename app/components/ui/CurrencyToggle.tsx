'use client'

import { useState, useRef, useEffect } from 'react'
import { CurrencyCode, CURRENCIES } from '../../lib/types'
import { useCurrency } from '../../context/CurrencyContext'
import styles from './CurrencyToggle.module.css'

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentCurrency = CURRENCIES[currency]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (code: CurrencyCode) => {
    setCurrency(code)
    setIsOpen(false)
  }

  return (
    <div className={styles.currencyToggle} ref={dropdownRef}>
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select currency"
      >
        <span className={styles.symbolOnly}>{currentCurrency.symbol}</span>
        <span className={styles.fullDisplay}>{currentCurrency.symbol}{currentCurrency.code}</span>
        <svg 
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          width="12" 
          height="12" 
          viewBox="0 0 12 12" 
          fill="none"
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      {isOpen && (
        <div className={styles.dropdown}>
          {Object.values(CURRENCIES).map((curr) => (
            <button
              key={curr.code}
              className={`${styles.option} ${curr.code === currency ? styles.optionActive : ''}`}
              onClick={() => handleSelect(curr.code as CurrencyCode)}
            >
              <span className={styles.optionSymbol}>{curr.symbol}</span>
              <span className={styles.optionCode}>{curr.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 