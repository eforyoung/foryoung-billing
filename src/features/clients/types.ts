import type { ServiceType } from '@prisma/client'

export interface ClientFormInput {
  id?: string
  name: string
  phone: string
  email?: string
  unit?: string
  isActive: boolean
  notes?: string
  services: { type: ServiceType; rate?: number }[]
}

export interface ClientWithServices {
  id: string
  name: string
  phone: string
  email: string | null
  unit: string | null
  isActive: boolean
  notes: string | null
  services: { type: ServiceType; rate: number | null }[]
}
