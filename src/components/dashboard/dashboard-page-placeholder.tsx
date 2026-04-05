type Props = {
  title: string;
  description?: string;
};

export function DashboardPagePlaceholder({ title, description }: Props) {
  return (
    <section className="rounded-2xl border border-zinc-900/[0.06] bg-white px-6 py-10 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="font-login-serif text-2xl font-semibold tracking-tight text-zinc-900">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-zinc-600">{description}</p>
      ) : (
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-zinc-600">
          This area will hold your workspace content. Navigation is ready—screens can be designed next.
        </p>
      )}
    </section>
  );
}
