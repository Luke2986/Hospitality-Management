
export interface Property {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  address?: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  rooms_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  name: string;
  description?: string;
  max_guests: number;
  price_per_night: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  image_url?: string;
}

export interface Event {
  id: string;
  property_id: string;
  title: string;
  description?: string;
  event_date: string;
  end_date?: string;
  location?: string;
  category?: 'sagra' | 'concerto' | 'fiera' | 'sport' | 'religioso' | 'cultura' | 'mercato';
  is_automatic: boolean;
  is_recurring: boolean;
  source_url?: string;
  confidence?: 'confirmed' | 'likely' | 'tentative';
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  room_id: string;
  property_id: string;
  check_in: Date;
  check_out: Date;
  guests_count: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

export interface IcalConnection {
  id: string;
  property_id: string;
  provider: 'airbnb' | 'booking' | 'vrbo' | 'custom';
  ical_url: string;
  label?: string;
  last_sync?: string;
  sync_status: 'active' | 'error' | 'paused';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Dealer {
  city: string;
  isCertified: boolean;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  version: string;
  year: number;
  km: number;
  fuelType: string;
  transmission: string;
  price: number;
  financingMonthlyRate?: number;
  mainImage: string;
  dealer: Dealer;
}
