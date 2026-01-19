'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { CurrencyCode, CURRENCIES } from '../lib/types'
import { supabase } from '../lib/supabaseClient'
import { getExchangeRate, formatCurrency, convertAmount } from '../lib/services/currencyService'

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => Promise<void>
  formatAmount: (amount: number) => string
  convertToPreferred: (amount: number, fromCurrency: CurrencyCode) => Promise<number>
  getExchangeRate: (from: CurrencyCode, to: CurrencyCode) => Promise<number>
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('USD')

  useEffect(() => {
    async function initializeCurrency() {
      try {
        if (typeof window !== 'undefined') {
          const cached = window.localStorage.getItem('preferred_currency')
          if (cached && CURRENCIES[cached as CurrencyCode]) {
            setCurrencyState(cached as CurrencyCode)
            return
          }
        }

        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // Get user's preferred currency from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_currency')
            .eq('id', user.id)
            .single()

          if (profile?.preferred_currency) {
            setCurrencyState(profile.preferred_currency as CurrencyCode)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('preferred_currency', profile.preferred_currency)
            }
            return
          }
        }

        // If no user preference, try to detect from location
        try {
          const response = await fetch('https://ipapi.co/json/')
          const data = await response.json()
          
          // Map country codes to currencies
          const countryCurrencyMap: Record<string, CurrencyCode> = {
            'NG': 'NGN',
            'US': 'USD',
            // Add more mappings as needed
          }
          
          const detectedCurrency = countryCurrencyMap[data.country_code] || null
          if (detectedCurrency) {
            setCurrencyState(detectedCurrency)
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('preferred_currency', detectedCurrency)
            }
            if (user) {
              await supabase
                .from('profiles')
                .update({ preferred_currency: detectedCurrency })
                .eq('id', user.id)
            }
            return
          }
        } catch (error) {
          console.error('Failed to detect location:', error)
          // Default to USD if detection fails
        }

        // Fallback: infer from browser locale
        if (typeof window !== 'undefined') {
          const locale = Intl.NumberFormat().resolvedOptions().locale.toLowerCase()
          const fallbackCurrency = locale.includes('ng') ? 'NGN' : 'USD'
          setCurrencyState(fallbackCurrency)
          window.localStorage.setItem('preferred_currency', fallbackCurrency)
          if (user) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: fallbackCurrency })
              .eq('id', user.id)
          }
        }
      } catch (error) {
        console.error('Error initializing currency:', error)
      }
    }

    initializeCurrency()
  }, [])

  const setCurrency = async (code: CurrencyCode) => {
    if (!CURRENCIES[code]) return

    setCurrencyState(code)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('preferred_currency', code)
    }

    // Save preference if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code })
        .eq('id', user.id)
    }
  }

  const formatAmount = (amount: number): string => {
    return formatCurrency(amount, currency)
  }

  const convertToPreferred = async (amount: number, fromCurrency: CurrencyCode): Promise<number> => {
    if (fromCurrency === currency) return amount
    const { amount: converted } = await convertAmount(amount, fromCurrency, currency)
    return converted
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      formatAmount,
      convertToPreferred,
      getExchangeRate
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
} 