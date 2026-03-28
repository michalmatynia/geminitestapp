// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}));

type ListPanelMockProps = {
  eyebrow?: React.ReactNode;
  header?: React.ReactNode;
  title?: React.ReactNode;
  headerActions?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

function MockListPanel(props: ListPanelMockProps): React.JSX.Element {
  const { eyebrow, header, title, headerActions, filters, actions, children } = props;
  return (
    <div data-testid='list-panel'>
      {eyebrow}
      {header}
      <div>{title}</div>
      {headerActions}
      {filters}
      {actions}
      {children}
    </div>
  );
}

vi.mock('next/navigation', () => ({
  useSearchParams: mocks.useSearchParamsMock,
}));

vi.mock('@/shared/ui', () => ({
  AdminAiPathsBreadcrumbs: () => <div>ai-paths-breadcrumbs</div>,
  Badge: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
  ListPanel: MockListPanel,
  Breadcrumbs: () => <div>breadcrumbs</div>,
  Hint: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('../components/job-queue-panel', () => ({
  JobQueuePanel: (props: Record<string, unknown>) => (
    <div
      data-testid='job-queue-panel'
      data-source-filter={String(props['sourceFilter'] ?? '')}
      data-source-mode={String(props['sourceMode'] ?? '')}
      data-visibility={String(props['visibility'] ?? '')}
      data-query={String(props['initialSearchQuery'] ?? '')}
      data-run-id={String(props['initialExpandedRunId'] ?? '')}
    />
  ),
}));

vi.mock('@/features/files/public', () => ({
  FileUploadEventsPanel: () => <div data-testid='file-upload-events'>file uploads</div>,
}));

vi.mock('@/shared/lib/jobs/components/ProductListingJobsPanel', () => ({
  default: () => <div data-testid='product-listing-jobs'>product jobs</div>,
}));

vi.mock('../components/ImageStudioRunsQueuePanel', () => ({
  ImageStudioRunsQueuePanel: () => <div data-testid='image-studio-runs'>image studio</div>,
}));

import { AdminAiPathsQueuePage } from './AdminAiPathsQueuePage';

describe('AdminAiPathsQueuePage', () => {
  beforeEach(() => {
    mocks.useSearchParamsMock.mockReset();
  });

  it('passes the query search param into the default all-runs queue panel', () => {
    mocks.useSearchParamsMock.mockReturnValue(
      new URLSearchParams('tab=paths-all&query=run-123&runId=run-123')
    );

    render(<AdminAiPathsQueuePage />);

    expect(screen.getByTestId('job-queue-panel')).toHaveAttribute('data-query', 'run-123');
    expect(screen.getByTestId('job-queue-panel')).toHaveAttribute('data-run-id', 'run-123');
    expect(screen.getByTestId('job-queue-panel')).toHaveAttribute('data-visibility', 'global');
  });

  it('passes the query search param into the external-runs queue panel', () => {
    mocks.useSearchParamsMock.mockReturnValue(
      new URLSearchParams('tab=paths-external&query=run-external-456')
    );

    render(<AdminAiPathsQueuePage />);

    expect(screen.getByTestId('job-queue-panel')).toHaveAttribute(
      'data-query',
      'run-external-456'
    );
    expect(screen.getByTestId('job-queue-panel')).toHaveAttribute('data-run-id', '');
    expect(screen.getByTestId('job-queue-panel')).toHaveAttribute(
      'data-source-filter',
      'ai_paths_ui'
    );
    expect(screen.getByTestId('job-queue-panel')).toHaveAttribute('data-source-mode', 'exclude');
  });

  it('moves breadcrumbs under the page heading in the list header', () => {
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=paths-all'));
    const { container } = render(<AdminAiPathsQueuePage />);

    const listPanel = screen.getByTestId('list-panel');
    const heading = screen.getByRole('heading', { level: 1, name: 'Job Queue' });
    const breadcrumbs = screen.getByText('ai-paths-breadcrumbs');

    expect(listPanel).toContainElement(heading);
    expect(listPanel).toContainElement(breadcrumbs);

    const nodes = Array.from(container.querySelectorAll('*'));
    const headingIndex = nodes.indexOf(heading);
    const breadcrumbsIndex = nodes.indexOf(breadcrumbs);
    expect(headingIndex).toBeLessThan(breadcrumbsIndex);
  });
});
