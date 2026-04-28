import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  evaluateJobPageWithAiMock: vi.fn(),
  fetchJobBoardPageMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('./companies-repository', () => ({
  getCompanyById: vi.fn(),
  upsertCompany: vi.fn(),
  upsertCompanyByMatch: vi.fn(),
}));

vi.mock('./email-finding', () => ({
  findCompanyEmails: vi.fn(),
  isVisionEmailFinderEnabled: vi.fn(() => false),
}));

vi.mock('./google-search', () => ({
  findCompanyWebsite: vi.fn(),
}));

vi.mock('./job-listings-repository', () => ({
  upsertJobListing: vi.fn(),
}));

vi.mock('./job-scans-repository', () => ({
  getJobScanById: vi.fn(),
  listJobScans: vi.fn(),
  upsertJobScan: vi.fn(),
}));

vi.mock('./organisation-promotion', () => ({
  findFilemakerOrganisationMatch: vi.fn(),
  promoteCompanyToOrganisation: vi.fn(),
}));

vi.mock('./job-scan-ai-evaluator', () => ({
  evaluateJobPageWithAi: (...args: unknown[]) => mocks.evaluateJobPageWithAiMock(...args),
}));

vi.mock('./providers/job-board-sync', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./providers/job-board-sync')>()),
  fetchJobBoardPage: (...args: unknown[]) => mocks.fetchJobBoardPageMock(...args),
}));

import { findCompanyEmails, isVisionEmailFinderEnabled } from './email-finding';
import { upsertCompany, upsertCompanyByMatch } from './companies-repository';
import { upsertJobListing } from './job-listings-repository';
import { upsertJobScan } from './job-scans-repository';
import { createJobScan, probeJobBoardOffer, synchronizeJobScan } from './job-scans-service';

const offerUrl = 'https://www.pracuj.pl/praca/frontend-developer-warszawa,oferta,10012345';
const companyUrl = 'https://www.pracuj.pl/pracodawcy/acme,123';

const snapshotHtml = (snapshot: Record<string, unknown>): string =>
  [
    '<!doctype html><html><head>',
    `<script id="__CODEX_JOB_BOARD_SNAPSHOT__" type="application/job-board+json">${JSON.stringify(snapshot)}</script>`,
    '</head><body><main>Frontend Developer Acme</main></body></html>',
  ].join('');

