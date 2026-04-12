export default function PropiedadesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-44 bg-muted rounded-lg" />
          <div className="h-4 w-64 bg-muted/60 rounded-lg" />
        </div>
        <div className="h-9 w-36 bg-muted rounded-lg" />
      </div>

      {/* Stage tabs */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-28 bg-muted rounded-lg" />
        ))}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-muted rounded-lg" />
        <div className="h-9 w-32 bg-muted rounded-lg" />
        <div className="h-9 w-32 bg-muted rounded-lg" />
      </div>

      {/* Property cards */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/3 bg-muted/60 rounded" />
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-muted rounded" />
                <div className="h-6 w-24 bg-muted rounded-full" />
              </div>
              <div className="h-3 w-32 bg-muted/50 rounded" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-8 w-8 bg-muted rounded-md" />
              <div className="h-8 w-8 bg-muted rounded-md" />
              <div className="h-8 w-16 bg-muted rounded-md" />
              <div className="h-8 w-8 bg-muted rounded-md" />
              <div className="h-8 w-8 bg-muted rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
