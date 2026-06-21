"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getConfig, saveConfig, AppConfig, ConfigKey } from "@/lib/config-store";
import { fetchSocialMetrics, SocialMetrics, getOAuthUrl } from "@/lib/social";
import { useToast } from "@/components/toast";

interface Props {
  onMetricsLoaded?: (metrics: SocialMetrics, platform: 'linkedin' | 'facebook') => void;
}

export function SocialConnections({ onMetricsLoaded }: Props) {
  const { showToast } = useToast();
  const [config, setConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [showLinkedin, setShowLinkedin] = useState(false);
  const [showFacebook, setShowFacebook] = useState(false);
  const [linkedinData, setLinkedinData] = useState<any>(null);
  const [facebookData, setFacebookData] = useState<any>(null);

  useEffect(() => { syncConfig(); }, []);

  const syncConfig = useCallback(() => setConfig(getConfig()), []);

  const isLinkedin = !!(config.LINKEDIN_ACCESS_TOKEN && config.LINKEDIN_COMPANY_ID);
  const isFacebook = !!(config.FACEBOOK_ACCESS_TOKEN && config.FACEBOOK_PAGE_ID);

  const save = (key: keyof AppConfig, val: string) => {
    saveConfig({ [key as string]: val } as Record<ConfigKey, string>);
    syncConfig();
  };

  const refreshLinkedin = useCallback(async () => {
    const c = getConfig();
    if (!c.LINKEDIN_ACCESS_TOKEN || !c.LINKEDIN_COMPANY_ID) return;
    setLoading('linkedin');
    try {
      const d = await fetchSocialMetrics('linkedin', c.LINKEDIN_ACCESS_TOKEN, c.LINKEDIN_COMPANY_ID, 'all');
      setLinkedinData(d);
      onMetricsLoaded?.(d, 'linkedin');
      showToast("LinkedIn updated", "success");
    } catch (e: any) { showToast(`LinkedIn: ${e.message}`, "error"); }
    finally { setLoading(null); }
  }, [syncConfig, showToast, onMetricsLoaded]);

  const refreshFacebook = useCallback(async () => {
    const c = getConfig();
    if (!c.FACEBOOK_ACCESS_TOKEN || !c.FACEBOOK_PAGE_ID) return;
    setLoading('facebook');
    try {
      const d = await fetchSocialMetrics('facebook', c.FACEBOOK_ACCESS_TOKEN, c.FACEBOOK_PAGE_ID, 'all');
      setFacebookData(d);
      onMetricsLoaded?.(d, 'facebook');
      showToast("Facebook updated", "success");
    } catch (e: any) { showToast(`Facebook: ${e.message}`, "error"); }
    finally { setLoading(null); }
  }, [syncConfig, showToast, onMetricsLoaded]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="material-symbols-rounded text-24">public</span>
          Social Media Connections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LinkedIn */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-md-surface-container/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center">
                  <span className="material-symbols-rounded text-24 text-[#0A66C2]">language</span>
                </div>
                <div>
                  <p className="text-label-large text-md-on-surface">LinkedIn</p>
                  <p className="text-body-small text-md-on-surface-variant">Company insights</p>
                </div>
              </div>
              <Badge variant={isLinkedin ? "success-tonal" : "secondary-tonal"}>
                {isLinkedin ? "Connected" : "Not connected"}
              </Badge>
            </div>
            {isLinkedin && linkedinData && (
              <div className="grid grid-cols-3 gap-2">
                <MiniMetric label="Impressions" value={fmt(linkedinData.impressions || 0)} />
                <MiniMetric label="Clicks" value={fmt(linkedinData.clicks || 0)} />
                <MiniMetric label="Engagements" value={fmt(linkedinData.engagements || 0)} />
              </div>
            )}
            {isLinkedin ? (
              <div className="flex gap-2">
                <Button variant="filled" size="sm" onClick={refreshLinkedin} loading={loading === 'linkedin'}>
                  <span className="material-symbols-rounded text-18 mr-1">refresh</span> Refresh
                </Button>
                <Button variant="text" size="sm" onClick={() => { save('LINKEDIN_ACCESS_TOKEN', ''); save('LINKEDIN_COMPANY_ID', ''); setLinkedinData(null); showToast("Disconnected", "info"); }}>
                  Disconnect
                </Button>
              </div>
            ) : showLinkedin ? (
              <div className="space-y-2">
                <Input label="Access Token" type="password" value={config.LINKEDIN_ACCESS_TOKEN || ''} onChange={e => save('LINKEDIN_ACCESS_TOKEN', e.target.value)} placeholder="Paste token..." />
                <Input label="Company Page ID" value={config.LINKEDIN_COMPANY_ID || ''} onChange={e => save('LINKEDIN_COMPANY_ID', e.target.value)} placeholder="e.g. 12345678" />
                {config.LINKEDIN_ACCESS_TOKEN && config.LINKEDIN_COMPANY_ID && (
                  <Button variant="filled" size="sm" onClick={refreshLinkedin}>Connect & Refresh</Button>
                )}
                <Button variant="text" size="sm" onClick={() => setShowLinkedin(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="tonal" size="sm" onClick={() => setShowLinkedin(true)}>
                  <span className="material-symbols-rounded text-18 mr-1">key</span> Enter Token
                </Button>
                <Button variant="outlined" size="sm" onClick={() => {
                  if (!config.LINKEDIN_CLIENT_ID) { showToast("Set LinkedIn Client ID in Config first", "error"); return; }
                  window.open(getOAuthUrl('linkedin', config.LINKEDIN_CLIENT_ID, `${window.location.origin}/auth/callback`), '_blank', 'width=600,height=700');
                  showToast("Complete OAuth, then paste the token above", "info");
                }}>
                  <span className="material-symbols-rounded text-18 mr-1">open_in_new</span> OAuth
                </Button>
              </div>
            )}
          </div>

          {/* Facebook */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-md-surface-container/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#1877F2]/10 flex items-center justify-center">
                  <span className="material-symbols-rounded text-24 text-[#1877F2]">thumb_up</span>
                </div>
                <div>
                  <p className="text-label-large text-md-on-surface">Facebook</p>
                  <p className="text-body-small text-md-on-surface-variant">Page insights & posts</p>
                </div>
              </div>
              <Badge variant={isFacebook ? "success-tonal" : "secondary-tonal"}>
                {isFacebook ? "Connected" : "Not connected"}
              </Badge>
            </div>
            {isFacebook && facebookData && (
              <div className="grid grid-cols-3 gap-2">
                <MiniMetric label="Impressions" value={fmt(facebookData.impressions || 0)} />
                <MiniMetric label="Engagements" value={fmt(facebookData.clicks || 0)} />
                <MiniMetric label="Posts" value={(facebookData.posts?.length || 0).toString()} />
              </div>
            )}
            {isFacebook ? (
              <div className="flex gap-2">
                <Button variant="filled" size="sm" onClick={refreshFacebook} loading={loading === 'facebook'}>
                  <span className="material-symbols-rounded text-18 mr-1">refresh</span> Refresh
                </Button>
                <Button variant="text" size="sm" onClick={() => { save('FACEBOOK_ACCESS_TOKEN', ''); save('FACEBOOK_PAGE_ID', ''); setFacebookData(null); showToast("Disconnected", "info"); }}>
                  Disconnect
                </Button>
              </div>
            ) : showFacebook ? (
              <div className="space-y-2">
                <Input label="Page Access Token" type="password" value={config.FACEBOOK_ACCESS_TOKEN || ''} onChange={e => save('FACEBOOK_ACCESS_TOKEN', e.target.value)} placeholder="Page token..." />
                <Input label="Page ID" value={config.FACEBOOK_PAGE_ID || ''} onChange={e => save('FACEBOOK_PAGE_ID', e.target.value)} placeholder="Page ID or username" />
                {config.FACEBOOK_ACCESS_TOKEN && config.FACEBOOK_PAGE_ID && (
                  <Button variant="filled" size="sm" onClick={refreshFacebook}>Connect & Refresh</Button>
                )}
                <Button variant="text" size="sm" onClick={() => setShowFacebook(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="tonal" size="sm" onClick={() => setShowFacebook(true)}>
                  <span className="material-symbols-rounded text-18 mr-1">key</span> Enter Token
                </Button>
                <Button variant="outlined" size="sm" onClick={() => window.open('https://developers.facebook.com/tools/explorer/?method=GET&path=me', '_blank')}>
                  <span className="material-symbols-rounded text-18 mr-1">open_in_new</span> Get Token
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-md-surface-container/50 text-center">
      <p className="text-headline-small font-medium text-md-on-surface">{value}</p>
      <p className="text-body-small text-md-on-surface-variant">{label}</p>
    </div>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}
