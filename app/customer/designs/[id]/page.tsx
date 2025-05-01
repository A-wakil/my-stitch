'use client'

import { useState, useEffect, use, useMemo } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import styles from './DesignDetail.module.css'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import OrderConfirmationModal from '../../ui/orderConfirmationModal/OrderConfirmationModal'
import { Measurement } from '../../../lib/types'
import { IoArrowBack } from "react-icons/io5"
import { IoChevronDown, IoChevronUp } from "react-icons/io5"

interface DesignDetail {
  id: string
  title: string
  description: string
  images: string[]
  fabrics: Array<{
    name: string
    image: string
    yardPrice?: number
    stitchPrice?: number
    price?: number // Keep backward compatibility
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
      image?: string;
      price?: number;
      yardPrice?: number;
      stitchPrice?: number;
      colors: Array<{ name: string; image?: string }>;
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
  const [showMeasurementDetails, setShowMeasurementDetails] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState<string>('')

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
    // Validate measurements first
    if (!selectedMeasurement) {
      toast.error('Please select your measurements')
      return
    }
    
    // Validate style selection
    if (!selectedStyle) {
      toast.error('Please select a style option')
      return
    }

    // Validate color selection
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

      // Calculate yards if measurements are available
      const yards = selectedMeasurement ? calculateYardsNeeded(selectedMeasurement) : 0;

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
        total_amount: totalPrice,
        measurements: measurementsJson,
        shipping_address: shippingAddressJson,
        fabric_name: design?.fabrics[selectedFabric].name,
        color_name: selectedColor !== null ? design?.fabrics[selectedFabric].colors[selectedColor].name : '',
        style_type: selectedStyle,
        estimated_completion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        fabric_yards: yards
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

  const getFabricPrice = (fabric: any, measurement?: Measurement) => {
    // Default values if properties are undefined
    const stitchPrice = fabric.stitchPrice || 0;
    const yardPrice = fabric.yardPrice || 0;
    
    // If we have measurements, calculate yards needed
    if (measurement) {
      const yards = calculateYardsNeeded(measurement);
      return stitchPrice + (yards * yardPrice);
    } 
    
    // Fallback to previous logic if no measurements available
    if (fabric.price !== undefined) {
      return fabric.price;
    } else if (fabric.stitchPrice !== undefined) {
      return fabric.stitchPrice;
    } else {
      return 0; // Default price if none is available
    }
  }

  // Function to calculate yards needed based on measurements and style
  const calculateYardsNeeded = (measurements: Measurement): number => {
    // Helper function to calculate Kaftan/Shirt yards
    const calculateKaftanYards = (measurements: Measurement): number => {
      const shirtLength = measurements.shirt_length || 0;
      const sleeveLength = measurements.shoulder_to_wrist || 0;
      
      // Body panel calculation (front & back side by side)
      const bodyPanelYards = (shirtLength + 2) / 36;
      
      // Sleeves calculation (both sleeves side by side)
      const sleevePanelYards = (sleeveLength + 2) / 36;
      
      // Add margin for neck facings and details
      return bodyPanelYards + sleevePanelYards + 0.5;
    };

    // Helper function to calculate trouser yards
    const calculateTrouserYards = (measurements: Measurement): number => {
      const trouserLength = measurements.trouser_length || 0;
      
      // Basic trouser calculation plus margin for pockets/facings
      return ((trouserLength + 2) / 36) + 0.5;
    };

    // Helper function to calculate Agbada yards
    const calculateAgbadaYards = (measurements: Measurement): number => {
      const agbadaLength = measurements.shirt_length ? measurements.shirt_length + 10 : 0; // Adding 10" for typical Agbada length
      
      // Two lengths plus margin for embroidery and finishing
      return (2 * ((agbadaLength + 2) / 36)) + 0.75;
    };

    // Calculate based on selected style
    switch(selectedStyle) {
      case 'kaftan':
        return Math.ceil(calculateKaftanYards(measurements) * 2) / 2; // Round to nearest 0.5

      case 'kaftan_agbada':
        const kaftanYards = calculateKaftanYards(measurements);
        const trouserYards = calculateTrouserYards(measurements);
        const agbadaYards = calculateAgbadaYards(measurements);
        return Math.ceil((kaftanYards + trouserYards + agbadaYards) * 2) / 2; // Round to nearest 0.5

      case 'agbada':
        return Math.ceil(calculateAgbadaYards(measurements) * 2) / 2; // Round to nearest 0.5

      default:
        return 0;
    }
  };

  const totalPrice = useMemo(() => {
    if (!design || !design.fabrics[selectedFabric]) return 0;
    
    return getFabricPrice(design.fabrics[selectedFabric], selectedMeasurement);
  }, [design, selectedFabric, selectedMeasurement]);

  // Add a helper function to transform design data for the OrderConfirmationModal
  const mapDesignToOrderFormat = (design: DesignDetail, brandName: string) => {
    return {
      title: design.title,
      fabrics: design.fabrics.map(fabric => ({
        name: fabric.name,
        price: getFabricPrice(fabric, selectedMeasurement), // Use calculated price
        colors: fabric.colors.map(color => ({ name: color.name }))
      })),
      brand_name: brandName,
      completion_time: design.completion_time || 1
    };
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
          <button 
            className={styles.addToCartButton}
            onClick={handleAddToCart}
            disabled={loading || !selectedMeasurement}
          >
            {loading ? 'Adding...' : (selectedMeasurement ? 'Place Order' : 'Select Measurements to Order')}
          </button>
        </div>

        {/* Right side - Product details */}
        <div className={styles.detailsSection}>
          <h1 className={styles.title}>{design.title}</h1>
          
          <div className={styles.description}>
            <p>{design.description}</p>
          </div>
          
          {!selectedMeasurement && (
            <p className={styles.partialPrice}>
              Total price calculated after measurements are selected
            </p>
          )}
          
          <div className={styles.priceBreakdown}>
            <p>Stitching Price: ${design.fabrics[selectedFabric].stitchPrice?.toFixed(2) || "0.00"}</p>
            <p>Fabric Price: ${design.fabrics[selectedFabric].yardPrice?.toFixed(2) || "0.00"} per yard</p>
            {selectedMeasurement && (
              <>
                <p>
                  Estimated fabric: {calculateYardsNeeded(selectedMeasurement).toFixed(2)} yards = ${((design.fabrics[selectedFabric].yardPrice || 0) * calculateYardsNeeded(selectedMeasurement)).toFixed(2)}
                </p>
                <p className={styles.estimatedTotal}>
                  Total Price: ${totalPrice.toFixed(2)}
                </p>
              </>
            )}
          </div>

          <div className={styles.styleSelection}>
            <h3>Style Options</h3>
            <div className={styles.styleOptions}>
              <div
                className={`${styles.styleOption} ${selectedStyle === 'kaftan' ? styles.selectedStyle : ''}`}
                onClick={() => setSelectedStyle('kaftan')}
              >
                <span>Kaftan</span>
              </div>
              <div
                className={`${styles.styleOption} ${selectedStyle === 'kaftan_agbada' ? styles.selectedStyle : ''}`}
                onClick={() => setSelectedStyle('kaftan_agbada')}
              >
                <span>Kaftan & Agbada</span>
              </div>
              <div
                className={`${styles.styleOption} ${selectedStyle === 'agbada' ? styles.selectedStyle : ''}`}
                onClick={() => setSelectedStyle('agbada')}
              >
                <span>Agbada</span>
              </div>
            </div>
          </div>

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

          {/* Add measurement selection section */}
          <div className={styles.measurementSelection}>
            <h3>Your Measurements</h3>
            {isLoadingMeasurements ? (
              <div className={styles.loadingMeasurements}>Loading measurements...</div>
            ) : savedMeasurements.length > 0 ? (
              <>
                <select
                  value={selectedMeasurement?.id.toString() || ''}
                  onChange={(e) => {
                    const measurementId = e.target.value;
                    if (measurementId) {
                      const measurement = savedMeasurements.find(m => m.id.toString() === measurementId);
                      if (measurement) {
                        setSelectedMeasurement(measurement);
                      }
                    } else {
                      setSelectedMeasurement(undefined);
                    }
                  }}
                  className={styles.measurementSelect}
                >
                  <option value="">Select your measurements...</option>
                  {savedMeasurements.map((measurement) => (
                    <option key={measurement.id} value={measurement.id.toString()}>
                      {measurement.name}
                    </option>
                  ))}
                </select>
                
                {selectedMeasurement && (
                  <div className={styles.selectedMeasurementDetails}>
                    <div 
                      className={styles.measurementDetailsHeader}
                      onClick={() => setShowMeasurementDetails(!showMeasurementDetails)}
                    >
                      <h4>{selectedMeasurement.name}</h4>
                      <div className={styles.showDetailsToggle}>
                        <span>{showMeasurementDetails ? 'Hide Details' : 'Show Details'}</span>
                        <button className={styles.toggleButton}>
                          {showMeasurementDetails ? <IoChevronUp /> : <IoChevronDown />}
                        </button>
                      </div>
                    </div>
                    
                    {showMeasurementDetails && (
                      <div className={styles.measurementGrid}>
                        {Object.entries(selectedMeasurement)
                          .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at', 'name'].includes(key) && typeof selectedMeasurement[key as keyof Measurement] === 'number')
                          .map(([key, value]) => (
                            <div key={key} className={styles.measurementItem}>
                              <span className={styles.measurementLabel}>
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                              </span>
                              <span>
                                {value} inches
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noMeasurements}>
                <p>No measurements found. Please add your measurements in your profile first.</p>
                <button
                  onClick={() => router.push('/customer/profile/measurements')}
                  className={styles.addMeasurementsButton}
                >
                  Add Measurements
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <OrderConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmOrder}
        orderDetails={{
          design: mapDesignToOrderFormat(design, brandName),
          selectedFabric,
          selectedColor,
          shippingAddress: orderShippingAddress,
          paymentMethod: selectedPaymentMethod,
          total: totalPrice,
          measurement: selectedMeasurement
        }}
        savedAddresses={savedAddresses}
        savedPaymentMethods={savedPaymentMethods}
        savedMeasurements={savedMeasurements}
        onAddressChange={handleAddressUpdate}
        onPaymentMethodChange={handlePaymentMethodUpdate}
        onMeasurementChange={(measurement) => {
          setSelectedMeasurement(measurement);
          // Recalculation happens automatically through the useMemo
        }}
        isLoading={isLoading}
        isLoadingPayment={isLoadingPayment}
        isLoadingMeasurements={isLoadingMeasurements}
      />
    </div>
  )
}
