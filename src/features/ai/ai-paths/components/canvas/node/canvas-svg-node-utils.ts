import type { DataContractNodeIssueSummary } from '@/shared/lib/ai-paths';

export const BLOCKER_PROCESSING_STATUSES = new Set<string>([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

export const INPUT_CONNECTOR_COLORS = {
  fill: 'rgba(56, 189, 248, 0.18)',
  fillConnected: 'rgba(56, 189, 248, 0.34)',
  stroke: 'rgba(125, 211, 252, 0.9)',
};

export const OUTPUT_CONNECTOR_COLORS = {
  fill: 'rgba(251, 191, 36, 0.22)',
  stroke: 'rgba(252, 211, 77, 0.9)',
};

export const formatRuntimeStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((part: string): string => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(' ');

export const resolveNodePalette = (
  nodeType: string
): { fill: string; stroke: string; text: string; accent: string } => {
  switch (nodeType) {
    case 'trigger':
      return {
        fill: 'rgba(16, 185, 129, 0.14)',
        stroke: 'rgba(16, 185, 129, 0.72)',
        text: '#dcfce7',
        accent: '#6ee7b7',
      };
    case 'context':
      return {
        fill: 'rgba(45, 212, 191, 0.14)',
        stroke: 'rgba(45, 212, 191, 0.7)',
        text: '#ccfbf1',
        accent: '#5eead4',
      };
    case 'fetcher':
      return {
        fill: 'rgba(14, 165, 233, 0.14)',
        stroke: 'rgba(14, 165, 233, 0.7)',
        text: '#e0f2fe',
        accent: '#7dd3fc',
      };
    case 'simulation':
      return {
        fill: 'rgba(6, 182, 212, 0.14)',
        stroke: 'rgba(6, 182, 212, 0.7)',
        text: '#cffafe',
        accent: '#67e8f9',
      };
    case 'database':
      return {
        fill: 'rgba(59, 130, 246, 0.14)',
        stroke: 'rgba(59, 130, 246, 0.7)',
        text: '#dbeafe',
        accent: '#93c5fd',
      };
    case 'viewer':
      return {
        fill: 'rgba(251, 191, 36, 0.12)',
        stroke: 'rgba(251, 191, 36, 0.64)',
        text: '#fef3c7',
        accent: '#fcd34d',
      };
    case 'bounds_normalizer':
      return {
        fill: 'rgba(20, 184, 166, 0.14)',
        stroke: 'rgba(20, 184, 166, 0.70)',
        text: '#ccfbf1',
        accent: '#5eead4',
      };
    case 'canvas_output':
      return {
        fill: 'rgba(14, 165, 233, 0.14)',
        stroke: 'rgba(14, 165, 233, 0.70)',
        text: '#e0f2fe',
        accent: '#7dd3fc',
      };
    default:
      return {
        fill: 'rgba(17, 24, 39, 0.88)',
        stroke: 'rgba(148, 163, 184, 0.55)',
        text: '#e5e7eb',
        accent: '#7dd3fc',
      };
  }
};

export const statusPalette = (
  status: string | null
): { fill: string; stroke: string; text: string } | null => {
  if (!status) return null;
  if (status === 'completed') {
    return {
      fill: 'rgba(16, 185, 129, 0.16)',
      stroke: 'rgba(16, 185, 129, 0.6)',
      text: '#a7f3d0',
    };
  }
  if (status === 'cached') {
    return {
      fill: 'rgba(20, 184, 166, 0.16)',
      stroke: 'rgba(20, 184, 166, 0.6)',
      text: '#99f6e4',
    };
  }
  if (status === 'failed' || status === 'canceled' || status === 'timeout') {
    return {
      fill: 'rgba(244, 63, 94, 0.18)',
      stroke: 'rgba(244, 63, 94, 0.6)',
      text: '#fecdd3',
    };
  }
  if (status === 'queued') {
    return {
      fill: 'rgba(245, 158, 11, 0.16)',
      stroke: 'rgba(245, 158, 11, 0.6)',
      text: '#fde68a',
    };
  }
  if (
    status === 'running' ||
    status === 'polling' ||
    status === 'paused' ||
    status === 'waiting_callback' ||
    status === 'advance_pending'
  ) {
    return {
      fill: 'rgba(56, 189, 248, 0.16)',
      stroke: 'rgba(56, 189, 248, 0.64)',
      text: '#bae6fd',
    };
  }
  return {
    fill: 'rgba(71, 85, 105, 0.2)',
    stroke: 'rgba(148, 163, 184, 0.45)',
    text: '#e2e8f0',
  };
};

export const resolveNodeDiagnosticsBadgePalette = (
  summary: DataContractNodeIssueSummary | undefined
): { fill: string; stroke: string; text: string; label: string } | null => {
  if (!summary) return null;
  if (summary.errors > 0) {
    return {
      fill: 'rgba(244, 63, 94, 0.2)',
      stroke: 'rgba(244, 63, 94, 0.7)',
      text: '#fecdd3',
      label: `E${summary.errors}`,
    };
  }
  if (summary.warnings > 0) {
    return {
      fill: 'rgba(245, 158, 11, 0.2)',
      stroke: 'rgba(245, 158, 11, 0.72)',
      text: '#fde68a',
      label: `W${summary.warnings}`,
    };
  }
  return null;
};

export const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const mergeRuntimePayload = (
  current: Record<string, unknown> | undefined,
  historyValue: unknown
): Record<string, unknown> | undefined => {
  const historical = isPlainRecord(historyValue) ? historyValue : undefined;
  if (!historical && !current) return undefined;
  if (!historical) return current;
  if (!current) return historical;
  return {
    ...historical,
    ...current,
  };
};
