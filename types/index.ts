import type { UserRole } from '@/lib/constants'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  rut: string | null
  avatar_url: string | null
  email?: string
  plan: string | null
  subscription_status: string
  trial_ends_at: string | null
  subscription_ends_at: string | null
  mp_subscription_id: string | null
  max_agents: number
  subscriber_id: string | null
  created_at: string
  updated_at: string
  // Bank account fields (PROPIETARIO)
  bank_name?: string | null
  bank_account_type?: string | null
  bank_account_holder?: string | null
  bank_account_rut?: string | null
  bank_account_number?: string | null
  bank_email?: string | null
  // MercadoLibre / Portal Inmobiliario integration
  ml_user_id?: string | null
  ml_access_token?: string | null
  ml_refresh_token?: string | null
  ml_token_expires_at?: string | null
  ml_connected_at?: string | null
  // Subscriber website builder
  website_subdomain?: string | null
  website_domain?: string | null
  website_ns1?: string | null
  website_ns2?: string | null
  website_enabled?: boolean
  website_primary_color?: string | null
  website_accent_color?: string | null
  website_hero_title?: string | null
  website_hero_subtitle?: string | null
  website_about_text?: string | null
  website_whatsapp?: string | null
}

export interface PaymentReceipt {
  id: string
  application_id: string
  applicant_id: string
  file_url: string
  file_name: string | null
  uploaded_at: string
}

export interface Property {
  id: string
  owner_id: string
  agent_id: string | null
  subscriber_id: string | null
  title: string
  description: string | null
  type: string
  operation: string
  price: number
  currency: string
  address: string | null
  city: string | null
  sector: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqm: number | null
  common_expenses: number
  pets_allowed: boolean
  parking: number
  storage: number
  floor_level: number | null
  furnished: boolean
  amenities: string[] | null
  status: string
  featured: boolean
  created_at: string
  updated_at: string
  owner?: Profile
  agent?: Profile
  images?: PropertyImage[]
  // MercadoLibre / Portal Inmobiliario
  ml_item_id?: string | null
  ml_status?: string | null
  ml_listing_type?: string | null
  ml_published_at?: string | null
  ml_poi_visible?: boolean | null
  // Subscriber website visibility
  website_visible?: boolean | null
  // ── Enhanced fields (migration 031) ──────────────────────────────────────
  private_name?: string | null
  internal_code?: string | null
  floor_count?: number | null
  half_bathrooms?: number | null
  condition?: string | null
  year_built?: number | null
  style?: string | null
  covered_sqm?: number | null
  terrace_sqm?: number | null
  exclusive?: boolean | null
  has_sign?: boolean | null
  keys_count?: number | null
  video_url?: string | null
  virtual_tour_url?: string | null
  region?: string | null
  address2?: string | null
  zip_code?: string | null
  lat?: number | null
  lng?: number | null
  show_exact_location?: boolean | null
  private_notes?: string | null
  notify_email?: string | null
}

export interface PropertyImage {
  id: string
  property_id: string
  url: string
  order: number
  created_at: string
}

export interface Application {
  id: string
  property_id: string
  applicant_id: string
  status: string
  message: string | null
  created_at: string
  updated_at: string
  property?: Property
  applicant?: Profile
  documents?: ApplicationDocument[]
}

export interface ApplicationDocument {
  id: string
  application_id: string
  name: string
  url: string
  type: string | null
  created_at: string
}

export interface Visit {
  id: string
  property_id: string
  visitor_id: string
  subscriber_id: string | null
  scheduled_at: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  property?: Property
  visitor?: Profile
}

export interface PropertyFilters {
  type?: string
  operation?: string
  city?: string
  sector?: string
  minPrice?: number
  maxPrice?: number
  bedrooms?: number
  bathrooms?: number
  status?: string
}
