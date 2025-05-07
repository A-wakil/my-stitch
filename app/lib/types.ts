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
    currency: 'usd' | 'eur';
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
  }
  
  export interface Order {
    id: string
    user_id: string
    tailor_id: string
    status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled'
    total_amount: number
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
  }

  export interface Profile {
    id: string;  // UUID is represented as string in TypeScript
    email: string;
    roles: string[];
    created_at: string;  // ISO timestamp string
    firstname: string;
    lastname: string | null;
  }