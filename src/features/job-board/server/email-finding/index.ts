import 'server-only';

import type { CompanyEmail, JobScanStep } from '@/shared/contracts/job-board';

import { findCompanyEmails as findCompanyEmailsDeterministic } from '../email-finder';
import {
  findCompanyEmailsWithVisionLoop,
  isVisionEmailFinderEnabled,
} from '../vision-email-finder';

export { isVisionEmailFinderEnabled };

export type EmailFinderStrategy = 'deterministic' | 'vision';

export type EmailFinderInput = {
  website: string | null | undefined;
  domain: string | null | undefined;
  companyName?: string | null;
  headless?: boolean | null;
  strategy?: EmailFinderStrategy;
};

export type UnifiedEmailFinderResult = {
  durationMs: number;
  emails: CompanyEmail[];
  error?: string;
  iterationsRun: number;
  reasoning: string | null;
  steps: JobScanStep[];
  strategy: EmailFinderStrategy;
  visitedUrls: string[];
};

const resolveStrategy = (override?: EmailFinderStrategy): EmailFinderStrategy =>
  override ?? (isVisionEmailFinderEnabled() ? 'vision' : 'deterministic');

const runVision = async (input: EmailFinderInput): Promise<UnifiedEmailFinderResult> => {
  const r = await findCompanyEmailsWithVisionLoop({
    website: input.website ?? null,
    domain: input.domain ?? null,
    companyName: input.companyName ?? '',
    headless: input.headless ?? null,
  });
  return {
    durationMs: r.durationMs,
    emails: r.emails,
    ...(r.error !== undefined ? { error: r.error } : {}),
    iterationsRun: r.iterationsRun,
    reasoning: r.reasoning,
    steps: r.steps,
    strategy: 'vision',
    visitedUrls: (r.finalUrl !== undefined && r.finalUrl !== '') ? [r.finalUrl] : [],
  };
};

const runDeterministic = async (input: EmailFinderInput): Promise<UnifiedEmailFinderResult> => {
  const r = await findCompanyEmailsDeterministic({
    website: input.website ?? null,
    domain: input.domain ?? null,
    companyName: input.companyName ?? null,
    headless: input.headless ?? null,
  });
  return {
    durationMs: r.durationMs,
    emails: r.emails,
    ...(r.error !== undefined ? { error: r.error } : {}),
    iterationsRun: 0,
    reasoning: null,
    steps: r.steps,
    strategy: 'deterministic',
    visitedUrls: r.visitedUrls,
  };
};

export const findCompanyEmails = async (
  input: EmailFinderInput
): Promise<UnifiedEmailFinderResult> => {
  const strategy = resolveStrategy(input.strategy);
  return strategy === 'vision' ? await runVision(input) : await runDeterministic(input);
};
