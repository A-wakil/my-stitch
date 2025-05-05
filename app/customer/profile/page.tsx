'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { IoArrowBack } from 'react-icons/io5'
import { supabase } from '../../lib/supabaseClient'
import styles from './profile.module.css'
// import { AccountDetails } from '../../lib/types'
import { toast } from 'react-hot-toast'

interface AccountDetails {
    id: string;
    user_id: string;
    full_name: string;
    phone_number: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    card_number: string;
    expiration_date: string;
    email: string;
    language: string;
    currency: string;
    email_notifications: boolean;
    sms_notifications: boolean;
    created_at: string | null;
    updated_at: string | null;
    cvv: string;
}

// Add these helper functions at the top of the file
const formatCardNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Add space after every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.slice(0, 19);
};

const formatExpirationDate = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Add slash after first 2 digits
    if (digits.length >= 2) {
        return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
};

const validateExpirationDate = (value: string): boolean => {
    if (!value.includes('/')) return false;
    
    const [month, year] = value.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1; // Months are 0-based
    
    const numMonth = parseInt(month, 10);
    const numYear = parseInt(year, 10);
    
    if (numMonth < 1 || numMonth > 12) return false;
    if (numYear < currentYear) return false;
    if (numYear === currentYear && numMonth < currentMonth) return false;
    
    return true;
};

const formatCVV = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    // Limit to 4 digits (some cards have 4-digit CVV)
    return digits.slice(0, 4);
};

