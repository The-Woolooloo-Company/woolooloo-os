import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const activities = [
  { agent: "dev", action: "Fixed authentication bug", time: "2m ago" },
  { agent: "sales", action: "Generated 3 proposals", time: "15m ago" },
  { agent: "ops", action: "MRR report generated", time: "1h ago" },
  { agent: "growth", action: "Campaign sent to 500 leads", time: "2h ago" },
  { agent: "product", action: "Created feature spec", time: "3h ago" },
];

export function RecentActivity() {
  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="material-symbols-rounded text-primary">history</span>
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                {index < activities.length - 1 && (
                  <div className="absolute top-4 left-1 w-px h-full bg-gray-200 -ml-px" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary-tonal" >
                    <span className="material-symbols-rounded mr-1 text-xs">psychology</span>
                    {activity.agent}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
                <p className="text-sm text-foreground">{activity.action}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
