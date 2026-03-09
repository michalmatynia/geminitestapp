import { describe, expect, it } from 'vitest';

import { buildStabilizationGateSummaryJson } from './lib/stabilization-gate-runner.mjs';

describe('canonical stabilization aggregate summary', () => {
  it('builds the shared scan envelope from gate results', () => {
    const payload = buildStabilizationGateSummaryJson({
      ok: true,
      generatedAt: '2026-03-09T08:47:21.586Z',
      canonical: {
        status: 'pass',
        runtimeFileCount: 4478,
        docsArtifactCount: 4,
        generatedAt: '2026-03-09T08:46:59.000Z',
        ok: true,
      },
      ai: {
        status: 'pass',
        sourceFileCount: 5232,
        generatedAt: '2026-03-09T08:47:10.000Z',
        ok: true,
      },
      observability: {
        status: 'pass',
        legacyCompatibilityViolations: 0,
        runtimeErrors: 0,
        generatedAt: '2026-03-09T08:47:21.586Z',
        ok: true,
      },
    });

    expect(payload).toMatchObject({
      scanner: {
        name: 'canonical-stabilization-check',
        version: '1.0.0',
      },
      status: 'ok',
      summary: {
        canonicalStatus: 'pass',
        canonicalRuntimeFileCount: 4478,
        canonicalDocsArtifactCount: 4,
        aiStatus: 'pass',
        aiSourceFileCount: 5232,
        observabilityStatus: 'pass',
        observabilityLegacyCompatibilityViolations: 0,
        observabilityRuntimeErrors: 0,
      },
      details: {
        canonical: {
          status: 'pass',
        },
        ai: {
          status: 'pass',
        },
        observability: {
          status: 'pass',
        },
      },
      paths: null,
      filters: {
        structured: true,
      },
      notes: ['canonical stabilization aggregate check result'],
    });
  });
});