export default function UserAccountDetails() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [accountDetails, setAccountDetails] = useState<AccountDetails>({
        id: '',
        user_id: '',
        full_name: '',
        phone_number: '',
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        card_number: '',
        expiration_date: '',
        email: '',
        language: 'en',
        currency: 'usd',
        email_notifications: false,
        sms_notifications: false,
        created_at: null,
        updated_at: null,
        cvv: ''
    })

    // Fetch user details on component mount
    useEffect(() => {
        async function fetchUserDetails() {
            setIsLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                
                if (!user) {
                    throw new Error('No user found')
                }

                const { data, error } = await supabase
                    .from('customer_details')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle()

                if (error) {
                    throw error
                }

                if (data) {
                    setAccountDetails(data)
                } else {
                    // Initialize with empty default values
                    setAccountDetails({
                        id: '',
                        user_id: user.id,
                        full_name: '',
                        phone_number: '',
                        street_address: '',
                        city: '',
                        state: '',
                        postal_code: '',
                        country: '',
                        card_number: '',
                        expiration_date: '',
                        email: user.email || '', // Set from auth user
                        language: 'en',          // Default value
                        currency: 'usd',         // Default value
                        email_notifications: false,
                        sms_notifications: false,
                        created_at: null,
                        updated_at: null,
                        cvv: ''
                    })
                }
            } catch (error: any) {
                console.error('Error fetching user details:', error.message || error)
                toast.error('Failed to load account details')
            } finally {
                setIsLoading(false)
            }
        }

        fetchUserDetails()
    }, [])

    const handleInputChange = (field: keyof AccountDetails, value: any) => {
        let formattedValue = value;

        // Apply formatting based on field
        if (field === 'card_number') {
            formattedValue = formatCardNumber(value);
        } else if (field === 'expiration_date') {
            formattedValue = formatExpirationDate(value);
        } else if (field === 'cvv') {
            formattedValue = formatCVV(value);
        }

        setAccountDetails(prev => ({
            ...prev,
            [field]: formattedValue
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                throw new Error('No user found')
            }

            // Remove id field when saving as it's auto-generated
            const { id, created_at, updated_at, ...dataToSave } = accountDetails;

            // Check if account details already exist
            const { data: existingData } = await supabase
                .from('customer_details')
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle()

            if (existingData) {
                // Update existing record
                const { error } = await supabase
                    .from('customer_details')
                    .update(dataToSave)
                    .eq('user_id', user.id)

                if (error) throw error
            } else {
                // Insert new record
                const { error } = await supabase
                    .from('customer_details')
                    .insert([{ ...dataToSave, user_id: user.id }])

                if (error) throw error
            }

            toast.success('Profile updated successfully')
        } catch (error: any) {
            console.error('Error saving profile:', error.message || error)
            toast.error('Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return <div className={styles.loading}>Loading...</div>
    }

    return (
        <div className={styles.container}>
            <div className={styles.headerRow}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <IoArrowBack size={24} />
                    <span>Back</span>
                </button>
                <h1 className={styles.title}>Account Details</h1>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.gridContainer}>
                    {/* Left Column */}
                    <div className={styles.column}>
                        {/* Personal Information Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Personal Information</h2>
                            <div className={styles.form}>
                                <label className={styles.label}>
                                    Full Name
                                    <input
                                        type="text"
                                        value={accountDetails.full_name || ''}
                                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                                <label className={styles.label}>
                                    Email
                                    <input
                                        type="email"
                                        value={accountDetails.email || ''}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                                <label className={styles.label}>
                                    Phone Number
                                    <input
                                        type="tel"
                                        value={accountDetails.phone_number || ''}
                                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                            </div>
                        </section>

                        {/* Payment Details Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Payment Details</h2>
                            <div className={styles.form}>
                                <label className={styles.label}>
                                    Card Number
                                    <input
                                        type="text"
                                        value={accountDetails.card_number || ''}
                                        onChange={(e) => handleInputChange('card_number', e.target.value)}
                                        className={styles.input}
                                        placeholder="1234 5678 9012 3456"
                                        maxLength={19}
                                        inputMode="numeric"
                                    />
                                    <span className={styles.fieldHint}>
                                        16-digit card number
                                    </span>
                                </label>
                                <div className={styles.formRow}>
                                    <label className={styles.label}>
                                        Expiration Date
                                        <input
                                            type="text"
                                            value={accountDetails.expiration_date || ''}
                                            onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                                            className={`${styles.input} ${
                                                accountDetails.expiration_date && 
                                                !validateExpirationDate(accountDetails.expiration_date) 
                                                    ? styles.inputError 
                                                    : ''
                                            }`}
                                            placeholder="MM/YY"
                                            maxLength={5}
                                            inputMode="numeric"
                                        />
                                        {accountDetails.expiration_date && 
                                         !validateExpirationDate(accountDetails.expiration_date) && (
                                            <span className={styles.errorText}>
                                                Please enter a valid future date (MM/YY)
                                            </span>
                                        )}
                                    </label>
                                    <label className={styles.label}>
                                        CVV
                                        <input
                                            type="password"
                                            value={accountDetails.cvv || ''}
                                            onChange={(e) => handleInputChange('cvv', formatCVV(e.target.value))}
                                            className={styles.input}
                                            placeholder="123"
                                            maxLength={4}
                                            inputMode="numeric"
                                            autoComplete="cc-csc"
                                        />
                                        <span className={styles.fieldHint}>
                                            3-4 digits on back of card
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column */}
                    <div className={styles.column}>
                        {/* Address Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Address</h2>
                            <div className={styles.form}>
                                <label className={styles.label}>
                                    Street Address
                                    <input
                                        type="text"
                                        value={accountDetails.street_address || ''}
                                        onChange={(e) => handleInputChange('street_address', e.target.value)}
                                        className={styles.input}
                                    />
                                </label>
                                <div className={styles.formRow}>
                                    <label className={styles.label}>
                                        City
                                        <input
                                            type="text"
                                            value={accountDetails.city || ''}
                                            onChange={(e) => handleInputChange('city', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                    <label className={styles.label}>
                                        State
                                        <input
                                            type="text"
                                            value={accountDetails.state || ''}
                                            onChange={(e) => handleInputChange('state', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                </div>
                                <div className={styles.formRow}>
                                    <label className={styles.label}>
                                        Postal Code
                                        <input
                                            type="text"
                                            value={accountDetails.postal_code || ''}
                                            onChange={(e) => handleInputChange('postal_code', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                    <label className={styles.label}>
                                        Country
                                        <input
                                            type="text"
                                            value={accountDetails.country || ''}
                                            onChange={(e) => handleInputChange('country', e.target.value)}
                                            className={styles.input}
                                        />
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Preferences Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Preferences</h2>
                            <div className={styles.form}>
                                <div className={styles.settingsGroup}>
                                    <div className={styles.formRow}>
                                        <label className={styles.label}>
                                            Language
                                            <select
                                                value={accountDetails.language}
                                                onChange={(e) => handleInputChange('language', e.target.value)}
                                                className={styles.select}
                                            >
                                                <option value="en">English</option>
                                                <option value="es">Español</option>
                                            </select>
                                        </label>
                                        <label className={styles.label}>
                                            Currency
                                            <select
                                                value={accountDetails.currency}
                                                onChange={(e) => handleInputChange('currency', e.target.value)}
                                                className={styles.select}
                                            >
                                                <option value="usd">USD</option>
                                                <option value="eur">EUR</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>

                                <div className={styles.settingsGroup}>
                                    <h3 className={styles.subsectionTitle}>Notifications</h3>
                                    <div className={styles.checkboxContainer}>
                                        <div className={styles.checkboxGroup}>
                                            <input
                                                type="checkbox"
                                                id="emailNotifications"
                                                checked={accountDetails.email_notifications}
                                                onChange={(e) => handleInputChange('email_notifications', e.target.checked)}
                                                className={styles.checkbox}
                                            />
                                            <label htmlFor="emailNotifications" className={styles.checkboxLabel}>
                                                Email Notifications
                                            </label>
                                        </div>
                                        <div className={styles.checkboxGroup}>
                                            <input
                                                type="checkbox"
                                                id="smsNotifications"
                                                checked={accountDetails.sms_notifications}
                                                onChange={(e) => handleInputChange('sms_notifications', e.target.checked)}
                                                className={styles.checkbox}
                                            />
                                            <label htmlFor="smsNotifications" className={styles.checkboxLabel}>
                                                SMS Notifications
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className={styles.buttonContainer}>
                    <button type="submit" className={styles.saveButton} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    )
}
