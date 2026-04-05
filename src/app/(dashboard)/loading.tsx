export default function DashboardLoading() {
  return (
    <div className="min-h-[50vh] animate-pulse space-y-4">
      <div className="h-8 max-w-xs rounded-lg bg-zinc-800/80" />
      <div className="h-36 max-w-2xl rounded-2xl bg-zinc-800/60 ring-1 ring-white/[0.06]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-zinc-800/60 ring-1 ring-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}
