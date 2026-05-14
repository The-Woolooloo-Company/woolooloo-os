"use client";

import { useMemo, useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClients, getAllProjects, Client, ClientProject } from "@/lib/clients";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { getProjects } from "@/lib/clockify";

export default function ReportsPage() {
  const { entries, users, projects } = useTimeTracking();
  const [clients, setClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<{ project: ClientProject; client: Client }[]>([]);

  useEffect(() => {
    setClients(getClients());
    setAllProjects(getAllProjects());
  }, []);

  const clientReport = useMemo(() => {
    return clients.map(client => {
      const clientProjects = allProjects.filter(p => p.client.id === client.id);
      const clockifyIds = new Set(clientProjects.map(p => p.project.clockifyProjectId).filter(Boolean) as string[]);
      const clientEntries = entries.filter(e => clockifyIds.has(e.projectId));
      const totalHours = clientEntries.reduce((sum, e) => sum + e.duration / 3600, 0);
      const totalAmount = clientEntries.reduce((sum, e) => sum + (e.billable ? e.billableAmount : 0), 0);
      return { client, totalHours, totalAmount, entries: clientEntries.length };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [clients, allProjects, entries]);

  const userReport = useMemo(() => {
    return users.map(user => {
      const userEntries = entries.filter(e => e.userId === user.id);
      const totalHours = userEntries.reduce((sum, e) => sum + e.duration / 3600, 0);
      const billableHours = userEntries.filter(e => e.billable).reduce((sum, e) => sum + e.duration / 3600, 0);
      return { user, totalHours, billableHours, entries: userEntries.length };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [users, entries]);

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Reports</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Business intelligence from Linear, Clockify, and real-time data
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Client Revenue</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-md-outline-variant/50">
                    <th className="text-left py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Client</th>
                    <th className="text-right py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Hours</th>
                    <th className="text-right py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Amount</th>
                    <th className="text-right py-4 px-4 text-label-medium text-md-on-surface-variant font-medium">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {clientReport.map(row => (
                    <tr key={row.client.id} className="border-b border-md-outline-variant/25 hover:bg-md-on-surface/5 transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-label-large font-medium">
                            {row.client.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-label-large font-medium text-md-on-surface">{row.client.name}</span>
                        </div>
                      </td>
                      <td className="text-right py-4 px-4 text-body-medium text-md-on-surface">{row.totalHours.toFixed(1)}h</td>
                      <td className="text-right py-4 px-4 text-body-medium text-md-on-surface">R{(row.totalAmount / 1000).toFixed(1)}K</td>
                      <td className="text-right py-4 px-4 text-body-medium text-md-on-surface">{row.entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Team Productivity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4">
              {userReport.map(row => (
                <div key={row.user.id} className="flex items-center gap-4 p-4 rounded-xl bg-md-surface-container/50 hover:bg-md-surface-container transition-colors">
                  <div className="h-12 w-12 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container text-label-large font-medium flex-shrink-0">
                    {row.user.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-label-large font-medium text-md-on-surface">{row.user.userName}</p>
                    <p className="text-body-small text-md-on-surface-variant">{row.entries} entries</p>
                  </div>
                  <div className="text-right">
                    <p className="text-title-medium font-medium text-md-on-surface">{row.totalHours.toFixed(1)}h</p>
                    <p className="text-body-small text-md-on-surface-variant">{row.billableHours.toFixed(1)}h billable</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
