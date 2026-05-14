"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const agents = ["product", "dev", "growth", "sales", "ops", "founder"];

export function CommandInterface() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!command.trim() || !selectedAgent) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setCommand("");
    setLoading(false);
  };

  return (
    <Card className="hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="material-symbols-rounded text-primary">terminal</span>
          Quick Command
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <select
              value={selectedAgent || ""}
              onChange={(e) => setSelectedAgent(e.target.value || null)}
              className="w-full h-10 rounded-xl border border-md-outline/50 bg-md-surface px-3 text-body-medium text-md-on-surface focus:border-0 focus:outline-none focus:ring-2 focus:ring-md-primary/50 transition-all"
            >
              <option value="">Select agent...</option>
              {agents.map((agent) => (
                <option key={agent} value={agent}>@{agent}</option>
              ))}
            </select>
          </div>
          <Input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Enter your command..."
            className="flex-1"
          />
          <Button
            onClick={handleSubmit}
            disabled={loading || !command.trim() || !selectedAgent}
            variant="filled"
          >
            <span className="material-symbols-rounded mr-2">
              {loading ? "refresh" : "send"}
            </span>
            {loading ? "..." : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
