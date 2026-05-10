import type { Company, JobListing, JobScanRecord } from '@/shared/contracts/job-board';

export type PromotionLogEntry = {
  scanId: string;
  scanSourceUrl: string;
  companyId: string | null;
  companyName: string | null;
  kind: 'auto' | 'manual';
  status: 'completed' | 'skipped' | 'failed' | 'pending' | 'running';
  message: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
};

const PROMOTION_STEP_KEYS: Record<string, PromotionLogEntry['kind']> = {
  auto_promote: 'auto',
  manual_promote: 'manual',
};

export const collectPromotionLog = (scans: JobScanRecord[], companies: Company[]): PromotionLogEntry[] => {
  const companyById = new Map(companies.map((c) => [c.id, c]));
  const entries: PromotionLogEntry[] = [];
  for (const scan of scans) {
    for (const step of scan.steps) {
      const kind = PROMOTION_STEP_KEYS[step.key];
      if (kind === undefined) continue;
      const company = scan.companyId !== null ? companyById.get(scan.companyId) ?? null : null;
      entries.push({
        scanId: scan.id,
        scanSourceUrl: scan.sourceUrl,
        companyId: scan.companyId,
        companyName:
          company?.name ??
          ((scan.evaluation?.company as Record<string, unknown> | null)?.['name'] as
            | string
            | undefined) ??
          null,
        kind,
        status: step.status as PromotionLogEntry['status'],
        message: step.message,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        durationMs: step.durationMs,
      });
    }
  }
  return entries.sort((a, b) => {
    const aTs = a.completedAt !== null ? Date.parse(a.completedAt) : 0;
    const bTs = b.completedAt !== null ? Date.parse(b.completedAt) : 0;
    return bTs - aTs;
  });
};

export const promotionStatusBadge = (status: PromotionLogEntry['status']): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'skipped':
      return 'bg-slate-100 text-slate-700';
    case 'failed':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
};

export const statusBadge = (status: JobScanRecord['status']): string => {
  switch (status) {
    case 'completed':
      return 'bg-emerald-100 text-emerald-800';
    case 'running':
    case 'queued':
      return 'bg-blue-100 text-blue-800';
    case 'failed':
      return 'bg-rose-100 text-rose-800';
    case 'no_match':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
};

export const formatSalary = (salary: JobListing['salary']): string => {
  if (salary === null || salary === undefined) return '—';
  if (typeof salary.raw === 'string' && salary.raw !== '') return salary.raw;
  const min = salary.min;
  const max = salary.max;
  const currency = salary.currency ?? '';
  const period = (typeof salary.period === 'string' && salary.period !== '') ? ` / ${salary.period}` : '';
  if (min !== null && max !== null) return `${min}–${max} ${currency}${period}`.trim();
  if (min !== null) return `from ${min} ${currency}${period}`.trim();
  if (max !== null) return `up to ${max} ${currency}${period}`.trim();
  return '—';
};
