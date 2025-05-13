'use client'

import { AuthDialog } from '../AuthDialog/AuthDialog'
import { useAuth } from '../lib/AuthContext'

export function AuthDialogWrapper() {
  const { isAuthDialogOpen, closeAuthDialog } = useAuth()
  
  return (
    <AuthDialog
      isOpen={isAuthDialogOpen}
      onClose={closeAuthDialog}
    />
  )
} 