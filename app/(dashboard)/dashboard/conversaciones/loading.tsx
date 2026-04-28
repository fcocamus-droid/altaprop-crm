// Skeleton mirrors the inbox 3-column layout so the eye lands on the same
// regions when the real data shows up.
export default function ConversationsLoading() {
  return (
    <div className="flex h-full bg-slate-50 border-t animate-pulse">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r bg-white p-3 space-y-2">
        <div className="h-4 w-20 bg-muted rounded mb-3" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-9 w-full bg-muted/60 rounded-md" />
        ))}
      </aside>
      {/* List */}
      <section className="w-80 shrink-0 border-r bg-white">
        <div className="p-3 border-b">
          <div className="h-9 w-full bg-muted rounded-lg" />
        </div>
        <div className="divide-y">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-3 space-y-2">
              <div className="flex justify-between gap-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-10 bg-muted/60 rounded" />
              </div>
              <div className="h-3 w-3/4 bg-muted/60 rounded" />
              <div className="h-3 w-12 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
      </section>
      {/* Active conversation pane */}
      <main className="flex-1 flex flex-col bg-slate-50">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted" />
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted/60 rounded" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 ? 'justify-end' : 'justify-start'}`}>
              <div className="h-12 w-2/3 bg-white border rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="border-t bg-white p-3">
          <div className="h-12 w-full bg-muted rounded-lg" />
        </div>
      </main>
    </div>
  )
}
