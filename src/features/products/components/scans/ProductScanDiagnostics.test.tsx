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
            rawResult: {
              runId: 'run-123',
              runStatus: 'failed',
              latestStage: 'google_upload',
              latestStageUrl: 'https://lens.google.com/search',
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
