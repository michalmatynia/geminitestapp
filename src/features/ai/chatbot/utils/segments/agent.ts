import {
  type AgentAuditLogDto as AgentAuditLog,
  type AgentBrowserLogDto as AgentBrowserLog,
  type ChatbotTimelineEntryDto as TimelineEntry,
} from '@/shared/contracts/chatbot';
import type { IdLabelOptionDto } from '@/shared/contracts/base';

const getMetadataRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const buildAgentResultMessage = (
  audits: AgentAuditLog[],
  status: string | null
): string | null => {
  const taskType: unknown = audits
    .map((audit: AgentAuditLog): unknown => audit.metadata)
    .find(
      (metadata: unknown): boolean =>
        Boolean(metadata) &&
        typeof (metadata as { plannerMeta?: { taskType?: string } }).plannerMeta?.taskType ===
          'string'
    );
  const resolvedTaskType: string | null =
    (taskType as { plannerMeta?: { taskType?: string } })?.plannerMeta?.taskType ?? null;
  const extractionAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean => {
      const metadata = getMetadataRecord(audit.metadata);
      return Array.isArray(metadata?.['items']) || Array.isArray(metadata?.['names']);
    }
  );
  if (extractionAudit) {
    const metadata = getMetadataRecord(extractionAudit.metadata);
    const extractionItems: unknown[] = Array.isArray(metadata?.['items'])
      ? (metadata['items'] as unknown[])
      : Array.isArray(metadata?.['names'])
        ? (metadata['names'] as unknown[])
        : [];
    const items: string[] = extractionItems
      .filter((name: unknown): name is string => typeof name === 'string')
      .map((name: string): string => name.trim())
      .filter(Boolean);
    if (items.length > 0) {
      const url: string | null =
        typeof metadata?.['url'] === 'string'
          ? metadata['url']
          : null;
      const extractionType: string | null =
        typeof metadata?.['extractionType'] === 'string'
          ? metadata['extractionType']
          : null;
      const label: string =
        extractionType === 'emails'
          ? 'Extracted emails'
          : extractionType === 'product_names'
            ? 'Extracted product names'
            : 'Extracted information';
      const intro: string = url ? `${label} found on ${url}:` : `${label}:`;
      return `${intro}\n${items.map((name: string): string => `- ${name}`).join('\n')}`;
    }
  }
  const emptyAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean => audit.message === 'No product names extracted.'
  );
  if (emptyAudit) {
    const metadata = getMetadataRecord(emptyAudit.metadata);
    const url: string | null =
      typeof metadata?.['url'] === 'string' ? metadata['url'] : null;
    return `No information extracted${url ? ` from ${url}` : ''}.`;
  }
  if (status === 'completed') {
    if (resolvedTaskType === 'extract_info') {
      return 'No information extracted.';
    }
    if (resolvedTaskType === 'web_task') {
      return 'Agent run completed. Actions executed in agent mode.';
    }
    return 'Agent run completed. No extractable results.';
  }
  if (status === 'failed') {
    return 'Agent run failed. Check the agent run details for errors.';
  }
  if (status === 'waiting_human') {
    return 'Agent run needs human input to continue.';
  }
  return null;
};

export const buildAgentResumeSummaryMessage = (audits: AgentAuditLog[]): string | null => {
  const resumeAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean => audit.message === 'Resume summary prepared.'
  );
  const autoResumeAudit: AgentAuditLog | undefined = audits.find(
    (audit: AgentAuditLog): boolean => audit.message === 'Auto-resume queued for stuck run.'
  );
  if (!resumeAudit) {
    if (!autoResumeAudit) return null;
    const timestamp: string | null = autoResumeAudit.createdAt
      ? new Date(autoResumeAudit.createdAt).toLocaleString()
      : null;
    return `Auto-resume queued for stuck run${timestamp ? ` (${timestamp})` : ''}.`;
  }
  const metadata = getMetadataRecord(resumeAudit.metadata);
  const summary: string =
    typeof metadata?.['summary'] === 'string'
      ? metadata['summary'].trim()
      : '';
  if (!summary) return null;
  return `Resume summary:
${summary}`;
};

export const buildToolTimeline = (
  logs: AgentBrowserLog[],
  audits: AgentAuditLog[]
): TimelineEntry[] => {
  const auditEntries: TimelineEntry[] = audits
    .filter((audit: AgentAuditLog): boolean =>
      /tool|playwright|snapshot|selector|extraction|login|search|navigation/i.test(audit.message)
    )
    .map(
      (audit: AgentAuditLog): TimelineEntry => ({
        id: `audit-${audit.id}`,
        type: 'log' as const,
        level: audit.level,
        content: audit.message,
        timestamp: audit.createdAt || new Date().toISOString(),
        metadata: audit.metadata,
      })
    );
  const logEntries: TimelineEntry[] = logs.map(
    (log: AgentBrowserLog): TimelineEntry => ({
      id: `browser-${log.id}`,
      type: 'log' as const,
      level: log.level,
      content: log.message,
      timestamp: log.createdAt || new Date().toISOString(),
      metadata: log.metadata,
    })
  );
  return [...auditEntries, ...logEntries].sort(
    (a: TimelineEntry, b: TimelineEntry): number =>
      new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime()
  );
};

export const getSelfCheckAudits = (audits: AgentAuditLog[]): AgentAuditLog[] =>
  audits.filter((audit: AgentAuditLog): boolean => audit.message === 'Self-check completed.');

type AdaptiveTrigger = IdLabelOptionDto & {
  createdAt: string;
  reason: string | null;
};

export const getLatestAdaptiveTrigger = (
  audits: AgentAuditLog[]
): AdaptiveTrigger | null => {
  const candidates: Array<AdaptiveTrigger> = audits
    .map(
      (audit: AgentAuditLog): AdaptiveTrigger | null => {
        const metadata: {
          type?: string;
          reason?: string | null;
        } | null = audit.metadata as {
          type?: string;
          reason?: string | null;
        } | null;
        const type: string | undefined = metadata?.['type'];
        if (type !== 'plan-replan' && type !== 'plan-adapt' && type !== 'self-check-replan') {
          return null;
        }
        const label: string =
          type === 'plan-adapt'
            ? 'mid-run adaptation'
            : type === 'self-check-replan'
              ? 'self-check replan'
              : 'adaptive replan';
        return {
          id: audit.id,
          createdAt: audit.createdAt || new Date().toISOString(),
          reason: typeof metadata?.['reason'] === 'string' ? metadata['reason'] : null,
          label,
        };
      }
    )
    .filter((item: AdaptiveTrigger | null): item is AdaptiveTrigger => Boolean(item));
  if (candidates.length === 0) return null;
  return candidates.reduce(
    (
      latest: AdaptiveTrigger,
      current: AdaptiveTrigger
    ): AdaptiveTrigger => {
      const latestTime: number = Date.parse(latest.createdAt);
      const currentTime: number = Date.parse(current.createdAt);
      return currentTime > latestTime ? current : latest;
    },
    candidates[0]!
  );
};

export const getLatestAuditByType = (
  audits: AgentAuditLog[],
  type: string
): AgentAuditLog | null => {
  const filtered: AgentAuditLog[] = audits.filter(
    (audit: AgentAuditLog): boolean => getMetadataRecord(audit.metadata)?.['type'] === type
  );
  return filtered.length ? filtered[filtered.length - 1]! : null;
};