describe('probeJobBoardOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchJobBoardPageMock.mockResolvedValue({
      error: undefined,
      finalUrl: offerUrl,
      html: snapshotHtml({
        companyLinks: [companyUrl],
        companyProfile: {
          plainText: 'Acme builds commerce software for enterprise teams.',
          sections: [{ heading: 'O firmie', text: 'Acme builds commerce software.' }],
          title: 'Acme - profil pracodawcy',
          url: companyUrl,
          websiteUrls: ['https://acme.example'],
        },
        facts: [{ label: 'Miejsce pracy', value: 'Warszawa' }],
        headings: ['Frontend Developer'],
        provider: 'pracuj_pl',
        sections: [{ heading: 'Opis stanowiska', text: 'Build interfaces for merchants.' }],
        title: 'Frontend Developer - oferta pracy',
        url: offerUrl,
      }),
      ok: true,
      provider: 'pracuj_pl',
      runId: 'run-1',
      sourceSite: 'pracuj.pl',
      status: 200,
    });
  });

  it('uses the Playwright snapshot as a fallback when AI extraction is incomplete', async () => {
    mocks.evaluateJobPageWithAiMock.mockResolvedValue({
      company: null,
      confidence: null,
      error: 'AI did not extract a job listing',
      evaluatedAt: '2026-04-28T10:00:00.000Z',
      listing: null,
      modelId: 'model-1',
    });

    const result = await probeJobBoardOffer({
      forcePlaywright: true,
      provider: 'pracuj_pl',
      sourceUrl: offerUrl,
    });

    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.evaluation).toMatchObject({
      company: {
        description: 'Acme builds commerce software.',
        domain: 'acme.example',
        name: 'Acme',
        profileUrl: companyUrl,
        website: 'https://acme.example',
      },
      listing: {
        city: 'Warszawa',
        description: 'Build interfaces for merchants.',
        title: 'Frontend Developer',
      },
    });
  });

  it('uses the deterministic offer probe path without AI evaluation', async () => {
    const result = await probeJobBoardOffer({
      extractionPath: 'deterministic',
      provider: 'pracuj_pl',
      sourceUrl: offerUrl,
    });

    expect(mocks.fetchJobBoardPageMock).toHaveBeenCalledWith(
      offerUrl,
      expect.objectContaining({
        fallbackToFetch: true,
        forcePlaywright: false,
        provider: 'pracuj_pl',
      })
    );
    expect(mocks.evaluateJobPageWithAiMock).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'deterministic_extract',
          label: 'Deterministic extract',
          status: 'completed',
        }),
      ])
    );
    expect(result.evaluation).toMatchObject({
      company: {
        name: 'Acme',
      },
      listing: {
        title: 'Frontend Developer',
      },
      modelId: 'job-board-snapshot-fallback',
    });
  });

  it('falls back to Playwright AI when the combined probe path fails deterministically', async () => {
    mocks.fetchJobBoardPageMock.mockResolvedValueOnce({
      error: 'HTTP 403',
      finalUrl: offerUrl,
      html: '',
      ok: false,
      provider: 'pracuj_pl',
      runId: null,
      sourceSite: 'pracuj.pl',
      status: 403,
    });
    mocks.evaluateJobPageWithAiMock.mockResolvedValue({
      company: { name: 'Acme' },
      confidence: 0.93,
      error: null,
      evaluatedAt: '2026-04-28T10:00:00.000Z',
      listing: { title: 'Frontend Developer' },
      modelId: 'model-1',
    });

    const result = await probeJobBoardOffer({
      extractionPath: 'deterministic_then_playwright',
      provider: 'pracuj_pl',
      sourceUrl: offerUrl,
    });

    expect(mocks.fetchJobBoardPageMock).toHaveBeenCalledTimes(2);
    expect(mocks.fetchJobBoardPageMock).toHaveBeenNthCalledWith(
      1,
      offerUrl,
      expect.objectContaining({
        fallbackToFetch: true,
        forcePlaywright: false,
        provider: 'pracuj_pl',
      })
    );
    expect(mocks.fetchJobBoardPageMock).toHaveBeenNthCalledWith(
      2,
      offerUrl,
      expect.objectContaining({
        fallbackToFetch: false,
        forcePlaywright: true,
        provider: 'pracuj_pl',
      })
    );
    expect(mocks.evaluateJobPageWithAiMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.error).toBeNull();
    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'fetch', status: 'failed' }),
        expect.objectContaining({ key: 'ai_evaluate', status: 'completed' }),
      ])
    );
  });
});

