import { Logo } from '@/components/layout/logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-navy via-navy-dark to-navy-800 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-gold rounded-xl flex items-center justify-center">
            <span className="text-navy font-bold text-2xl">A</span>
          </div>
          <span className="text-3xl font-bold">
            <span className="text-white">Alta</span>
            <span className="text-gold">prop</span>
          </span>
        </div>
        <p className="text-navy-100 text-center mt-2 text-sm">CRM Inmobiliario</p>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
