"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", revenue: 8500 },
  { name: "Feb", revenue: 9200 },
  { name: "Mar", revenue: 8800 },
  { name: "Apr", revenue: 10500 },
  { name: "May", revenue: 11200 },
  { name: "Jun", revenue: 12450 },
];

export function RevenueChart() {
  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="material-symbols-rounded text-primary">analytics</span>
          Revenue Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis 
                dataKey="name" 
                stroke="#737373"
                tick={{ fill: "#737373" }}
              />
              <YAxis 
                stroke="#737373"
                tick={{ fill: "#737373" }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#fff", 
                  border: "1px solid #e5e5e5",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)"
                }} 
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#e91e63" 
                strokeWidth={3}
                dot={{ fill: "#e91e63", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
