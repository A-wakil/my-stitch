'use client'

import { ReactNode } from 'react'
import { AuthProvider } from "../lib/AuthContext"
import { Toaster } from 'react-hot-toast'
import { ProfileProvider } from "../context/ProfileContext"
import { AuthDialogWrapper } from "../components/AuthDialogWrapper"
import { PostHogProvider } from "./PostHogProvider"
import { CurrencyProvider } from "../context/CurrencyContext"
import { GenderProvider } from "../context/GenderContext"
import { BagProvider } from "../context/BagContext"

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <PostHogProvider>
      <AuthProvider>
        <ProfileProvider>
          <CurrencyProvider>
            <GenderProvider>
              <BagProvider>
                {children}
                <Toaster />
                <AuthDialogWrapper />
              </BagProvider>
            </GenderProvider>
          </CurrencyProvider>
        </ProfileProvider>
      </AuthProvider>
    </PostHogProvider>
  )
}

