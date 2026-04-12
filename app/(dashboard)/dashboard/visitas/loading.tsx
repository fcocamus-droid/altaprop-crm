export default function VisitasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-28 bg-muted rounded-lg" />
        <div className="h-4 w-52 bg-muted/60 rounded-lg" />
      </div>
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-muted rounded" />
              <div className="h-3 w-1/3 bg-muted/60 rounded" />
            </div>
            <div className="h-6 w-24 bg-muted rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
