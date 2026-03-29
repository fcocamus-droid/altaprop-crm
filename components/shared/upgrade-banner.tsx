import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface UpgradeBannerProps {
  feature: string
  requiredPlan: string
}

export function UpgradeBanner({ feature, requiredPlan }: UpgradeBannerProps) {
  return (
    <Card className="border-2 border-dashed border-gold/40 bg-gold/5">
      <CardContent className="py-6 text-center">
        <Lock className="h-8 w-8 text-gold mx-auto mb-3" />
        <h3 className="font-semibold text-navy mb-1">{feature}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Disponible a partir del plan <strong>{requiredPlan}</strong>
        </p>
        <Button asChild size="sm" className="bg-gold text-navy hover:bg-gold/90">
          <Link href="/dashboard/plan">Mejorar Plan</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
