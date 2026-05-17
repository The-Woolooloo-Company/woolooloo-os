"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/toast";
import {
  getConfig,
  saveConfig,
  getAgentEnabled,
  saveAgentEnabled,
  getHarnessConfig,
  saveHarnessConfig,
  isLinearConfigured,
  isClockifyConfigured,
  isGithubConfigured,
  isVllmConfigured,
  AppConfig,
  AgentEnabled,
  HarnessConfig,
} from "@/lib/config-store";
import { HARNESS_OPTIONS, HarnessId } from "@/lib/constants";

export default function ConfigPage() {
  const { showToast } = useToast();
  const [section, setSection] = useState<"integrations" | "agents" | "appearance">("integrations");

  // State for API keys
  const [config, setConfig] = useState<AppConfig>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  // State for agent toggles
  const [agentEnabled, setAgentEnabled] = useState<AgentEnabled>({});

  // State for harness config
  const [harnessConfig, setHarnessConfig] = useState<HarnessConfig>({});

  useEffect(() => {
    setConfig(getConfig());
    setAgentEnabled(getAgentEnabled());
    setHarnessConfig(getHarnessConfig());
  }, []);

  const handleConfigChange = (key: keyof AppConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSaveConfig = () => {
    const updates: Partial<AppConfig> = {};
    dirty.forEach(key => {
      updates[key as keyof AppConfig] = config[key as keyof AppConfig];
    });
    saveConfig(updates);
    setDirty(new Set());
    showToast("Configuration saved", "success");
  };

  const handleAgentToggle = (agent: keyof AgentEnabled) => {
    setAgentEnabled(prev => {
      const updated = { ...prev, [agent]: !prev[agent] };
      saveAgentEnabled({ [agent]: !prev[agent] });
      return updated;
    });
  };

  const handleHarnessChange = (agent: keyof HarnessConfig, value: HarnessId) => {
    setHarnessConfig(prev => {
      const updated = { ...prev, [agent]: value };
      saveHarnessConfig({ [agent]: value });
      return updated;
    });
  };

  const integrations = [
    { label: "Linear", status: isLinearConfigured(), icon: "bolt", desc: "Project management & tasks" },
    { label: "Clockify", status: isClockifyConfigured(), icon: "schedule", desc: "Time tracking & billing" },
    { label: "GitHub", status: isGithubConfigured(), icon: "code", desc: "Code repos & CI" },
    { label: "vLLM", status: isVllmConfigured(), icon: "memory", desc: "Local AI model inference" },
  ];

  const apiKeys = [
    { key: "LINEAR_API_KEY" as keyof AppConfig, label: "Linear API Key", type: "password" },
    { key: "LINEAR_WEBHOOK_SECRET" as keyof AppConfig, label: "Linear Webhook Secret", type: "password" },
    { key: "CLOCKIFY_API_KEY" as keyof AppConfig, label: "Clockify API Key", type: "password" },
    { key: "CLOCKIFY_WORKSPACE_ID" as keyof AppConfig, label: "Clockify Workspace ID", type: "text" },
    { key: "GITHUB_TOKEN" as keyof AppConfig, label: "GitHub Token", type: "password" },
    { key: "GITHUB_OWNER" as keyof AppConfig, label: "GitHub Owner / Org", type: "text" },
    { key: "GITHUB_REPO" as keyof AppConfig, label: "GitHub Repo", type: "text" },
    { key: "BITBUCKET_APP_KEY" as keyof AppConfig, label: "Bitbucket App Key", type: "password" },
    { key: "JIRA_DOMAIN" as keyof AppConfig, label: "Jira Domain (e.g. yourcompany.atlassian.net)", type: "text" },
    { key: "JIRA_API_TOKEN" as keyof AppConfig, label: "Jira API Token", type: "password" },
    { key: "CONFLUENCE_DOMAIN" as keyof AppConfig, label: "Confluence Domain (e.g. yourcompany.atlassian.net)", type: "text" },
    { key: "CONFLUENCE_API_TOKEN" as keyof AppConfig, label: "Confluence API Token", type: "password" },
    { key: "VLLM_HOST" as keyof AppConfig, label: "vLLM Host", type: "text" },
    { key: "VLLM_MODEL" as keyof AppConfig, label: "vLLM Model", type: "text" },
    { key: "VLLM_API_KEY" as keyof AppConfig, label: "vLLM API Key", type: "password" },
  ];

  const agents: { id: keyof AgentEnabled; label: string; icon: string; description: string }[] = [
    { id: "product", label: "Product Agent", icon: "lightbulb", description: "Product strategy, analysis, and roadmapping" },
    { id: "dev", label: "Dev Agent", icon: "code", description: "Development automation, code review, and deployment" },
    { id: "growth", label: "Growth Agent", icon: "trending_up", description: "Growth marketing, analytics, and optimization" },
    { id: "sales", label: "Sales Agent", icon: "shopping_cart", description: "Lead management, pipeline, and proposals" },
    { id: "ops", label: "Ops Agent", icon: "settings", description: "Infrastructure, monitoring, and operations" },
    { id: "founder", label: "Founder Agent", icon: "person", description: "Executive briefing and decision support" },
  ];

  const sections = [
    { id: "integrations" as const, label: "Integrations", icon: "link" },
    { id: "agents" as const, label: "Agents", icon: "psychology" },
    { id: "appearance" as const, label: "Appearance", icon: "palette" },
  ];

  return (
    <div className="min-h-screen bg-md-surface">
      <Navbar />

      <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-display-small text-md-on-surface">Settings</h1>
          <p className="text-body-large text-md-on-surface-variant mt-1">
            Configure integrations, agents, and appearance
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-md-surface-container/50 mb-8 w-fit">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-label-large font-medium transition-all duration-200 min-h-[48px] ${
                section === s.id
                  ? "bg-md-primary text-md-on-primary shadow-md-1"
                  : "text-md-on-surface hover:bg-md-on-surface/5"
              }`}
            >
              <span className="material-symbols-rounded text-18">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Integrations ── */}
        {section === "integrations" && (
          <div className="space-y-6">
            {/* Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrations.map(int => (
                  <div key={int.label} className="flex items-center justify-between p-4 rounded-xl bg-md-surface-container/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-md-primary-container flex items-center justify-center text-md-on-primary-container">
                        <span className="material-symbols-rounded text-20">{int.icon}</span>
                      </div>
                      <div>
                        <p className="text-label-large text-md-on-surface">{int.label}</p>
                        <p className="text-body-small text-md-on-surface-variant">{int.desc}</p>
                      </div>
                    </div>
                    <Badge variant={int.status ? "success-tonal" : "error-tonal"}>
                      <span className="material-symbols-rounded text-14 mr-1">{int.status ? "check_circle" : "error"}</span>
                      {int.status ? "Connected" : "Not configured"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* API Keys */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>API Keys</CardTitle>
                  {dirty.size > 0 && (
                    <Button variant="filled" size="sm" onClick={handleSaveConfig}>
                      <span className="material-symbols-rounded text-18 mr-1">save</span>
                      Save ({dirty.size})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiKeys.map(field => (
                  <div key={field.key}>
                    <Input
                      label={field.label}
                      type={field.type}
                      value={(config[field.key] as string) || ""}
                      onChange={e => handleConfigChange(field.key, e.target.value)}
                      placeholder={`Enter ${field.label}...`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Agents ── */}
        {section === "agents" && (
          <div className="space-y-6">
            {/* Agent Toggles */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Toggles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {agents.map(agent => (
                  <div key={agent.id} className="flex items-center justify-between p-4 rounded-xl bg-md-surface-container/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-md-secondary-container flex items-center justify-center text-md-on-secondary-container">
                        <span className="material-symbols-rounded text-20">{agent.icon}</span>
                      </div>
                      <div>
                        <p className="text-label-large text-md-on-surface">{agent.label}</p>
                        <p className="text-body-small text-md-on-surface-variant">{agent.description}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer min-h-[48px]">
                      <input
                        type="checkbox"
                        checked={!!agentEnabled[agent.id]}
                        onChange={() => handleAgentToggle(agent.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-md-on-surface-variant/30 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-md-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-md-primary" />
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Agent Harness Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Agent Harness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-md-outline-variant/50">
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Agent</th>
                        <th className="text-left py-3 px-4 text-label-medium text-md-on-surface-variant font-medium">Harness</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map(agent => (
                        <tr key={agent.id} className="border-b border-md-outline-variant/25">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-rounded text-18 text-md-primary">{agent.icon}</span>
                              <span className="text-label-large text-md-on-surface">{agent.label}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              className="h-10 px-3 rounded-xl border border-md-outline/50 bg-md-surface text-body-medium text-md-on-surface focus:outline-none focus:ring-2 focus:ring-md-primary/50"
                              value={(harnessConfig[agent.id] as string) || "pi"}
                              onChange={e => handleHarnessChange(agent.id, e.target.value as HarnessId)}
                            >
                              {HARNESS_OPTIONS.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Appearance ── */}
        {section === "appearance" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl bg-md-surface-container/50">
                  <div>
                    <p className="text-label-large text-md-on-surface">Light / Dark Mode</p>
                    <p className="text-body-small text-md-on-surface-variant">
                      Choose between light and dark theme. System follows your OS preference.
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-display-large text-md-on-surface">Display Large</p>
                    <p className="text-body-small text-md-on-surface-variant">57px / 400 weight</p>
                  </div>
                  <div>
                    <p className="text-headline-medium text-md-on-surface">Headline Medium</p>
                    <p className="text-body-small text-md-on-surface-variant">28px / 400 weight</p>
                  </div>
                  <div>
                    <p className="text-title-large text-md-on-surface">Title Large</p>
                    <p className="text-body-small text-md-on-surface-variant">22px / 500 weight</p>
                  </div>
                  <div>
                    <p className="text-body-large text-md-on-surface">Body Large — The quick brown fox jumps over the lazy dog.</p>
                    <p className="text-body-small text-md-on-surface-variant">16px / 400 weight</p>
                  </div>
                  <div>
                    <p className="text-label-large text-md-on-surface">Label Large</p>
                    <p className="text-body-small text-md-on-surface-variant">14px / 500 weight</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Buttons */}
                  <div>
                    <p className="text-label-medium text-md-on-surface-variant mb-3">Buttons</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="filled">Filled</Button>
                      <Button variant="tonal">Tonal</Button>
                      <Button variant="outlined">Outlined</Button>
                      <Button variant="text">Text</Button>
                    </div>
                  </div>
                  {/* Badges */}
                  <div>
                    <p className="text-label-medium text-md-on-surface-variant mb-3">Badges</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="primary">Primary</Badge>
                      <Badge variant="primary-tonal">Tonal</Badge>
                      <Badge variant="success-tonal">Success</Badge>
                      <Badge variant="error-tonal">Error</Badge>
                      <Badge variant="warning-tonal">Warning</Badge>
                    </div>
                  </div>
                  {/* Chips */}
                  <div>
                    <p className="text-label-medium text-md-on-surface-variant mb-3">Elevations</p>
                    <div className="flex flex-wrap gap-3">
                      <div className="h-16 w-16 rounded-xl bg-md-primary shadow-md-1" />
                      <div className="h-16 w-16 rounded-xl bg-md-primary shadow-md-2" />
                      <div className="h-16 w-16 rounded-xl bg-md-primary shadow-md-3" />
                      <div className="h-16 w-16 rounded-xl bg-md-primary shadow-md-4" />
                      <div className="h-16 w-16 rounded-xl bg-md-primary shadow-md-5" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
