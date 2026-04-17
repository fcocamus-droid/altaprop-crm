export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-20 h-20 rounded-2xl bg-gold/20 flex items-center justify-center mb-6">
        <span className="text-gold font-black text-5xl leading-none">A</span>
      </div>

      <h1 className="text-2xl font-bold mb-2">Sin conexión</h1>
      <p className="text-white/60 mb-8 max-w-xs">
        Revisa tu conexión a internet e intenta de nuevo.
        Algunas páginas ya visitadas pueden estar disponibles.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-gold text-navy font-semibold rounded-xl hover:bg-gold/90 transition-colors"
      >
        Reintentar
      </button>

      <a
        href="/dashboard"
        className="mt-4 text-sm text-white/50 hover:text-white/70 transition-colors"
      >
        Ir al panel
      </a>
    </div>
  )
}
