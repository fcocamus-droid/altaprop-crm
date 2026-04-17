import type { Metadata, Viewport } from 'next'
import { Open_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { ServiceWorkerRegister } from '@/components/pwa/sw-register'
import { InstallBanner } from '@/components/pwa/install-banner'
import './globals.css'

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const viewport: Viewport = {
  themeColor: '#003f73',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    default: 'Altaprop - CRM Inmobiliario',
    template: '%s | Altaprop',
  },
  description: 'Plataforma inmobiliaria para gestión integral de propiedades en arriendo y venta en Chile.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Altaprop',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
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
        <InstallBanner />
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
