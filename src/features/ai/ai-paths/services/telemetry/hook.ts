import { type PathRunProfiling } from '../path-run-executor/profiling';

export interface TelemetryEvent {
  name: string;
  metadata?: Record<string, unknown>;
}

export interface TelemetryHook {
    recordEvent: (event: TelemetryEvent) => void;
}

export const createTelemetryHook = (profiling: PathRunProfiling): TelemetryHook => {
  return {
    recordEvent: (event: TelemetryEvent): void => {
        // Standardized telemetry capture point
        profiling.captureRuntimeProfileEvent({
            type: 'node',
            status: 'info',
            nodeId: 'telemetry',
            timestamp: Date.now(),
            ...event.metadata,
        });
    },
  };
};
