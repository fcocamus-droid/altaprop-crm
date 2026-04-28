export default function ProspectosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-64 bg-muted/60 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-white border rounded-xl" />
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-24 bg-muted rounded-full" />
        ))}
      </div>
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted/60 rounded" />
            </div>
            <div className="h-6 w-20 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
