"use client";

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  gradient?: string;
  trend?: { value: string; positive: boolean };
  subtitle?: string;
}

const gradientMap: Record<string, string> = {
  primary: "bg-md-primary text-md-on-primary",
  secondary: "bg-md-secondary text-md-on-secondary",
  tertiary: "bg-md-tertiary text-md-on-tertiary",
  info: "bg-info text-on-info",
  success: "bg-success text-on-success",
  warning: "bg-warning text-on-warning",
  danger: "bg-md-error text-md-on-error",
  dark: "bg-md-on-surface-variant text-md-on-surface",
};

export function StatCard({ label, value, icon, gradient = "primary", trend, subtitle }: StatCardProps) {
  const color = gradientMap[gradient] || gradientMap.primary;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md-1 ${color}`}>
            <span className="material-symbols-rounded text-24">{icon}</span>
          </div>
          <div>
            <p className="text-label-medium text-md-on-surface-variant">{label}</p>
            <p className="text-headline-medium font-medium text-md-on-surface">{value}</p>
            {subtitle && <p className="text-body-small text-md-on-surface-variant">{subtitle}</p>}
            {trend && (
              <span className={`text-body-small font-medium ${trend.positive ? "text-success" : "text-warning"}`}>
                <span className="material-symbols-rounded text-14 align-middle mr-0.5">{trend.positive ? 'trending_up' : 'trending_down'}</span>
                {trend.value}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
