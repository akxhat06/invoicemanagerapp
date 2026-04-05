export default function DashboardLoading() {
  return (
    <div className="min-h-[50vh] animate-pulse space-y-4">
      <div className="h-8 max-w-xs rounded-lg bg-zinc-900/[0.06] dark:bg-zinc-900/[0.08]" />
      <div className="h-36 max-w-2xl rounded-2xl bg-white/80 shadow-sm ring-1 ring-zinc-900/[0.04]" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-white/80 ring-1 ring-zinc-900/[0.04]" />
        ))}
      </div>
    </div>
  );
}
