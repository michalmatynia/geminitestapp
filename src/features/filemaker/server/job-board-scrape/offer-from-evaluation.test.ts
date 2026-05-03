import { describe, expect, it, vi } from 'vitest';

import type { JobScanEvaluation } from '@/shared/contracts/job-board';

vi.mock('server-only', () => ({}));

import {
  filemakerJobBoardScrapeRequestSchema,
  type FilemakerJobBoardScrapeRequest,
} from '../../filemaker-job-board-scrape-contracts';
import { offerFromEvaluation } from './offer-from-evaluation';

const sourceUrl = 'https://www.pracuj.pl/praca/backend-developer-warszawa,oferta,1001';

const request = (): FilemakerJobBoardScrapeRequest =>
  filemakerJobBoardScrapeRequestSchema.parse({
    mode: 'preview',
    sourceUrl,
  });

const evaluation = (): JobScanEvaluation => ({
  company: null,
  confidence: 0.95,
  error: null,
  evaluatedAt: '2026-04-30T10:00:00.000Z',
  listing: {
    description: 'Build services.',
    title: 'Backend Developer',
  },
  modelId: 'model-1',
});

describe('offerFromEvaluation', () => {
  it.each(['Sii Sp. z o.o.About the Company', 'Sii Sp. z o.o.O firmie'])(
    'removes Pracuj company-details labels from employer name: %s',
    (employerName) => {
      const offer = offerFromEvaluation({
        evaluation: evaluation(),
        finalUrl: sourceUrl,
        options: request(),
        provider: 'pracuj_pl',
        snapshot: {
          employerName,
          headings: ['Backend Developer'],
          provider: 'pracuj_pl',
        },
        sourceSite: 'pracuj.pl',
      });

      expect(offer).toMatchObject({
        companyName: 'Sii Sp. z o.o.',
        companyNameSource: 'employer_selector',
        title: 'Backend Developer',
      });
    }
  );
});
