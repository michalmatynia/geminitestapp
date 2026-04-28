// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/admin-job-board-page-layout', () => ({
  AdminJobBoardPageLayout: ({
    children,
    description,
    title,
  }: {
    children?: React.ReactNode;
    description?: string;
    title: string;
  }) => (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </main>
  ),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    ariaLabel,
    onValueChange,
    options,
    value,
  }: {
    ariaLabel?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ label: string; value: string }>;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? 'select'}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('./JobScanDetailDialog', () => ({
  JobScanDetailDialog: () => null,
}));

import { AdminJobBoardPage } from './AdminJobBoardPage';

const createScan = (sourceUrl: string, provider = 'nofluffjobs') => ({
  id: 'scan-1',
  provider,
  status: 'queued',
  sourceUrl,
  engineRunId: null,
  evaluation: null,
  companyId: null,
  jobListingId: null,
  steps: [],
  rawResult: null,
  error: null,
  createdBy: 'test-user',
  completedAt: null,
  createdAt: '2026-04-28T00:00:00.000Z',
  updatedAt: '2026-04-28T00:00:00.000Z',
});

describe('AdminJobBoardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits selected generic job-board providers with scan URLs', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { provider?: string; sourceUrl: string };
        return Response.json({ scan: createScan(body.sourceUrl, body.provider) }, { status: 202 });
      }
      if (url === '/api/v2/jobs/scans') return Response.json({ scans: [] });
      if (url === '/api/v2/jobs/companies') return Response.json({ companies: [] });
      if (url === '/api/v2/jobs/listings') return Response.json({ listings: [] });
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<AdminJobBoardPage />);

    expect(
      screen.getByText(/pracuj\.pl, Just Join IT, or No Fluff Jobs/)
    ).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v2/jobs/scans', { cache: 'no-store' }));

    await user.type(
      screen.getByPlaceholderText(/pracuj\.pl/),
      'https://nofluffjobs.com/pl/job/backend-dev-acme'
    );
    await user.selectOptions(screen.getByRole('combobox', { name: 'Job board provider' }), 'nofluffjobs');
    await user.click(screen.getByRole('button', { name: 'Scrape & save' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v2/jobs/scans',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            sourceUrl: 'https://nofluffjobs.com/pl/job/backend-dev-acme',
            provider: 'nofluffjobs',
          }),
        })
      );
    });
  });
});
