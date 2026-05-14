"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { AgentLog } from "@/lib/agents";
import { cn } from "@/lib/utils";

interface LogsViewerProps {
  agentId: string;
  logs: AgentLog[];
  loading?: boolean;
  onClear?: () => void;
  onRefresh?: () => void;
}

export function LogsViewer({
  agentId,
  logs,
  loading = false,
  onClear,
  onRefresh,
}: LogsViewerProps) {
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error" | "debug">(
    "all"
  );
  const [search, setSearch] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => logs.filter((log) => {
    const matchesFilter = filter === "all" || log.level === filter;
    const matchesSearch =
      search === "" ||
      log.message.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }), [logs, filter, search]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredLogs]);

  const getLevelBadge = (level: string) => {
    const config = {
      info: { bg: "bg-gradient-info", text: "text-white" },
      warn: { bg: "bg-gradient-warning", text: "text-white" },
      error: { bg: "bg-gradient-danger", text: "text-white" },
      debug: { bg: "bg-gradient-secondary", text: "text-white" },
    };
    return config[level as keyof typeof config] || config.info;
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="card shadow-sm border-radius-xl">
      <div className="card-header pb-0">
        <div className="row align-items-center">
          <div className="col-8">
            <h6 className="font-weight-bolder mb-0">
              <i className="material-symbols-rounded me-2">terminal</i>
              Agent Logs
            </h6>
          </div>
          <div className="col-4 text-end">
            <button
              className="btn btn-sm btn-outline-dark me-2"
              onClick={onRefresh}
              disabled={loading}
            >
              <i className="material-symbols-rounded me-1">refresh</i>
              Refresh
            </button>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={onClear}
              disabled={loading || logs.length === 0}
            >
              <i className="material-symbols-rounded me-1">delete</i>
              Clear
            </button>
          </div>
        </div>
      </div>
      <div className="card-body p-0">
        {/* Filters */}
        <div className="p-3 border-bottom d-flex gap-2 flex-wrap">
          <div className="input-group input-group-sm" style={{ maxWidth: "200px" }}>
            <span className="input-group-text">
              <i className="material-symbols-rounded">search</i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="btn-group btn-group-sm">
            {(["all", "info", "warn", "error", "debug"] as const).map((level) => (
              <button
                key={level}
                className={cn(
                  "btn",
                  filter === level ? "btn-dark" : "btn-outline-dark"
                )}
                onClick={() => setFilter(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Logs List */}
        <div className="logs-container" style={{ maxHeight: "500px", overflowY: "auto" }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="text-secondary">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-5">
              <i className="material-symbols-rounded display-4 text-secondary opacity-50">
                terminal
              </i>
              <p className="text-secondary mt-2">
                {search ? "No logs match your search" : "No logs available"}
              </p>
            </div>
          ) : (
            <div className="log-list">
              {filteredLogs.map((log) => {
                const badgeConfig = getLevelBadge(log.level);
                return (
                  <div
                    key={log.id}
                    className="log-entry p-3 border-bottom"
                    style={{
                      backgroundColor:
                        log.level === "error" ? "rgba(244,67,53,0.05)" : "transparent",
                    }}
                  >
                    <div className="row align-items-start">
                      <div className="col-auto">
                        <span
                          className={`badge ${badgeConfig.bg} ${badgeConfig.text}`}
                        >
                          <i className="material-symbols-rounded text-sm me-1">
                            {log.level === "info"
                              ? "info"
                              : log.level === "warn"
                              ? "warning"
                              : log.level === "error"
                              ? "error"
                              : "bug_report"}
                          </i>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <div className="col">
                        <p className="mb-1 font-monospace">
                          <span className="text-secondary me-3">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <span
                            className={log.level === "error" ? "text-danger" : ""}
                          >
                            {log.message}
                          </span>
                        </p>
                        {log.data && (
                          <pre className="mb-0 text-sm bg-light p-2 rounded">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
      <div className="card-footer bg-light">
        <small className="text-secondary">
          Showing {filteredLogs.length} of {logs.length} logs
        </small>
      </div>
    </div>
  );
}


