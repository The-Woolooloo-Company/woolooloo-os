import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

export function StatusCard({ label, value, change, trend }: StatusCardProps) {
  return (
    <Card className="hover-lift">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <Badge 
            variant={trend === "up" ? "success" : "warning"} 
            
          >
            <span className="material-symbols-rounded mr-1 text-xs">
              {trend === "up" ? "trending_up" : "trending_down"}
            </span>
            {change}
          </Badge>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
