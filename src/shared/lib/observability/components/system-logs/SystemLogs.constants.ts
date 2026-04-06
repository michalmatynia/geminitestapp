import { AlertTriangle, Monitor, Server, Shield } from 'lucide-react';
import type { LogTriagePresetDefinition } from '@/shared/lib/observability/log-triage-presets';

export const TRIAGE_PRESET_ICONS: Record<
  LogTriagePresetDefinition['id'],
  React.ComponentType<{ className?: string }>
> = {
  'recent-errors-24h': AlertTriangle,
  'http-500-last7d': Server,
  'client-errors-last7d': Monitor,
  'auth-anomalies-last3d': Shield,
  'validation-errors-last7d': AlertTriangle,
  'integration-errors-last7d': Server,
  'system-alerts-last24h': AlertTriangle,
  'kangur-source-last7d': Monitor,
  'kangur-auth-last3d': Shield,
  'kangur-progress-last3d': Monitor,
  'kangur-slow-progress-last3d': Server,
  'kangur-tts-last3d': AlertTriangle,
};
