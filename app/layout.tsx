import type { Metadata } from 'next'
import { Open_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: 'Altaprop - CRM Inmobiliario',
    template: '%s | Altaprop',
  },
  description: 'Plataforma inmobiliaria para gestion integral de propiedades en arriendo y venta en Chile.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${openSans.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
