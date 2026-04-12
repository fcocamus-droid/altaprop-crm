export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted/60 rounded-lg" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 space-y-3">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded-lg" />
          </div>
        ))}
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-muted rounded-lg" />
        ))}
      </div>

      {/* List items skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 bg-muted rounded" />
              <div className="h-3 w-1/3 bg-muted/60 rounded" />
              <div className="flex gap-2">
                <div className="h-5 w-20 bg-muted rounded-full" />
                <div className="h-5 w-16 bg-muted/60 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <div className="h-8 w-8 bg-muted rounded-md" />
              <div className="h-8 w-16 bg-muted rounded-md" />
              <div className="h-8 w-8 bg-muted rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
