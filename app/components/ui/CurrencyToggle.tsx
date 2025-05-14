'use client'

import { CurrencyCode, CURRENCIES } from '../../lib/types'
import { useCurrency } from '../../context/CurrencyContext'
import styles from './CurrencyToggle.module.css'

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency()

  return (
    <div className={styles.currencyToggle}>
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
        className={styles.select}
      >
        {Object.values(CURRENCIES).map((curr) => (
          <option key={curr.code} value={curr.code}>
            {curr.symbol} {curr.code}
          </option>
        ))}
      </select>
    </div>
  )
} 