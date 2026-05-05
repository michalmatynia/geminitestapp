import type { CompanyEmail, JobScanStep } from '@/shared/contracts/job-board';

export type EmailFinderResult = {
  emails: CompanyEmail[];
  visitedUrls: string[];
  durationMs: number;
  steps: JobScanStep[];
  error?: string;
};

export type ContactLinkHint = {
  hint: string;
  priority: number;
};
