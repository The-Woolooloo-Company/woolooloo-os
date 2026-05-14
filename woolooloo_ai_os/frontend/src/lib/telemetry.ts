export interface TelemetryEvent {
  id: string;
  type: string;
  agentId?: string;
  timestamp: string;
  data: Record<string, any>;
}

export interface TelemetrySummary {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByAgent: Record<string, number>;
  errors: number;
  warnings: number;
  averageDuration: number;
  lastEventTime: string;
}

class TelemetryService {
  private events: TelemetryEvent[] = [];
  private readonly MAX_EVENTS = 1000;

  recordEvent(
    type: string,
    data: Record<string, any> = {},
    agentId?: string
  ): TelemetryEvent {
    const event: TelemetryEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      agentId,
      timestamp: new Date().toISOString(),
      data,
    };

    this.events.unshift(event);
    
    // Trim old events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(0, this.MAX_EVENTS);
    }

    // Store in localStorage for persistence
    this.persistEvents();

    return event;
  }

  recordAgentAction(
    agentId: string,
    action: 'start' | 'stop' | 'restart' | 'error',
    metadata?: Record<string, any>
  ): TelemetryEvent {
    return this.recordEvent(`agent.${action}`, { ...metadata }, agentId);
  }

  recordTaskCompletion(
    agentId: string,
    taskName: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>
  ): TelemetryEvent {
    return this.recordEvent('task.completed', {
      taskName,
      duration,
      success,
      ...metadata,
    }, agentId);
  }

  recordError(
    agentId: string,
    errorMessage: string,
    errorDetails?: Record<string, any>
  ): TelemetryEvent {
    return this.recordEvent('error', {
      errorMessage,
      stack: errorDetails?.stack,
      ...errorDetails,
    }, agentId);
  }

  recordCommand(
    agentId: string,
    command: string,
    source: 'ui' | 'slack' | 'whatsapp' | 'api' = 'ui'
  ): TelemetryEvent {
    return this.recordEvent('command.executed', {
      command,
      source,
    }, agentId);
  }

  getEvents(limit = 100): TelemetryEvent[] {
    return this.events.slice(0, limit);
  }

  getEventsByAgent(agentId: string, limit = 100): TelemetryEvent[] {
    return this.events
      .filter((e) => e.agentId === agentId)
      .slice(0, limit);
  }

  getEventsByType(type: string, limit = 100): TelemetryEvent[] {
    return this.events
      .filter((e) => e.type === type)
      .slice(0, limit);
  }

  getSummary(): TelemetrySummary {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const recentEvents = this.events.filter(
      (e) => new Date(e.timestamp).getTime() > oneHourAgo
    );

    const eventsByType: Record<string, number> = {};
    const eventsByAgent: Record<string, number> = {};
    let errors = 0;
    let warnings = 0;
    let totalDuration = 0;
    let durationCount = 0;

    recentEvents.forEach((event) => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      if (event.agentId) {
        eventsByAgent[event.agentId] = (eventsByAgent[event.agentId] || 0) + 1;
      }

      if (event.type === 'error') {
        errors++;
      } else if (event.type === 'warning') {
        warnings++;
      }

      if (event.data.duration !== undefined) {
        totalDuration += event.data.duration;
        durationCount++;
      }
    });

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsByAgent,
      errors,
      warnings,
      averageDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      lastEventTime:
        recentEvents.length > 0 ? recentEvents[0].timestamp : new Date().toISOString(),
    };
  }

  private persistEvents(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'woolooloo-telemetry',
          JSON.stringify(this.events.slice(0, 100))
        );
      }
    } catch (error) {
      console.error('Failed to persist telemetry:', error);
    }
  }

  private loadEvents(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('woolooloo-telemetry');
        if (stored) {
          this.events = JSON.parse(stored);
        }
      }
    } catch (error) {
      console.error('Failed to load telemetry:', error);
    }
  }

  initialize(): void {
    this.loadEvents();
  }
}

export const telemetryService = new TelemetryService();

// Initialize on module load
if (typeof window !== 'undefined') {
  telemetryService.initialize();
}
