'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import styles from './DesignDetail.module.css'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import OrderConfirmationModal from '../../ui/orderConfirmationModal/OrderConfirmationModal'
import { Measurement } from '../../../lib/types'
import { IoArrowBack } from "react-icons/io5"

interface DesignDetail {
  id: string
  title: string
  description: string
  images: string[]
  fabrics: Array<{
    name: string
    image: string
    price: number
    colors: Array<{ name: string; image: string }>
  }>
  created_by: string
  brand_name: string
  completion_time: number
}

interface PaymentMethod {
  cardNumber: string;
  expirationDate: string;
}

interface OrderDetails {
  design: {
    title: string;
    fabrics: Array<{
      name: string;
      price: number;
      colors: Array<{ name: string }>;
    }>;
    brand_name: string;
    completion_time: number;
  };
  selectedFabric: number;
  selectedColor: number | null;
  shippingAddress: string;
  paymentMethod: string;
  total: number;
  measurement?: Measurement;
}

export default function DesignDetail({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the promise to get the actual params
  const { id } = use(params)

  const [design, setDesign] = useState<DesignDetail | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedFabric, setSelectedFabric] = useState(0)
  const [selectedColor, setSelectedColor] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [brandName, setBrandName] = useState<string>('')
  const [tailorId, setTailorId] = useState<string | null>(null)
  const router = useRouter()
  const [selectedAddress, setSelectedAddress] = useState<string>("")
  const [savedAddresses, setSavedAddresses] = useState<string[]>([])
  const [orderShippingAddress, setOrderShippingAddress] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [isLoadingPayment, setIsLoadingPayment] = useState(true)
  const [savedMeasurements, setSavedMeasurements] = useState<Measurement[]>([])
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | undefined>(undefined)
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true)

  useEffect(() => {
    async function fetchDesign() {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        console.error('Error fetching design:', error)
          return
        }

      const { data: brandData, error: brandError } = await supabase
        .from('designs')
        .select('created_by')
        .eq('id', id)
        .single()

      if (brandError) {
        console.error('Error fetching brand:', brandError)
        return
      }

      setTailorId(brandData.created_by)

      const { data: brandName, error: brandNameError } = await supabase
        .from('tailor_profiles')
        .select('brand_name')
        .eq('id', brandData.created_by)
        .single()

      if (brandNameError) {
        console.error('Error fetching brand:', brandNameError)
        return
      }

      setBrandName(brandName.brand_name)

      // Merge the brand_name into the design object
      const design = {
        ...data
      }
      setDesign(design)
    }

    fetchDesign()
  }, [id])

  useEffect(() => {
    async function fetchUserAddress() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('account_details')
          .select('street_address, city, state, postal_code, country')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          // Only add the address if all required fields exist
          if (data.street_address && data.city && data.state && data.postal_code) {
            const formattedAddress = `${data.street_address}, ${data.city}, ${data.state} ${data.postal_code}, ${data.country || 'United States'}`;
            setSavedAddresses([formattedAddress]);
          } else {
            setSavedAddresses([]);
          }
        }
      }
      setIsLoading(false);
    }

    fetchUserAddress();
  }, []);

  useEffect(() => {
    async function fetchPaymentMethod() {
      setIsLoadingPayment(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('account_details')
          .select('card_number, expiration_date')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error && data.card_number) {
          setSavedPaymentMethods([{
            cardNumber: data.card_number,
            expirationDate: data.expiration_date
          }]);
          setSelectedPaymentMethod(`•••• ${data.card_number.slice(-4)}`);
        } else {
          setSavedPaymentMethods([]);
        }
      }
      setIsLoadingPayment(false);
    }

    fetchPaymentMethod();
  }, []);

  useEffect(() => {
    async function fetchMeasurements() {
      setIsLoadingMeasurements(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('measurements')
          .select('*')
          .eq('user_id', user.id);
        
        if (data && !error) {
          setSavedMeasurements(data);
        }
      }
      setIsLoadingMeasurements(false);
    }

    fetchMeasurements();
  }, []);

  const handleAddToCart = async () => {
    // Validate color selection first
    if (selectedColor === null) {
      toast.error('Please select a color')
      return
    }

    // Show confirmation modal instead of proceeding directly
    setIsModalOpen(true)
  }

  const handleConfirmOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to place an order');
        return;
      }

      // Get tailor_id from the design
      const { data: designData } = await supabase
        .from('designs')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!designData?.created_by) {
        toast.error('Invalid design data');
        return;
      }

      // Format shipping address as a proper JSON string
      const shippingAddressJson = JSON.stringify({
        street_address: orderShippingAddress.split(',')[0].trim(),
        city: orderShippingAddress.split(',')[1].trim(),
        state: orderShippingAddress.split(',')[2].split(' ')[1],
        zip_code: orderShippingAddress.split(',')[2].split(' ')[2],
        country: orderShippingAddress.split(',')[3].trim()
      });

      // Format measurements as a proper JSON string
      const measurementsJson = JSON.stringify(selectedMeasurement || {});

      const orderData = {
        user_id: user.id,
        tailor_id: designData.created_by,
        design_id: id,
        status: 'pending',
        total_amount: design?.fabrics[selectedFabric].price || 0,
        measurements: measurementsJson,
        shipping_address: shippingAddressJson,
        fabric_name: design?.fabrics[selectedFabric].name,
        color_name: selectedColor !== null ? design?.fabrics[selectedFabric].colors[selectedColor].name : '',
        estimated_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (error) {
        console.error('Order insertion error:', error);
        throw error;
      }

      toast.success('Order placed successfully!');
      setIsModalOpen(false);
      router.push('/customer/orders');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    }
  };

  const handleAddressUpdate = (address: string) => {
    setOrderShippingAddress(address)
  }

  const handlePaymentMethodUpdate = (paymentMethod: string) => {
    setSelectedPaymentMethod(paymentMethod);
  };

  const handleMeasurementUpdate = (measurement: Measurement | undefined) => {
    setSelectedMeasurement(measurement);
  };

  if (!design) {
    return <div>Loading...</div>
  }

  return (
    <div className={styles.container}>
      <button 
        onClick={() => router.push('/')}
        className={styles.backButton}
      >
        <IoArrowBack /> Back to Home
      </button>

      <div className={styles.productGrid}>
        {/* Left side - Image gallery */}
        <div className={styles.imageSection}>
          <div className={styles.mainImage}>
            <img 
              src={design.images[selectedImage]} 
              alt={design.title}
              className={styles.primaryImage}
            />
          </div>
          <div className={styles.thumbnails}>
            {design.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${design.title} view ${index + 1}`}
                className={`${styles.thumbnail} ${selectedImage === index ? styles.selected : ''}`}
                onClick={() => setSelectedImage(index)}
              />
            ))}
          </div>
        </div>

        {/* Right side - Product details */}
        <div className={styles.detailsSection}>
          <h1 className={styles.title}>{design.title}</h1>
          <p className={styles.price}>${design.fabrics[selectedFabric].price.toFixed(2)}</p>

          <div className={styles.fabricSelection}>
            <h3>Fabrics</h3>
            <div className={styles.fabricOptions}>
              {design.fabrics.map((fabric, index) => (
                <div
                  key={index}
                  className={`${styles.fabricOption} ${selectedFabric === index ? styles.selectedFabric : ''}`}
                  onClick={() => {
                    setSelectedFabric(index);
                    setSelectedColor(0);
                  }}
                >
                  <img src={fabric.image} alt={fabric.name} />
                  <span>{fabric.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.colorSelection}>
            <h3>Colors</h3>
            <div className={styles.colorOptions}>
              {design.fabrics[selectedFabric].colors.map((color, index) => (
                <div
                  key={index}
                  className={styles.colorOption}
                  onClick={() => setSelectedColor(index)}
                >
                  <div 
                    className={`${styles.colorPill} ${selectedColor === index ? styles.selectedColor : ''}`}
                    style={{ backgroundColor: color.name }}
                    title={color.name}
                  />
                </div>
              ))}
            </div>
          </div>

          <button 
            className={styles.addToCartButton}
            onClick={handleAddToCart}
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Place Order'}
          </button>

          <div className={styles.description}>
            <h3>Description</h3>
            <p>{design.description}</p>
          </div>
        </div>
      </div>

      <OrderConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmOrder}
        orderDetails={{
          design: {
            ...design,
            brand_name: brandName,
            completion_time: design?.completion_time || 1
          },
          selectedFabric,
          selectedColor,
          shippingAddress: orderShippingAddress,
          paymentMethod: selectedPaymentMethod,
          total: design?.fabrics[selectedFabric].price || 0,
          measurement: selectedMeasurement
        }}
        savedAddresses={savedAddresses}
        savedPaymentMethods={savedPaymentMethods}
        savedMeasurements={savedMeasurements}
        onAddressChange={handleAddressUpdate}
        onPaymentMethodChange={handlePaymentMethodUpdate}
        onMeasurementChange={handleMeasurementUpdate}
        isLoading={isLoading}
        isLoadingPayment={isLoadingPayment}
        isLoadingMeasurements={isLoadingMeasurements}
      />
    </div>
  )
}
