export default function PostulacionesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-44 bg-muted rounded-lg" />
        <div className="h-4 w-56 bg-muted/60 rounded-lg" />
      </div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-28 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-6 w-20 bg-muted rounded-full" />
            </div>
            <div className="h-3 w-1/3 bg-muted/60 rounded" />
            <div className="h-3 w-1/4 bg-muted/40 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
