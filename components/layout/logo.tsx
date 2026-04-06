import Link from 'next/link'

interface LogoProps {
  className?: string
  /** Use onDark=true when the logo appears on a dark/navy background */
  onDark?: boolean
}

export function Logo({ className = '', onDark = false }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center">
        <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
          <span className="text-navy font-bold text-lg">A</span>
        </div>
        <span className="ml-2 text-xl font-bold">
          <span className={onDark ? 'text-white' : 'text-navy dark:text-white'}>Alta</span>
          <span className="text-gold">prop</span>
        </span>
      </div>
    </Link>
  )
}
