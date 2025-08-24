'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

interface GenderContextType {
  gender: string | null
  setGender: (gender: string | null) => void
}

const GenderContext = createContext<GenderContextType | undefined>(undefined)

export function GenderProvider({ children }: { children: ReactNode }) {
  const [gender, setGender] = useState<string | null>(null)

  return (
    <GenderContext.Provider value={{ gender, setGender }}>
      {children}
    </GenderContext.Provider>
  )
}

export function useGender() {
  const context = useContext(GenderContext)
  if (context === undefined) {
    throw new Error('useGender must be used within a GenderProvider')
  }
  return context
} 