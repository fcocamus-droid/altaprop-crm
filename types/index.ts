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
