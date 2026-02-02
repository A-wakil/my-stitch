// Currency types
export type CurrencyCode = 'USD' | 'NGN';

export interface ExchangeRate {
  from: CurrencyCode;
  to: CurrencyCode;
  rate: number;
  timestamp: number;
}

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar'
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    name: 'Nigerian Naira'
  }
};

export interface AccountDetails {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    phone_number: string;
    
    // Payment Details
    card_number: string;
    expiration_date: string;
    cvv: string;
    
    // Address
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    
    // Preferences
    language: 'en' | 'es';
    preferred_currency: CurrencyCode;
    email_notifications: boolean;
    sms_notifications: boolean;
    
    // Timestamps
    created_at: string;
    updated_at: string;
}


export interface Measurement {
    id: number;
    user_id: string;
    name: string;
    shoulder_to_elbow: number;
    shoulder_to_wrist: number;
    tricep_girth: number;
    elbow_girth: number;
    free_hand_girth: number;
    wrist_girth: number;
    neck: number;
    chest: number;
    tummy: number;
    hip: number;
    shirt_length: number;
    trouser_length: number;
    lap_girth: number;
    knee_girth: number;
    base_girth: number;
    waist_girth: number;
    hip_girth: number;
    agbada_sleeve: number;
    agbada_length: number;
    created_at: string;
    updated_at: string;
  } 

  export interface Design {
    id: string
    created_at: string
    created_by: string
    title: string
    description: string
    images: string[]
    fabrics: string[]
    price?: number
    currency_code?: CurrencyCode
    approval_status?: 'pending' | 'approved' | 'rejected'
    rejection_reason?: string | null
    is_deleted?: boolean
    is_soft_deleted?: boolean
    completion_time?: number  // Time in weeks for the tailor to complete the design
    brand_name?: string
    tailor_id?: string
  }

  export interface OrderItem {
    id: string
    order_id: string
    design_id: string
    fabric_idx: number
    color_idx: number | null
    price: number | null
    tailor_notes: string | null
    measurement_id: string | null
    design?: Design | null
    measurements?: Measurement | null
  }
  
  export interface Order {
    id: string
    user_id: string
    tailor_id: string
    status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled'
    total_amount: number
    currency_code: CurrencyCode
    exchange_rate?: number  // Store the exchange rate at time of order
    created_at: string
    updated_at: string
    estimated_completion_date: string | null
    design_id: string | null
    measurements: Record<string, any> | null
    shipping_address: Record<string, any> | null
    fabric_name: string | null
    color_name: string | null
    design?: Design | null
    fabric_yards?: number | null
    style_type?: 'kaftan' | 'kaftan_agbada' | 'agbada' | null
    rejection_reason?: string | null
    tailor_notes?: string | null
    orderItems?: OrderItem[]  // For multi-item orders from bag checkout
  }

  export interface Profile {
    id: string;  // UUID is represented as string in TypeScript
    email: string;
    roles: string[];
    created_at: string;  // ISO timestamp string
    firstname: string;
    lastname: string | null;
  }