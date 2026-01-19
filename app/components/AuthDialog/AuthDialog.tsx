'use client'

import { useState, useEffect, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { IoClose } from 'react-icons/io5'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import styles from './AuthDialog.module.css'
import { supabase } from '../../lib/supabaseClient'

interface AuthDialogProps {
  isOpen: boolean
  onClose: () => void
  defaultRole?: 'customer' | 'tailor' | 'both'
  redirectTo?: string | null
}

export function AuthDialog({ isOpen, onClose, defaultRole = 'customer', redirectTo }: AuthDialogProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<'customer' | 'tailor' | 'both'>(defaultRole)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [generalError, setGeneralError] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; firstName?: string; lastName?: string; role?: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Generate unique IDs for inputs to avoid duplicates
  const uniqueId = useId()
  const emailInputId = isForgotPassword ? `forgot-email-${uniqueId}` : isSignUp ? `signup-email-${uniqueId}` : `signin-email-${uniqueId}`
  const passwordInputId = isSignUp ? `signup-password-${uniqueId}` : `signin-password-${uniqueId}`
  const firstNameInputId = `signup-firstName-${uniqueId}`
  const lastNameInputId = `signup-lastName-${uniqueId}`

  useEffect(() => {
    if (isOpen) {
      console.log("Dialog opened, resetting state...")
      setInfoMessage('')
      setGeneralError('')
      setErrors({})
      setRole(defaultRole)

      // Focus email input on open
      setTimeout(() => document.getElementById(emailInputId)?.focus(), 50)
    } else {
      console.log("Dialog closed, resetting loading state.")
      setIsLoading(false)
      setIsForgotPassword(false) // Reset forgot password state when closing
    }
  }, [isOpen, isSignUp, isForgotPassword])

  useEffect(() => {
    if (isOpen) {
      // Refocus email when toggling between sign-in and sign-up
      document.getElementById(emailInputId)?.focus()
    }
  }, [isSignUp, isOpen])

  useEffect(() => {
    if (!isOpen) return

    // Focus the first field with an error
    const errorField = Object.keys(errors)[0]
    if (errorField) {
      let idToFocus = ''
      if (errorField === 'email') {
        idToFocus = emailInputId
      } else if (errorField === 'password') {
        idToFocus = passwordInputId
      } else if (errorField === 'firstName') {
        idToFocus = firstNameInputId
      } else if (errorField === 'lastName') {
        idToFocus = lastNameInputId
      }
      setTimeout(() => document.getElementById(idToFocus)?.focus(), 50)
    }
  }, [errors, isSignUp, isOpen])

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; firstName?: string; lastName?: string; role?: string } = {}

    if (!email) newErrors.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format'

    // Only validate password and other fields if not in forgot password mode
    if (!isForgotPassword) {
      if (!password) newErrors.password = 'Password is required'
      else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters'

      if (isSignUp) {
        if (!firstName) newErrors.firstName = 'First name is required'
        if (!lastName) newErrors.lastName = 'Last name is required'
        if (!role) newErrors.role = 'Please select a role'
      }
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

      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        if (error) throw error

        setInfoMessage('📧 Password reset email sent! Please check your inbox and follow the instructions.')
        setTimeout(() => {
          setIsForgotPassword(false)
          setInfoMessage('👈 You can now sign in with your new password.')
        }, 3000)
        return
      }

      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              roles: role
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

        const userRole = data?.user?.user_metadata?.roles
        let target = redirectTo || null

        if (!target && (userRole === 'tailor' || userRole === 'both')) {
          target = '/tailor'
        }

        if (!target && data?.user?.id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('roles')
            .eq('id', data.user.id)
            .single()
          if (profileData?.roles === 'tailor' || profileData?.roles === 'both') {
            target = '/tailor'
          }
        }

        if (target) {
          onClose()
          router.push(target)
          return
        }

        setInfoMessage('✅ Signed in successfully.')
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message?.toLowerCase() || '' : ''
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
            <h1 className={styles.title}>
              {isForgotPassword ? 'Reset Password' : !isSignUp ? 'Welcome back' : 'Create account'}
            </h1>
            <p className={styles.subtitle}>
              {isForgotPassword 
                ? 'Enter your email to receive a password reset link' 
                : !isSignUp 
                  ? 'Enter your details to continue' 
                  : 'Enter your details to create an account'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor={emailInputId} className={styles.label}>Email</label>
              <input
                id={emailInputId}
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

            {!isForgotPassword && (
              <div className={styles.formGroup}>
                <label htmlFor={passwordInputId} className={styles.label}>Password</label>
                <div className={styles.passwordWrapper}>
                  <input
                    id={passwordInputId}
                    type={showPassword ? "text" : "password"}
                    className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    placeholder={isSignUp ? 'Choose a password' : 'Enter your password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={styles.passwordToggle}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.password && <span className={styles.error}>{errors.password}</span>}
                
                {!isSignUp && (
                  <div className={styles.forgotPasswordWrapper}>
                    <button
                      onClick={() => !isLoading && setIsForgotPassword(true)}
                      className={styles.forgotPasswordButton}
                      disabled={isLoading}
                      type="button"
                    >
                      Forgot your password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {isSignUp && !isForgotPassword && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor={firstNameInputId} className={styles.label}>First Name</label>
                  <input
                    id={firstNameInputId}
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
                  <label htmlFor={lastNameInputId} className={styles.label}>Last Name</label>
                  <input
                    id={lastNameInputId}
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
                <div className={styles.formGroup}>
                  <label className={styles.label}>Role</label>
                  <div className={styles.rolePills} role="radiogroup" aria-invalid={!!errors.role}>
                    {[
                      { value: 'customer', label: 'Customer' },
                      { value: 'tailor', label: 'Tailor' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`${styles.rolePill} ${role === option.value ? styles.rolePillActive : ''}`}
                        onClick={() => setRole(option.value as 'customer' | 'tailor')}
                        disabled={isLoading}
                        role="radio"
                        aria-checked={role === option.value}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {errors.role && <span className={styles.error}>{errors.role}</span>}
                </div>
              </>
            )}

            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className={styles.loadingSpinner} size={16} />
              ) : isForgotPassword ? (
                'Send Reset Email'
              ) : !isSignUp ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>


          <div className={styles.footer}>
            {!isForgotPassword ? (
              <button
                onClick={() => !isLoading && setIsSignUp(!isSignUp)}
                className={styles.switchButton}
                disabled={isLoading}
                type="button"
              >
                {!isSignUp ? <>Don&apos;t have an account? <span>Sign up</span></> : <>Already have an account? <span>Sign in</span></>}
              </button>
            ) : (
              <button
                onClick={() => !isLoading && setIsForgotPassword(false)}
                className={styles.switchButton}
                disabled={isLoading}
                type="button"
              >
                ← Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
