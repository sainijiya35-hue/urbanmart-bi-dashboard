interface KpiCardProps {
  label: string;
  value: string;
  subtext: string;
  accent?: 'navy' | 'blue' | 'green';
}

export function KpiCard({ label, value, subtext, accent = 'navy' }: KpiCardProps) {
  const valueColor =
    accent === 'green'
      ? 'text-[#15803d]'
      : accent === 'blue'
        ? 'text-[#1d4ed8]'
        : 'text-[#0f2544]';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-2 truncate text-2xl font-bold tracking-tight tabular-nums ${valueColor}`}>
        {value}
      </p>
      <p className="mt-1.5 text-xs text-slate-500 tabular-nums">{subtext}</p>
    </div>
  );
}
