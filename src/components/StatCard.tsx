import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: boolean;
}

export function StatCard({ label, value, icon: Icon, trend, accent }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${accent ? "bg-accent/15" : "bg-primary/10"}`}>
          <Icon className={`h-4 w-4 ${accent ? "text-accent-foreground" : "text-primary"}`} />
        </div>
      </div>
      <p className="font-heading text-2xl font-bold text-foreground">{value}</p>
      {trend && <p className="text-xs text-success mt-1">{trend}</p>}
    </div>
  );
}
