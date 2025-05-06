'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { IoClose } from 'react-icons/io5'
import styles from './AuthDialog.module.css'
import { supabase } from '../lib/supabaseClient'

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthDialog({ isOpen, onClose,}: AuthDialogProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; firstName?: string; lastName?: string }>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      console.log("Dialog opened, resetting state...")
      setInfoMessage('')
      setGeneralError('')
      setErrors({})

      const idToFocus = isSignUp ? 'signup-email' : 'signin-email'
      setTimeout(() => document.getElementById(idToFocus)?.focus(), 50)
    } else {
      console.log("Dialog closed, resetting loading state.")
      setIsLoading(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const idToFocus = isSignUp ? 'signup-email' : 'signin-email'
      document.getElementById(idToFocus)?.focus()
    }
  }, [isSignUp, isOpen])

  useEffect(() => {
    if (!isOpen) return

    const errorField = Object.keys(errors)[0]
    if (errorField) {
      let idToFocus = ''
      if (errorField === 'email') {
        idToFocus = isSignUp ? 'signup-email' : 'signin-email'
      } else if (errorField === 'password') {
        idToFocus = isSignUp ? 'signup-password' : 'signin-password'
      } else if (errorField === 'firstName') {
        idToFocus = 'signup-firstName'
      } else if (errorField === 'lastName') {
        idToFocus = 'signup-lastName'
      }
      setTimeout(() => document.getElementById(idToFocus)?.focus(), 50)
    }
  }, [errors, isSignUp, isOpen])

  const validateForm = () => {
    const newErrors: typeof errors = {}
    if (!email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email'

    if (!password) newErrors.password = 'Password is required'
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters'

    if (isSignUp) {
      if (!firstName) newErrors.firstName = 'First name is required'
      if (!lastName) newErrors.lastName = 'Last name is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading || !validateForm()) return

    setInfoMessage('')
    setGeneralError('')
    setErrors({})

    try {
      setIsLoading(true)

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              roles: 'customer'
            },
          },
        })

        if (signUpError && signUpError.message.includes('User already registered')) {
          setErrors({ email: 'An account with this email already exists.' })
          return
        }
        
        if (signUpError) throw signUpError

        setInfoMessage('🎉 Sign-up successful! Please check your email to verify your account.')
        setTimeout(() => {
          setIsSignUp(false)
          setInfoMessage('📧 Please verify your email before signing in.')
        }, 4000)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error?.message.toLowerCase().includes('invalid login credentials')) {
          setErrors({ email: 'Invalid email or password.', password: ' ' })
          return
        }

        if (error?.message.toLowerCase().includes('invalid email')) {
          setErrors({ email: 'Invalid email format.' })
          return
        }

        if (error) throw error

        if (data && !data.user?.email_confirmed_at) {
          setInfoMessage('📧 Please verify your email before signing in.')
          await supabase.auth.signOut().catch(console.error)
          return
        }

        setInfoMessage('✅ Signed in successfully.')
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (error: any) {
      const message = error.message?.toLowerCase() || ''
      console.error('Auth error details:', error)

      if (message.includes('email not confirmed') || message.includes('email not verified') || message.includes('verify your email')) {
        setInfoMessage('📧 Please verify your email before signing in.')
        supabase.auth.signOut().catch(console.error)
      } else if (message.includes('user already registered')) {
        setErrors({ email: 'An account with this email already exists.' })
      } else if (message.includes('invalid login credentials')) {
        setErrors({ email: 'Invalid email or password.', password: ' ' })
      } else if (message.includes('invalid email')) {
        setErrors({ email: 'Invalid email format.' })
      } else if (message.includes('password should be longer')) {
        setErrors({ password: 'Password should be at least 6 characters.' })
      } else {
        setGeneralError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (typeof window !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto'
  }

  return (
    <div className={`${styles.dialog} ${isOpen ? styles.open : ''}`} onClick={handleBackgroundClick}>
      <div className={styles.messageContainer} aria-live="polite">
        {infoMessage && <div className={styles.infoBanner}>{infoMessage}</div>}
        {generalError && <div className={styles.errorBanner}>{generalError}</div>}
      </div>

      <div className={`${styles.container} ${isSignUp ? styles.flipped : ''}`}>
        <div className={`${styles.card} ${isSignUp ? styles.signUp : styles.signIn}`}>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close dialog">
            <IoClose size={24} />
          </button>

          <div className={styles.header}>
            <h1 className={styles.title}>{!isSignUp ? 'Welcome back' : 'Create account'}</h1>
            <p className={styles.subtitle}>
              {!isSignUp ? 'Enter your details to continue' : 'Enter your details to create an account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor={isSignUp ? 'signup-email' : 'signin-email'} className={styles.label}>Email</label>
              <input
                id={isSignUp ? 'signup-email' : 'signin-email'}
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                aria-invalid={!!errors.email}
                autoComplete="username email"
                placeholder="your@email.com"
              />
              {errors.email && <span className={styles.error}>{errors.email}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor={isSignUp ? 'signup-password' : 'signin-password'} className={styles.label}>Password</label>
              <input
                id={isSignUp ? 'signup-password' : 'signin-password'}
                type="password"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                aria-invalid={!!errors.password}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder={isSignUp ? 'Choose a password' : 'Enter your password'}
              />
              {errors.password && <span className={styles.error}>{errors.password}</span>}
            </div>

            {isSignUp && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="signup-firstName" className={styles.label}>First Name</label>
                  <input
                    id="signup-firstName"
                    type="text"
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ''}`}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!errors.firstName}
                    placeholder="First name"
                  />
                  {errors.firstName && <span className={styles.error}>{errors.firstName}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="signup-lastName" className={styles.label}>Last Name</label>
                  <input
                    id="signup-lastName"
                    type="text"
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ''}`}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!errors.lastName}
                    placeholder="Last name"
                  />
                  {errors.lastName && <span className={styles.error}>{errors.lastName}</span>}
                </div>
              </>
            )}

            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? <Loader2 className={styles.loadingSpinner} size={16} /> : (!isSignUp ? 'Sign in' : 'Create account')}
            </button>
          </form>


          <div className={styles.footer}>
            <button
              onClick={() => !isLoading && setIsSignUp(!isSignUp)}
              className={styles.switchButton}
              disabled={isLoading}
              type="button"
            >
              {!isSignUp ? <>Don't have an account? <span>Sign up</span></> : <>Already have an account? <span>Sign in</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
