"use client";

import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  hover = true,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div className={cn("fos-card", hover && "fos-card-hover", className)}>
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="text-xs opacity-50 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function StatCard({
  label,
  value,
  unit,
  accent = "var(--accent)",
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <Card className="p-5 relative overflow-hidden group">
      {/* accent glow that intensifies on hover */}
      <span
        className="pointer-events-none absolute -top-10 -end-10 w-28 h-28 rounded-full opacity-20 group-hover:opacity-40 transition-opacity blur-2xl"
        style={{ background: accent }}
      />
      <p className="text-[11px] font-mono opacity-60 uppercase tracking-wider relative">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mt-2 relative">
        <span className="text-3xl font-black font-mono" style={{ color: accent }}>
          {value}
        </span>
        {unit && <span className="text-xs opacity-70 font-mono">{unit}</span>}
      </div>
      {sub && (
        <p className="text-[10px] opacity-50 mt-2 border-t border-[var(--border)] pt-2 relative">
          {sub}
        </p>
      )}
    </Card>
  );
}

/** Shimmer skeleton grid used while data loads. */
export function SkeletonGrid({ cards = 8 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="fos-card p-5">
            <div className="fos-skeleton h-3 w-1/2 mb-3" />
            <div className="fos-skeleton h-8 w-2/3" />
          </div>
        ))}
      </div>
      <div className="fos-card p-6">
        <div className="fos-skeleton h-4 w-1/3 mb-4" />
        <div className="fos-skeleton h-64 w-full" />
      </div>
    </div>
  );
}

export function Badge({
  children,
  color = "var(--accent)",
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <span
      className="px-2 py-0.5 rounded text-[10px] font-bold"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center opacity-40 text-sm">{message}</div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="py-20 text-center space-y-3">
      <div className="w-10 h-10 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
      {label && (
        <p className="text-xs tracking-widest opacity-60 uppercase">{label}</p>
      )}
    </div>
  );
}