describe('job scan email route selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchJobBoardPageMock.mockResolvedValue({
      error: undefined,
      finalUrl: offerUrl,
      html: snapshotHtml({
        companyProfile: {
          plainText: 'Acme builds commerce software.',
          title: 'Acme - profil pracodawcy',
          url: companyUrl,
          websiteUrls: ['https://acme.example'],
        },
        sections: [{ heading: 'Opis stanowiska', text: 'Build interfaces for merchants.' }],
        title: 'Frontend Developer - oferta pracy',
        url: offerUrl,
      }),
      ok: true,
      provider: 'pracuj_pl',
      runId: 'run-1',
      sourceSite: 'pracuj.pl',
      status: 200,
    });
    mocks.evaluateJobPageWithAiMock.mockResolvedValue({
      company: {
        name: 'Acme',
        website: 'https://acme.example',
        domain: 'acme.example',
      },
      confidence: 0.95,
      error: null,
      evaluatedAt: '2026-04-28T10:00:00.000Z',
      listing: {
        title: 'Frontend Developer',
      },
      modelId: 'brain-job-board-model',
    });
    vi.mocked(upsertCompanyByMatch).mockResolvedValue({
      id: 'company-1',
      name: 'Acme',
      nip: null,
      domain: 'acme.example',
      website: 'https://acme.example',
      logoUrl: null,
      industry: null,
      size: null,
      description: null,
      addressLine: null,
      city: null,
      postalCode: null,
      country: null,
      emails: [],
      emailsSearchedAt: null,
    });
    vi.mocked(upsertJobListing).mockResolvedValue({
      id: 'listing-1',
      companyId: 'company-1',
      title: 'Frontend Developer',
      description: null,
      contractType: 'unknown',
      workMode: 'unknown',
      experienceLevel: 'unknown',
      city: null,
      region: null,
      country: null,
      salary: null,
      requirements: [],
      responsibilities: [],
      benefits: [],
      technologies: [],
      applyUrl: null,
      sourceUrl: offerUrl,
      postedAt: null,
      expiresAt: null,
    });
    vi.mocked(upsertCompany).mockImplementation(async (company) => ({
      id: company.id,
      name: company.name,
      nip: company.nip ?? null,
      domain: company.domain ?? null,
      website: company.website ?? null,
      logoUrl: company.logoUrl ?? null,
      industry: company.industry ?? null,
      size: company.size ?? null,
      description: company.description ?? null,
      addressLine: company.addressLine ?? null,
      city: company.city ?? null,
      postalCode: company.postalCode ?? null,
      country: company.country ?? null,
      emails: company.emails ?? [],
      emailsSearchedAt: company.emailsSearchedAt ?? null,
    }));
    vi.mocked(findCompanyEmails).mockResolvedValue({
      durationMs: 100,
      emails: [],
      iterationsRun: 0,
      reasoning: null,
      steps: [],
      strategy: 'deterministic',
      visitedUrls: ['https://acme.example'],
    });
    vi.mocked(upsertJobScan).mockImplementation(async (scan) => ({
      id: scan.id,
      provider: scan.provider ?? 'pracuj_pl',
      status: scan.status,
      sourceUrl: scan.sourceUrl,
      engineRunId: scan.engineRunId ?? null,
      evaluation: scan.evaluation ?? null,
      companyId: scan.companyId ?? null,
      jobListingId: scan.jobListingId ?? null,
      steps: scan.steps ?? [],
      rawResult: scan.rawResult ?? null,
      error: scan.error ?? null,
      createdBy: scan.createdBy ?? null,
      completedAt: scan.completedAt ?? null,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:00:00.000Z',
    }));
  });

  it('stores the selected AI vision email route on queued scans', async () => {
    await createJobScan({
      sourceUrl: offerUrl,
      provider: 'pracuj_pl',
      useVision: true,
      createdBy: 'test-user',
    });

    expect(upsertJobScan).toHaveBeenCalledWith(
      expect.objectContaining({
        rawResult: {
          emailFinderMode: 'vision_ai',
          useVisionEmailFinder: true,
        },
      })
    );
  });

  it('uses the preselected route crawler when the queued scan requested it', async () => {
    vi.mocked(isVisionEmailFinderEnabled).mockReturnValue(true);

    await synchronizeJobScan({
      id: 'scan-1',
      provider: 'pracuj_pl',
      status: 'queued',
      sourceUrl: offerUrl,
      engineRunId: null,
      evaluation: null,
      companyId: null,
      jobListingId: null,
      steps: [],
      rawResult: {
        emailFinderMode: 'preselected_routes',
        useVisionEmailFinder: false,
      },
      error: null,
      createdBy: 'test-user',
      completedAt: null,
      createdAt: '2026-04-28T00:00:00.000Z',
      updatedAt: '2026-04-28T00:00:00.000Z',
    });

    expect(findCompanyEmails).toHaveBeenCalledWith(
      expect.objectContaining({
        website: 'https://acme.example',
        domain: 'acme.example',
        strategy: 'deterministic',
      })
    );
  });
});
