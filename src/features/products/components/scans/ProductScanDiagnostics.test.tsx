/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  buildProductScanArtifactHref,
  ProductScanDiagnostics,
  resolveProductScanDiagnosticFailureSummary,
  resolveProductScanDiagnostics,
} from './ProductScanDiagnostics';

describe('ProductScanDiagnostics', () => {
  it('returns null when no scan diagnostics are available', () => {
    expect(resolveProductScanDiagnostics({ rawResult: null } as never)).toBeNull();
    expect(resolveProductScanDiagnostics({ rawResult: {} } as never)).toBeNull();
  });

  it('renders run metadata, artifacts, and log tail from rawResult', () => {
    render(
      <ProductScanDiagnostics
        scan={
          {
            id: 'scan-1',
            steps: [
              {
                key: 'amazon_ai_evaluate',
                label: 'Evaluate Amazon candidate match',
                group: 'amazon',
                attempt: 1,
                candidateId: 'image-1',
                candidateRank: 1,
                inputSource: null,
                retryOf: null,
                resultCode: 'candidate_rejected',
                status: 'failed',
                message: 'AI evaluator rejected the Amazon candidate.',
                warning: null,
                details: [
                  { label: 'Model source', value: 'AI Brain default' },
                  { label: 'Model', value: 'gpt-4.1-mini' },
                  { label: 'Threshold', value: '85%' },
                  { label: 'Evaluation scope', value: 'Every Amazon candidate' },
                  { label: 'Similarity decision', value: 'AI only' },
                  { label: 'Allowed content language', value: 'English' },
                  { label: 'Language policy', value: 'Reject non-English content' },
                  { label: 'Language detection', value: 'AI only' },
                ],
                url: 'https://www.amazon.com/dp/B00TEST123',
                startedAt: '2026-04-11T10:00:05.000Z',
                completedAt: '2026-04-11T10:00:08.000Z',
                durationMs: 3000,
              },
            ],
            rawResult: {
              runId: 'run-123',
              runStatus: 'failed',
              imageSearchProvider: 'google_images_url',
              latestStage: 'google_upload',
              latestStageUrl: 'https://lens.google.com/search',
              amazonAiEvidence: {
                stages: [
                  {
                    stage: 'candidate_triage',
                    status: 'rejected',
                    model: 'gpt-4.1-mini',
                    threshold: 0.7,
                    candidateRankBefore: 2,
                    candidateRankAfter: null,
                    recommendedAction: 'fallback_provider',
                    rejectionCategory: 'wrong_product',
                    pageLanguage: 'de',
                    languageAccepted: false,
                    topReasons: ['Google results were dominated by wrong-language marketplace pages.'],
                    provider: 'google_images_url',
                    evaluatedAt: '2026-04-11T10:00:04.000Z',
                  },
                  {
                    stage: 'probe_evaluate',
                    status: 'rejected',
                    model: 'gpt-4.1',
                    threshold: 0.85,
                    candidateRankBefore: 1,
                    candidateRankAfter: null,
                    recommendedAction: 'try_next_candidate',
                    rejectionCategory: 'variant',
                    pageLanguage: 'en',
                    languageAccepted: true,
                    topReasons: ['Brand matched, but size and pack count did not match the source product.'],
                    provider: 'google_lens_upload',
                    evaluatedAt: '2026-04-11T10:00:09.000Z',
                  },
                ],
              },
              failureArtifacts: [
                {
                  name: 'Stage Screenshot',
                  path: '/tmp/amazon-scan-stage.png',
                  kind: 'screenshot',
                  mimeType: 'image/png',
                },
                {
                  name: 'runtime-posture',
                  path: '/tmp/runtime-posture.json',
                  kind: 'json',
                  mimeType: 'application/json',
                },
              ],
              runtimePosture: {
                browser: {
                  engine: 'chromium',
                  label: 'Chrome',
                  headless: false,
                },
                antiDetection: {
                  identityProfile: 'search',
                  locale: 'en-US',
                  timezoneId: 'America/New_York',
                  stickyStorageState: {
                    enabled: true,
                    loaded: true,
                  },
                  proxy: {
                    enabled: true,
                    providerPreset: 'brightdata',
                    sessionMode: 'sticky',
                    reason: 'applied',
                    serverHost: 'proxy.local:8080',
                  },
                },
              },
              logTail: ['first log line', '', 'second log line'],
            },
          } as never
        }
      />
    );

    expect(screen.getByText('Run run-123')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getAllByText('Google Images URL').length).toBeGreaterThan(0);
    expect(screen.getByText('Stage: Google Upload')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open URL' })).toHaveAttribute(
      'href',
      'https://lens.google.com/search'
    );
    expect(screen.getByRole('link', { name: 'View screenshot' })).toHaveAttribute(
      'href',
      '/api/v2/products/scans/scan-1/artifacts/amazon-scan-stage.png'
    );
    expect(screen.getByRole('link', { name: 'View runtime posture JSON' })).toHaveAttribute(
      'href',
      '/api/v2/products/scans/scan-1/artifacts/runtime-posture.json'
    );
    expect(screen.getByText('Stage Screenshot')).toBeInTheDocument();
    expect(screen.getByText('Runtime Posture')).toBeInTheDocument();
    expect(screen.getByText('Runtime posture')).toBeInTheDocument();
    expect(screen.getByText('Screenshot')).toBeInTheDocument();
    expect(screen.getByText('Json')).toBeInTheDocument();
    expect(screen.getByText('image/png')).toBeInTheDocument();
    expect(screen.getByText('/tmp/amazon-scan-stage.png')).toBeInTheDocument();
    expect(screen.getByText('Chrome · Headed')).toBeInTheDocument();
    expect(screen.getByText('Search profile · en-US · America/New_York')).toBeInTheDocument();
    expect(screen.getByText('Brightdata · Sticky · Applied · proxy.local:8080')).toBeInTheDocument();
    expect(screen.getByText('Loaded sticky state')).toBeInTheDocument();
    expect(screen.getByText('AI Evaluator Policy')).toBeInTheDocument();
    expect(screen.getByText('Amazon AI Chain')).toBeInTheDocument();
    expect(screen.getByText('Candidate triage')).toBeInTheDocument();
    expect(screen.getByText('Probe evaluator')).toBeInTheDocument();
    expect(screen.getByText('Fallback Provider')).toBeInTheDocument();
    expect(screen.getByText('Try Next Candidate')).toBeInTheDocument();
    expect(screen.getByText('Wrong Product')).toBeInTheDocument();
    expect(screen.getByText('Variant')).toBeInTheDocument();
    expect(screen.getByText('German')).toBeInTheDocument();
    expect(screen.getByText('Rank before #2')).toBeInTheDocument();
    expect(screen.getByText('Threshold 70%')).toBeInTheDocument();
    expect(
      screen.getByText('Google results were dominated by wrong-language marketplace pages.')
    ).toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
    expect(screen.getByText('Reviewed by AI')).toBeInTheDocument();
    expect(screen.getAllByText('AI Brain default').length).toBeGreaterThan(0);
    expect(screen.getAllByText('gpt-4.1-mini').length).toBeGreaterThan(0);
    expect(screen.getAllByText('85%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Every Amazon candidate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AI only').length).toBeGreaterThan(0);
    expect(screen.getByText('English only')).toBeInTheDocument();
    expect(screen.getByText(/first log line/)).toBeInTheDocument();
    expect(screen.getByText(/second log line/)).toBeInTheDocument();
  });

  it('builds an artifact href from the artifact file name', () => {
    expect(
      buildProductScanArtifactHref('scan-1', {
        name: 'Stage Screenshot',
        path: 'run-1/amazon-scan-stage.png',
        kind: 'screenshot',
        mimeType: 'image/png',
      })
    ).toBe('/api/v2/products/scans/scan-1/artifacts/amazon-scan-stage.png');
  });

  it('builds a compact failure summary from raw diagnostics', () => {
    expect(
      resolveProductScanDiagnosticFailureSummary({
        completedAt: '2026-04-11T04:00:05.000Z',
        rawResult: {
          runStatus: 'failed',
          latestStage: 'google_candidates',
          logTail: ['lens timeout', 'candidate collection failed'],
        },
      } as never)
    ).toMatchObject({
      phaseLabel: 'Google Lens',
      sourceLabel: 'Candidate collection',
      stepLabel: 'Google Candidates',
      message: 'candidate collection failed',
      resultCodeLabel: 'Failed',
      url: null,
    });
    expect(
      resolveProductScanDiagnosticFailureSummary({
        completedAt: '2026-04-11T04:00:05.000Z',
        rawResult: {
          runStatus: 'failed',
          latestStage: 'google_candidates',
          logTail: ['lens timeout', 'candidate collection failed'],
        },
      } as never)?.timingLabel
    ).toContain('Updated ');
  });
});
