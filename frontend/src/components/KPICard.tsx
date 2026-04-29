import type { ReactNode } from 'react';

interface KPICardProps {
  label:       string;
  value:       ReactNode;
  subtitle:    string;
  borderColor: string;
}

/**
 * A single KPI metric card with a coloured left rail.
 *
 * Previously duplicated in ClientDashboard and DesignerDashboard.
 * Import from here instead.
 */
export default function KPICard({ label, value, subtitle, borderColor }: KPICardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 relative overflow-hidden">
      <div
        className="absolute left-0 inset-y-0 w-1 rounded-l-xl"
        style={{ backgroundColor: borderColor }}
      />
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
        {label}
      </p>
      <p className="font-mono text-2xl font-bold text-slate-900 leading-none mb-1">
        {value}
      </p>
      <p className="text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}
