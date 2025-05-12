import React, { useState, useEffect, MouseEvent } from 'react'
import styles from './OrderConfirmationModal.module.css'
import { IoClose } from 'react-icons/io5'
import { supabase } from '../../../lib/supabaseClient'
import { toast } from 'react-hot-toast'
import { Measurement } from '../../../lib/types'

interface OrderConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  orderDetails: {
    design: {
      title: string
      fabrics: Array<{
        name: string
        price: number
        colors: Array<{ name: string }>
      }>
      brand_name: string
      completion_time: number
    }
    selectedFabric: number
    selectedColor: number | null
    shippingAddress: string
    paymentMethod: string
    total: number
    measurement?: Measurement
    tailorNotes?: string
  }
  savedAddresses: string[]
  onAddressChange: (address: string) => void
  isLoading: boolean
  savedPaymentMethods: Array<{
    cardNumber: string;
    expirationDate: string;
  }>;
  onPaymentMethodChange: (method: string) => void;
  isLoadingPayment: boolean;
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

interface PaymentForm {
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  cardholderName: string;
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

export default function OrderConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  orderDetails,
  savedAddresses,
  onAddressChange,
  isLoading,
  savedPaymentMethods,
  onPaymentMethodChange,
  isLoadingPayment,
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
  const [isNewPayment, setIsNewPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    cardNumber: '',
    expirationDate: '',
    cvv: '',
    cardholderName: ''
  });

  useEffect(() => {
    if (!isLoading && savedAddresses.length === 0) {
      setIsNewAddress(true);
    }
  }, [isLoading, savedAddresses]);

  useEffect(() => {
    if (!isLoadingPayment && savedPaymentMethods.length === 0) {
      setIsNewPayment(true);
    }
  }, [isLoadingPayment, savedPaymentMethods]);

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

  const handlePaymentFormChange = (field: keyof PaymentForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPaymentForm(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const validatePaymentForm = () => {
    if (!paymentForm.cardholderName.trim()) {
      toast.error('Cardholder name is required');
      return false;
    }

    if (!paymentForm.cardNumber.trim()) {
      toast.error('Card number is required');
      return false;
    }

    // Validate card number (16 digits, can include spaces)
    const cardNumberClean = paymentForm.cardNumber.replace(/\s/g, '');
    if (!/^\d{16}$/.test(cardNumberClean)) {
      toast.error('Please enter a valid 16-digit card number');
      return false;
    }

    if (!paymentForm.expirationDate.trim()) {
      toast.error('Expiration date is required');
      return false;
    }

    // Validate expiration date (MM/YY format)
    const expRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
    if (!expRegex.test(paymentForm.expirationDate)) {
      toast.error('Please enter a valid expiration date (MM/YY)');
      return false;
    }

    // Validate expiration date is not in the past
    const [month, year] = paymentForm.expirationDate.split('/');
    const expDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const today = new Date();
    if (expDate < today) {
      toast.error('Card has expired');
      return false;
    }

    if (!paymentForm.cvv.trim()) {
      toast.error('CVV is required');
      return false;
    }

    // Validate CVV (3 or 4 digits)
    if (!/^\d{3,4}$/.test(paymentForm.cvv)) {
      toast.error('Please enter a valid CVV (3 or 4 digits)');
      return false;
    }

    return true;
  };

  const handleSavePayment = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (validatePaymentForm()) {
      const formattedCard = `Visa •••• ${paymentForm.cardNumber.slice(-4)}`;
      onPaymentMethodChange(formattedCard);
      setIsNewPayment(false);
      setPaymentForm({
        cardNumber: '',
        expirationDate: '',
        cvv: '',
        cardholderName: ''
      });
      toast.success('Payment method saved successfully');
    }
  };

  const handleChangePayment = () => {
    setIsNewPayment(true);
    onPaymentMethodChange('');
    setPaymentForm({
      cardNumber: '',
      expirationDate: '',
      cvv: '',
      cardholderName: ''
    });
  };

  // Add input formatting handlers
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/(\d{1,4})/g);
    return groups ? groups.join(' ').substr(0, 19) : '';
  };

  const formatExpirationDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentForm(prev => ({ ...prev, cardNumber: formatted }));
  };

  const handleExpirationDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpirationDate(e.target.value);
    setPaymentForm(prev => ({ ...prev, expirationDate: formatted }));
  };

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPaymentForm(prev => ({ ...prev, cvv: value }));
  };

  const handlePaymentMethodChange = (value: string) => {
    if (value === 'new') {
      setIsNewPayment(true);
      onPaymentMethodChange('');
    } else {
      setIsNewPayment(false);
      onPaymentMethodChange(value);
    }
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
    const hasValidPayment = Boolean(orderDetails.paymentMethod);
    const hasValidMeasurement = Boolean(orderDetails.measurement);
    
    return hasValidAddress && hasValidPayment && hasValidMeasurement;
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
            <h4>Pay with</h4>
            {orderDetails.paymentMethod && !isNewPayment ? (
              <div className={styles.savedInfo}>
                <p>{orderDetails.paymentMethod}</p>
                <button 
                  onClick={handleChangePayment}
                  className={styles.changeButton}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                {savedPaymentMethods.length > 0 && (
                  <select 
                    value={isNewPayment ? 'new' : orderDetails.paymentMethod}
                    onChange={(e) => handlePaymentMethodChange(e.target.value)}
                    className={styles.paymentSelect}
                  >
                    <option value="">Select a payment method...</option>
                    {savedPaymentMethods.map((method, index) => (
                      <option key={index} value={`Visa •••• ${method.cardNumber.slice(-4)}`}>
                        Visa •••• {method.cardNumber.slice(-4)}
                      </option>
                    ))}
                    <option value="new">+ Add new payment method</option>
                  </select>
                )}
                
                {isNewPayment && (
                  <div className={styles.newPaymentForm}>
                    <div className={styles.formField}>
                      <label htmlFor="cardholderName">Cardholder Name *</label>
                      <input
                        id="cardholderName"
                        type="text"
                        value={paymentForm.cardholderName}
                        onChange={handlePaymentFormChange('cardholderName')}
                        placeholder="John Doe"
                        className={styles.paymentInput}
                        maxLength={50}
                        required
                      />
                    </div>

                    <div className={styles.formField}>
                      <label htmlFor="cardNumber">Card Number *</label>
                      <input
                        id="cardNumber"
                        type="text"
                        value={paymentForm.cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="1234 5678 9012 3456"
                        className={styles.paymentInput}
                        maxLength={19}
                        required
                      />
                    </div>

                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label htmlFor="expirationDate">Expiration Date (MM/YY) *</label>
                        <input
                          id="expirationDate"
                          type="text"
                          value={paymentForm.expirationDate}
                          onChange={handleExpirationDateChange}
                          placeholder="MM/YY"
                          className={styles.paymentInput}
                          maxLength={5}
                          required
                        />
                      </div>

                      <div className={styles.formField}>
                        <label htmlFor="cvv">CVV *</label>
                        <input
                          id="cvv"
                          type="text"
                          value={paymentForm.cvv}
                          onChange={handleCVVChange}
                          placeholder="123"
                          className={styles.paymentInput}
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.formButtons}>
                      {savedPaymentMethods.length > 0 && (
                        <button 
                          onClick={handleChangePayment}
                          className={styles.cancelBtn}
                          type="button"
                        >
                          Cancel
                        </button>
                      )}
                      <button 
                        onClick={handleSavePayment}
                        className={`${styles.saveAddressBtn} ${savedPaymentMethods.length === 0 ? styles.fullWidth : ''}`}
                        type="button"
                      >
                        Save Payment Method
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
            onClick={onConfirm} 
            className={`${styles.confirmButton} ${!isOrderValid() || isProcessingOrder ? styles.confirmButtonDisabled : ''}`}
            disabled={!isOrderValid() || isProcessingOrder}
          >
            {!isOrderValid() ? (
              <span className={styles.invalidOrderMessage}>
                {!orderDetails.shippingAddress && 'Add shipping address'}
                {!orderDetails.paymentMethod && !orderDetails.shippingAddress && ', '}
                {!orderDetails.paymentMethod && 'payment method'}
                {(!orderDetails.shippingAddress || !orderDetails.paymentMethod) && !orderDetails.measurement && ', and '}
                {!orderDetails.measurement && 'measurement'}
              </span>
            ) : isProcessingOrder ? (
              'Processing order...'
            ) : (
              'Place your order'
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 