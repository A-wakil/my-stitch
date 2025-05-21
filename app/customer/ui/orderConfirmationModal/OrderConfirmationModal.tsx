'use client'

import React, { useState, useEffect, MouseEvent } from 'react'
import styles from './OrderConfirmationModal.module.css'
import { IoClose } from 'react-icons/io5'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'react-hot-toast'
import { Measurement } from '../../../lib/types'
import { loadStripe } from '@stripe/stripe-js'

interface OrderConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  orderDetails: {
    design: {
      id: string;
      title: string
      fabrics: Array<{
        name: string
        price: number
        colors: Array<{ name: string }>
      }>
      brand_name: string
      completion_time: number
      tailor_id: string;
    }
    selectedFabric: number
    selectedColor: number | null
    shippingAddress: string
    total: number
    measurement?: Measurement
    tailorNotes?: string
    userEmail?: string;
  }
  savedAddresses: string[]
  onAddressChange: (address: string) => void
  isLoading: boolean
  savedMeasurements: Measurement[];
  onMeasurementChange: (measurement: Measurement | undefined) => void;
  isLoadingMeasurements: boolean;
  isProcessingOrder?: boolean;
  onTailorNotesChange?: (notes: string) => void;
}

interface AddressForm {
  streetAddress: string;
  apartment?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

const calculateDeliveryDates = (completionTime: number) => {
  const today = new Date();
  const minWeeks = completionTime + 2; // completion time + 2 weeks min shipping
  const maxWeeks = completionTime + 3; // completion time + 3 weeks max shipping
  
  const earliestDate = new Date(today.setDate(today.getDate() + (minWeeks * 7)));
  const latestDate = new Date(today.setDate(today.getDate() + ((maxWeeks - minWeeks) * 7)));
  
  return {
    earliest: earliestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }),
    latest: latestDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  };
};

