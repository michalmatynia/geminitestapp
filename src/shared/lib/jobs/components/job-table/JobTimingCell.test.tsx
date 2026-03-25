import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JobTimingCell } from '@/shared/lib/jobs/components/job-table/JobTimingCell';

describe('JobTimingCell', () => {
  beforeEach(() => {
    vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (this: Date) {
      return `time:${this.toISOString()}`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an em dash when createdAt is missing and hides finishedAt when absent', () => {
    render(<JobTimingCell createdAt={null} />);

    expect(screen.getByText('Created: —')).toBeInTheDocument();
    expect(screen.queryByText(/Finished:/)).not.toBeInTheDocument();
  });

  it('formats created and finished timestamps when present', () => {
    render(
      <JobTimingCell
        createdAt='2026-03-25T10:00:00.000Z'
        finishedAt='2026-03-25T11:15:00.000Z'
      />
    );

    expect(screen.getByText('Created: time:2026-03-25T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('Finished: time:2026-03-25T11:15:00.000Z')).toBeInTheDocument();
  });
});
