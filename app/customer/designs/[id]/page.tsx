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
import { IoInformationCircleOutline } from "react-icons/io5"
import { sendOrderNotification } from '../../../lib/notifications'

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
  const [customYards, setCustomYards] = useState<number | null>(null)
  const [showYardInput, setShowYardInput] = useState(false)

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
        .from('tailor_details')
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
          .from('customer_details')
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
          .from('customer_details')
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

      // Use the new yard calculation
      const yards = customYards !== null ? customYards : (selectedStyle ? getRecommendedYards(selectedStyle) : 4.5);

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

      // Fetch customer profile
      const { data: customerProfile, error: customerProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (customerProfileError) {
        console.error('Error fetching customer profile:', customerProfileError);
      } else {
        // Fetch tailor profile
        const { data: tailorProfile, error: tailorProfileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', designData.created_by)
          .single();

        if (tailorProfileError) {
          console.error('Error fetching tailor profile:', tailorProfileError);
        } else {
          // Send notifications
          try {
            // Send notification to customer
            await sendOrderNotification(
              'order_placed',
              data,
              customerProfile,
              { totalAmount: totalPrice }
            );

            // Send notification to tailor
            await sendOrderNotification(
              'order_placed',
              data,
              tailorProfile,
              { totalAmount: totalPrice }
            );
            
            console.log('Order notifications sent successfully');
          } catch (notificationError) {
            console.error('Error sending order notifications:', notificationError);
          }
        }
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

  const getRecommendedYards = (styleType: string): number => {
    switch(styleType) {
      case 'kaftan':
        return 4.5;
      case 'agbada':
        return 3.5;
      case 'kaftan_agbada':
        return 8.0;
      default:
        return 4.5;
    }
  };

  const getFabricPrice = (fabric: any, measurement?: Measurement) => {
    // Default values if properties are undefined
    const stitchPrice = fabric.stitchPrice || 0;
    const yardPrice = fabric.yardPrice || 0;
    
    // Calculate based on yards needed
    if (selectedStyle) {
      const yards = customYards !== null ? customYards : getRecommendedYards(selectedStyle);
      return stitchPrice + (yards * yardPrice);
    } 
    
    // Fallback to previous logic if no style is selected
    if (fabric.price !== undefined) {
      return fabric.price;
    } else if (fabric.stitchPrice !== undefined) {
      return fabric.stitchPrice;
    } else {
      return 0; // Default price if none is available
    }
  }

  const totalPrice = useMemo(() => {
    if (!design || !design.fabrics[selectedFabric]) return 0;
    
    return getFabricPrice(design.fabrics[selectedFabric], selectedMeasurement);
  }, [design, selectedFabric, selectedMeasurement, selectedStyle]);

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

  // Add a check to determine if this is a simple pricing design or has real fabrics
  const hasRealFabrics = useMemo(() => {
    if (!design?.fabrics) return false;
    return design.fabrics.some(fabric => 
      fabric.name !== "Custom" || (fabric.image && fabric.colors && fabric.colors.length > 0)
    );
  }, [design?.fabrics]);

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

          
          <div className={styles.priceBreakdown}>
            <p>Stitching Price: ${design.fabrics[selectedFabric].stitchPrice?.toFixed(2) || "0.00"}</p>
            <p>Fabric Price: ${design.fabrics[selectedFabric].yardPrice?.toFixed(2) || "0.00"} per yard</p>
            {selectedStyle && (
              <>
                <p>
                  Selected Style: <span className={styles.styleValue}>
                    {selectedStyle === 'kaftan' ? 'Kaftan' : 
                     selectedStyle === 'kaftan_agbada' ? 'Kaftan & Agbada' : 
                     selectedStyle === 'agbada' ? 'Agbada' : 'None Selected'}
                  </span>
                </p>
                
                <div className={styles.yardageSection}>
                  <div className={styles.yardageToggle}>
                    <button 
                      className={`${styles.yardageButton} ${!showYardInput ? styles.activeButton : ''}`}
                      onClick={() => setShowYardInput(false)}
                    >
                      Use Recommended
                    </button>
                    <button 
                      className={`${styles.yardageButton} ${showYardInput ? styles.activeButton : ''}`}
                      onClick={() => setShowYardInput(true)}
                    >
                      Custom Yardage
                    </button>
                    <span className={styles.yardageInfo}>
                      <IoInformationCircleOutline className={styles.infoIcon} />
                      <div className={styles.yardageTooltip}>
                        Use "Custom Yardage" if you already know exactly how much fabric you need. 
                        Otherwise, we recommend using our standard estimates based on your style choice.
                      </div>
                    </span>
                  </div>
                  
                  {showYardInput ? (
                    <div className={styles.customYardInput}>
                      <label htmlFor="custom-yards">Enter yards needed:</label>
                      <input 
                        id="custom-yards"
                        type="number" 
                        min="1" 
                        step="0.5" 
                        value={customYards || ''}
                        onChange={(e) => setCustomYards(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="Enter yards..."
                      />
                    </div>
                  ) : (
                    <p>
                      Recommended fabric: {getRecommendedYards(selectedStyle).toFixed(1)} yards = 
                      ${((design.fabrics[selectedFabric].yardPrice || 0) * getRecommendedYards(selectedStyle)).toFixed(2)}
                    </p>
                  )}
                </div>
                
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

          {/* Only show Fabrics section if there are real fabrics */}
          {hasRealFabrics && (
            <div className={styles.fabricSelection}>
              <h3>Fabrics</h3>
              <div className={styles.fabricOptions}>
                {design.fabrics
                  .filter(fabric => fabric.name !== "Custom" || (fabric.image && fabric.colors && fabric.colors.length > 0))
                  .map((fabric, index) => (
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
          )}

          {/* Only show Colors section if the selected fabric has colors */}
          {hasRealFabrics && design.fabrics[selectedFabric].colors && design.fabrics[selectedFabric].colors.length > 0 && (
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
          )}

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
                  onClick={() => router.push('/customer/measurements')}
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
