export default function BasePropietariosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-52 bg-muted rounded-lg" />
        <div className="h-4 w-72 bg-muted/60 rounded-lg" />
      </div>
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 w-28 bg-muted rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-3 w-1/4 bg-muted/60 rounded" />
            </div>
            <div className="h-6 w-24 bg-muted/50 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
