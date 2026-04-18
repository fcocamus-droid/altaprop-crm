export default function Loading() {
  return (
    <div className="space-y-5">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[72px] bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
      {/* Toolbar skeleton */}
      <div className="flex gap-3">
        <div className="h-9 w-64 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-9 w-44 bg-slate-100 rounded-lg animate-pulse" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`h-12 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-50 animate-pulse`} />
        ))}
      </div>
    </div>
  )
}
