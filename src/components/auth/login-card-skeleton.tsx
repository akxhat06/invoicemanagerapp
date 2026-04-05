/** Static skeleton for split form column — no pulse animation. */
export function LoginCardSkeleton() {
  return (
    <div className="space-y-5 pt-2" aria-hidden>
      <div className="bg-muted/80 h-9 w-52 rounded-lg" />
      <div className="bg-muted/50 h-4 w-full max-w-[16rem] rounded-md" />
      <div className="bg-muted/70 mt-8 h-12 w-full rounded-xl" />
      <div className="bg-muted/70 h-12 w-full rounded-xl" />
      <div className="bg-muted/50 h-12 w-full rounded-xl" />
    </div>
  );
}
