type Props = {
  title: string;
  description?: string;
};

export function DashboardPagePlaceholder({ title, description }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-700/60 bg-card px-6 py-10 shadow-sm">
      <h2 className="font-login-serif text-2xl font-semibold tracking-tight text-card-foreground">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      ) : (
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          This area will hold your workspace content. Navigation is ready—screens can be designed next.
        </p>
      )}
    </section>
  );
}
