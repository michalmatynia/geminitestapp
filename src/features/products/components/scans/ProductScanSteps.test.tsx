import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ProductScanSteps,
  resolveProductScanActiveStepSummary,
  resolveProductScanLatestOutcomeSummary,
} from './ProductScanSteps';

describe('ProductScanSteps', () => {
  it('renders grouped timeline sections with attempt and detail metadata', () => {
    render(
      <ProductScanSteps
        steps={[
          {
            key: 'prepare_scan',
            label: 'Prepare Amazon scan',
            group: 'input',
            attempt: 1,
            candidateId: null,
            candidateRank: null,
            inputSource: null,
            retryOf: null,
            resultCode: 'prepared',
            status: 'completed',
            message: 'Prepared 3 image candidates for Amazon reverse image scan.',
            warning: null,
            details: [{ label: 'Image candidates', value: '3' }],
            url: null,
            startedAt: '2026-04-11T10:00:00.000Z',
            completedAt: '2026-04-11T10:00:01.000Z',
            durationMs: 1000,
          },
          {
            key: 'google_upload',
            label: 'Upload image to Google Lens',
            group: 'google_lens',
            attempt: 2,
            candidateId: 'image-2',
            candidateRank: null,
            inputSource: 'url',
            retryOf: 'Local file upload',
            resultCode: 'url_submitted',
            status: 'completed',
            message: 'Submitted image URL for image-2.',
            warning: 'URL upload succeeded after a file fallback was skipped.',
            details: [{ label: 'Source', value: 'Image URL' }],
            url: 'https://lens.google.com/uploadbyurl?url=https://cdn.example.com/image-2.jpg',
            startedAt: '2026-04-11T10:00:05.000Z',
            completedAt: '2026-04-11T10:00:07.000Z',
            durationMs: 2000,
          },
          {
            key: 'amazon_extract',
            label: 'Extract Amazon details',
            group: 'amazon',
            attempt: 1,
            candidateId: 'image-2',
            candidateRank: 1,
            inputSource: null,
            retryOf: null,
            resultCode: 'match_found',
            status: 'completed',
            message: 'Extracted Amazon ASIN B00TEST123.',
            warning: null,
            details: [
              { label: 'ASIN', value: 'B00TEST123' },
              { label: 'Title', value: 'Amazon product title' },
            ],
            url: 'https://www.amazon.com/dp/B00TEST123',
            startedAt: '2026-04-11T10:00:08.000Z',
            completedAt: '2026-04-11T10:00:11.000Z',
            durationMs: 3000,
          },
        ]}
      />
    );

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Google Lens')).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('3 steps')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
    expect(screen.getByText('1 retry')).toBeInTheDocument();
    expect(screen.getByText('1 Amazon candidate')).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
    expect(screen.getByText('URL input')).toBeInTheDocument();
    expect(screen.getByText('Prepared')).toBeInTheDocument();
    expect(screen.getByText('Url Submitted')).toBeInTheDocument();
    expect(screen.getByText('Match Found')).toBeInTheDocument();
    expect(screen.getByText('Candidate #1')).toBeInTheDocument();
    expect(screen.getByText('Retry of: Local file upload')).toBeInTheDocument();
    expect(screen.getAllByText('Candidate: image-2')).toHaveLength(2);
    expect(screen.getByText('Image candidates')).toBeInTheDocument();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByText('URL upload succeeded after a file fallback was skipped.')).toBeInTheDocument();
    expect(screen.getAllByText('Open Step URL')).toHaveLength(2);
  });

  it('resolves the active step summary from running steps', () => {
    const summary = resolveProductScanActiveStepSummary([
      {
        key: 'prepare_scan',
        label: 'Prepare Amazon scan',
        group: 'input',
        attempt: 1,
        candidateId: null,
        candidateRank: null,
        inputSource: null,
        retryOf: null,
        resultCode: 'prepared',
        status: 'completed',
        message: 'Prepared image candidates.',
        warning: null,
        details: [],
        url: null,
        startedAt: '2026-04-11T10:00:00.000Z',
        completedAt: '2026-04-11T10:00:01.000Z',
        durationMs: 1000,
      },
      {
        key: 'google_candidates',
        label: 'Collect Amazon candidates from Google results',
        group: 'google_lens',
        attempt: 2,
        candidateId: 'image-2',
        candidateRank: null,
        inputSource: 'url',
        retryOf: null,
        resultCode: 'collecting',
        status: 'running',
        message: 'Waiting for reverse image results.',
        warning: null,
        details: [],
        url: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: null,
        durationMs: null,
      },
    ]);

    expect(summary).toEqual({
      phaseLabel: 'Google Lens',
      stepLabel: 'Collect Amazon candidates from Google results',
      message: 'Waiting for reverse image results.',
      attempt: 2,
      inputSource: 'url',
    });
  });

  it('resolves the latest failed step summary with formatted result code', () => {
    const summary = resolveProductScanLatestOutcomeSummary([
      {
        key: 'google_candidates',
        label: 'Collect Amazon candidates from Google results',
        group: 'google_lens',
        attempt: 2,
        candidateId: 'image-2',
        candidateRank: null,
        inputSource: 'url',
        retryOf: null,
        resultCode: 'candidate_collect_timeout',
        status: 'failed',
        message: 'Timed out while waiting for reverse image results.',
        warning: null,
        details: [],
        url: 'https://www.google.com/searchbyimage?image_url=https://cdn.example.com/image-2.jpg',
        startedAt: '2026-04-11T10:00:05.000Z',
        completedAt: '2026-04-11T10:00:13.000Z',
        durationMs: 8000,
      },
    ]);

    expect(summary).toEqual({
      kind: 'failed',
      phaseLabel: 'Google Lens',
      stepLabel: 'Collect Amazon candidates from Google results',
      message: 'Timed out while waiting for reverse image results.',
      resultCodeLabel: 'Candidate Collect Timeout',
      attempt: 2,
      inputSource: 'url',
    });
  });
});
