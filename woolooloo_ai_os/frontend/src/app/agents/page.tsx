"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgents } from "@/hooks/useAgents";
import { Agent } from "@/lib/agents";

const AGENT_CONFIGS: Record<string, { icon: string; description: string; category: string }> = {
  "product": { icon: "lightbulb", description: "Product strategy and analysis agent", category: "Product" },
  "dev": { icon: "code", description: "Development automation and code review agent", category: "Development" },
  "growth": { icon: "trending_up", description: "Growth marketing and analytics agent", category: "Growth" },
  "sales": { icon: "shopping_cart", description: "Sales pipeline and lead management agent", category: "Sales" },
  "ops": { icon: "settings", description: "Operations and infrastructure monitoring agent", category: "Operations" },
  "founder": { icon: "person", description: "Executive briefing and decision support agent", category: "Executive" },
};

export default function AgentsPage() {
  const { agents, loading } = useAgents();

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">AI Agents</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Intelligent automation for product, development, growth, sales and operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map(agent => {
            const config = AGENT_CONFIGS[agent.id] || AGENT_CONFIGS["dev"];
            const statusColor = agent.status === "idle" ? "success-tonal" :
                               agent.status === "running" ? "info-tonal" :
                               agent.status === "error" ? "error-tonal" :
                               "secondary-tonal";

            return (
              <Card key={agent.id} className="hover:shadow-md-2 transition-shadow duration-200">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-md-primary-container flex items-center justify-center">
                      <span className="material-symbols-rounded text-28 text-md-on-primary-container">{config.icon}</span>
                    </div>
                    <div>
                      <CardTitle>{config.category}</CardTitle>
                      <Badge variant={statusColor}>{agent.status}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-body-medium text-md-on-surface-variant mb-4">{config.description}</p>

                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-md-outline-variant/50">
                    <div>
                      <p className="text-headline-small font-medium text-md-on-surface">{agent.runCount}</p>
                      <p className="text-label-small text-md-on-surface-variant">Total Runs</p>
                    </div>
                    <div>
                      <p className="text-headline-small font-medium text-md-on-surface">{agent.uptime.toFixed(0)}%</p>
                      <p className="text-label-small text-md-on-surface-variant">Uptime</p>
                    </div>
                  </div>

                  {agent.lastError && (
                    <div className="rounded-xl bg-md-error-container text-md-on-error-container p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-16">error</span>
                        <p className="text-label-small">{agent.lastError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4 pt-4 border-t border-md-outline-variant/50">
                    <Button variant="filled" size="sm">
                      <span className="material-symbols-rounded text-18 mr-1">play_arrow</span>
                      Run
                    </Button>
                    <Button variant="outlined" size="sm">
                      <span className="material-symbols-rounded text-18 mr-1">history</span>
                      Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-md-primary border-r-transparent" />
          </div>
        )}
      </main>
    </div>
  );
}
