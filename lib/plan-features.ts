import { PLANS } from '@/lib/constants'

export function canImportProperties(plan: string | null): boolean {
  return !!plan && plan !== 'started'
}

export function getMaxAgents(plan: string | null): number {
  if (!plan) return 0
  return PLANS.find(p => p.id === plan)?.agents || 1
}

export function getMonthlyApplicationLimit(plan: string | null): number | null {
  if (!plan || plan === 'started') return 5
  return null // unlimited
}

export function getPlanName(plan: string | null): string {
  if (!plan) return 'Sin Plan'
  return PLANS.find(p => p.id === plan)?.name || plan
}

export function getRequiredPlanForFeature(feature: string): string {
  switch (feature) {
    case 'import': return 'Básico'
    case 'unlimited_applications': return 'Básico'
    case 'reports': return 'Pro'
    case 'branding': return 'Pro'
    case 'api': return 'Enterprise'
    default: return 'Básico'
  }
}