// Initialize Stripe in client
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function OrderConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  orderDetails,
  savedAddresses,
  onAddressChange,
  isLoading,
  savedMeasurements,
  onMeasurementChange,
  isLoadingMeasurements,
  isProcessingOrder,
  onTailorNotesChange
}: OrderConfirmationModalProps) {
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressForm>({
    streetAddress: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States'
  });

  useEffect(() => {
    if (!isLoading && savedAddresses.length === 0) {
      setIsNewAddress(true);
    }
  }, [isLoading, savedAddresses]);

  if (!isOpen) return null

  const selectedColor = orderDetails.selectedColor !== null 
    ? orderDetails.design.fabrics[orderDetails.selectedFabric].colors[orderDetails.selectedColor].name 
    : 'No color selected'

  const handleAddressFormChange = (field: keyof AddressForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setAddressForm(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const validateAddressForm = () => {
    if (!addressForm.streetAddress.trim()) {
      toast.error('Street address is required');
      return false;
    }
    if (!addressForm.city.trim()) {
      toast.error('City is required');
      return false;
    }
    if (!addressForm.state.trim()) {
      toast.error('State is required');
      return false;
    }
    if (!addressForm.zipCode.trim()) {
      toast.error('ZIP code is required');
      return false;
    }
    
    // Validate ZIP code format (5 digits or 5+4 format)
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(addressForm.zipCode)) {
      toast.error('Please enter a valid ZIP code (e.g., 12345 or 12345-6789)');
      return false;
    }

    return true;
  };

  const handleSaveAddress = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (validateAddressForm()) {
      const formattedAddress = `${addressForm.streetAddress}${
        addressForm.apartment ? ` ${addressForm.apartment},` : ','
      } ${addressForm.city}, ${addressForm.state} ${addressForm.zipCode}, ${addressForm.country}`;
      
      onAddressChange(formattedAddress);
      setIsNewAddress(false);
      setAddressForm({
        streetAddress: '',
        apartment: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      });
      toast.success('Address saved successfully');
    }
  };

  const handleChangeAddress = () => {
    setIsNewAddress(true);
    onAddressChange('');
    setAddressForm({
      streetAddress: '',
      apartment: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    });
  };

  const handleMeasurementChange = (measurementId: string) => {
    if (measurementId === '') {
      onMeasurementChange(undefined);
    } else {
      const measurement = savedMeasurements.find(m => m.id.toString() === measurementId);
      if (measurement) {
        onMeasurementChange(measurement);
      }
    }
  };

  const isOrderValid = () => {
    const hasValidAddress = Boolean(orderDetails.shippingAddress);
    const hasValidMeasurement = Boolean(orderDetails.measurement);
    
    return hasValidAddress && hasValidMeasurement;
  };

  const handleAddressChange = (value: string) => {
    if (value === 'new') {
      setIsNewAddress(true);
      onAddressChange('');
    } else {
      setIsNewAddress(false);
      onAddressChange(value);
    }
  };

  const deliveryDates = calculateDeliveryDates(orderDetails.design.completion_time);

  // Add handler to close modal when clicking outside
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Stripe checkout handler
  const handleStripeCheckout = async () => {
    if (!isOrderValid()) {
      toast.error('Please complete all required fields');
      return;
    }

    try {
      // Set loading state
      // onConfirm(); <-- Remove this line, don't create order yet

      // Log the request payload for debugging
      const payload = {
        orderDetails: {
          design: {
            title: orderDetails.design.title,
            fabrics: orderDetails.design.fabrics,
            id: orderDetails.design.id,
            tailor_id: orderDetails.design.tailor_id,
          },
          selectedFabric: orderDetails.selectedFabric,
          selectedColor: orderDetails.selectedColor,
          shippingAddress: orderDetails.shippingAddress,
          measurement: orderDetails.measurement,
          tailorNotes: orderDetails.tailorNotes,
          total: orderDetails.total,
          email: orderDetails.userEmail,
        }
      };

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error?.message || 
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.sessionId) {
        throw new Error('No session ID returned from server');
      }

      // Get Stripe instance
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Failed to load payment system');
      }

      // Redirect to Stripe Checkout
      const { error: redirectError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (redirectError) {
        throw new Error(redirectError.message || 'Failed to redirect to checkout');
      }
    } catch (err: any) {
      // Log the full error for debugging
      console.error('Checkout error details:', {
        message: err.message,
        stack: err.stack,
        error: err
      });
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>Confirm your order</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <IoClose size={24} />
          </button>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.orderInfo}>
            <h3>Arriving {deliveryDates.earliest} - {deliveryDates.latest}</h3>
            <p className={styles.seller}>Ships from {orderDetails.design.brand_name}</p>
          </div>

          <div className={styles.section}>
            <h4>Ship to</h4>
            {orderDetails.shippingAddress && !isNewAddress ? (
              <div className={styles.savedInfo}>
                <p>{orderDetails.shippingAddress}</p>
                <button 
                  onClick={handleChangeAddress}
                  className={styles.changeButton}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                {savedAddresses.length > 0 && (
                  <select 
                    value={isNewAddress ? 'new' : orderDetails.shippingAddress} 
                    onChange={(e) => handleAddressChange(e.target.value)}
                    className={styles.addressSelect}
                  >
                    <option value="">Select an address...</option>
                    {savedAddresses.map((address, index) => (
                      <option key={index} value={address}>
                        {address}
                      </option>
                    ))}
                    <option value="new">+ Add new address</option>
                  </select>
                )}
                
                {isNewAddress && (
                  <div className={styles.newAddressForm}>
                    <div className={styles.formField}>
                      <label htmlFor="streetAddress">Street Address *</label>
                      <input
                        id="streetAddress"
                        type="text"
                        value={addressForm.streetAddress}
                        onChange={handleAddressFormChange('streetAddress')}
                        placeholder="123 Main St"
                        className={styles.addressInput}
                        required
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="apartment">Apartment, suite, etc. (optional)</label>
                      <input
                        id="apartment"
                        type="text"
                        value={addressForm.apartment}
                        onChange={handleAddressFormChange('apartment')}
                        placeholder="Apt 4B"
                        className={styles.addressInput}
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label htmlFor="city">City *</label>
                        <input
                          id="city"
                          type="text"
                          value={addressForm.city}
                          onChange={handleAddressFormChange('city')}
                          placeholder="City"
                          className={styles.addressInput}
                          required
                        />
                      </div>

                      <div className={styles.formField}>
                        <label htmlFor="state">State *</label>
                        <input
                          id="state"
                          type="text"
                          value={addressForm.state}
                          onChange={handleAddressFormChange('state')}
                          placeholder="State"
                          className={styles.addressInput}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label htmlFor="zipCode">ZIP Code *</label>
                        <input
                          id="zipCode"
                          type="text"
                          value={addressForm.zipCode}
                          onChange={handleAddressFormChange('zipCode')}
                          placeholder="12345"
                          className={styles.addressInput}
                          required
                        />
                      </div>

                      <div className={styles.formField}>
                        <label htmlFor="country">Country</label>
                        <input
                          id="country"
                          type="text"
                          value={addressForm.country}
                          onChange={handleAddressFormChange('country')}
                          className={styles.addressInput}
                          disabled
                        />
                      </div>
                    </div>

                    <div className={styles.formButtons}>
                      {savedAddresses.length > 0 && (
                        <button 
                          onClick={handleChangeAddress}
                          className={styles.cancelBtn}
                          type="button"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        onClick={handleSaveAddress}
                        className={`${styles.saveAddressBtn} ${savedAddresses.length === 0 ? styles.fullWidth : ''}`}
                        type="button"
                      >
                        Save Address
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={styles.section}>
            <h4>Measurements</h4>
            {orderDetails.measurement ? (
              <div className={styles.measurementDisplay}>
                <h5>{orderDetails.measurement.name}</h5>
                <div className={styles.measurementGrid}>
                  {Object.entries(orderDetails.measurement)
                    .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at', 'name'].includes(key))
                    .map(([key, value]) => (
                      <div key={key} className={styles.measurementItem}>
                        <span className={styles.measurementLabel}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </span>
                        <span className={styles.measurementValue}>
                          {typeof value === 'number' ? `${value} inches` : value}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <p className={styles.noMeasurements}>
                No measurement selected. Please select a measurement before placing an order.
              </p>
            )}
          </div>

          <div className={styles.section}>
            <h4>Notes for Tailor</h4>
            <textarea
              className={styles.tailorNotes}
              placeholder="Add any specific instructions for the tailor (optional). For example: 'I'd like the sleeves to be shorter' or 'Make the collar wider please'."
              value={orderDetails.tailorNotes || ''}
              onChange={(e) => onTailorNotesChange?.(e.target.value)}
              rows={4}
            />
            <p className={styles.notesHelper}>These notes will be attached to your order and visible to the tailor.</p>
          </div>

          <div className={styles.section}>
            <h4>Order Summary</h4>
            <div className={styles.orderDetails}>
              <p>Design: {orderDetails.design.title}</p>
              <p>Fabric: {orderDetails.design.fabrics[orderDetails.selectedFabric].name}</p>
              <p className={styles.colorDetail}>
                Color: 
                <span 
                  className={styles.colorPill}
                  style={{ 
                    backgroundColor: selectedColor,
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    marginLeft: '8px',
                    verticalAlign: 'middle',
                    border: '1px solid #ddd'
                  }}
                />
              </p>
            </div>
          </div>

          <div className={styles.total}>
            <h4>Total</h4>
            <p>${orderDetails.total.toFixed(2)}</p>
            <span className={styles.taxNote}>(includes tax)</span>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <p className={styles.terms}>
            By placing your order, you agree to our{' '}
            <a href="#">privacy notice</a> and <a href="#">conditions of use</a>.
          </p>
          <button
            onClick={handleStripeCheckout}
            className={`${styles.confirmButton} ${!isOrderValid() || isProcessingOrder ? styles.confirmButtonDisabled : ''}`}
            disabled={!isOrderValid() || isProcessingOrder}
          >
            {isProcessingOrder ? 'Redirecting to Stripe...' : 'Pay with Stripe'}
          </button>
        </div>
      </div>
    </div>
  )
} 