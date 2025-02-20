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