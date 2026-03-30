export default function DashboardLoading() {
  return (
    <div className="bg-background/95 fixed inset-0 z-[200] flex items-center justify-center backdrop-blur-[1px]">
      <div className="flex flex-col items-center gap-3">
        <img
          src="/pulsering.svg"
          alt="Loading"
          className="h-16 w-16"
          aria-hidden="true"
        />
        <p className="text-muted-foreground text-sm font-medium">Loading...</p>
      </div>
    </div>
  );
}
