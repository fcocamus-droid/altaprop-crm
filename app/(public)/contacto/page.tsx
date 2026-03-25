import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Mail, Phone, MapPin } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contacto' }

export default function ContactoPage() {
  return (
    <div className="container py-12">
      <h1 className="text-4xl font-bold text-center mb-10">Contacto</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <Card>
          <CardHeader><CardTitle>Envianos un Mensaje</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" placeholder="Tu nombre" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="tu@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea id="message" placeholder="Escribe tu mensaje..." rows={5} />
              </div>
              <Button type="submit" className="w-full">Enviar Mensaje</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-navy/5 rounded-lg flex items-center justify-center">
                  <Phone className="h-6 w-6 text-navy dark:text-gold" />
                </div>
                <div>
                  <h3 className="font-semibold">Telefono</h3>
                  <p className="text-sm text-muted-foreground">+56 9 7332 3296</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-navy/5 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-navy dark:text-gold" />
                </div>
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="text-sm text-muted-foreground">contacto@altaprop.cl</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-navy/5 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-navy dark:text-gold" />
                </div>
                <div>
                  <h3 className="font-semibold">Ubicacion</h3>
                  <p className="text-sm text-muted-foreground">Santiago, Chile</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
