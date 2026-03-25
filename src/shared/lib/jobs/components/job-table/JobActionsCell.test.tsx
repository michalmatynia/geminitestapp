import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JobTableActionsRuntimeProvider } from '@/shared/lib/jobs/components/context/JobTableRuntimeContext';
import { JobActionsCell } from '@/shared/lib/jobs/components/job-table/JobActionsCell';

const buttonMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui', () => ({
  Button: buttonMock,
}));

describe('JobActionsCell', () => {
  beforeEach(() => {
    buttonMock.mockReset();
    buttonMock.mockImplementation(
      ({
        'aria-label': ariaLabel,
        children,
        loading,
        onClick,
        title,
      }: {
        'aria-label': string;
        children: React.ReactNode;
        loading?: boolean;
        onClick: () => void;
        title: string;
      }) => (
        <button
          data-loading={loading ? 'true' : 'false'}
          onClick={onClick}
          title={title}
          type='button'
        >
          {ariaLabel}
          {children}
        </button>
      )
    );
  });

  it('renders view, cancel, and delete actions and wires callbacks', () => {
    const onViewDetails = vi.fn();
    const onCancel = vi.fn();
    const onDelete = vi.fn();

    render(
      <JobTableActionsRuntimeProvider
        value={{
          onViewDetails,
          onCancel,
          onDelete,
          isCancelling: (id) => id === 'job-1',
          isDeleting: (id) => id === 'job-1',
        }}
      >
        <JobActionsCell jobId='job-1' status='pending' />
      </JobTableActionsRuntimeProvider>
    );

    const viewButton = screen.getByRole('button', { name: /view details/i });
    const cancelButton = screen.getByRole('button', { name: /cancel job/i });
    const deleteButton = screen.getByRole('button', { name: /delete job/i });

    expect(viewButton).toHaveAttribute('data-loading', 'false');
    expect(cancelButton).toHaveAttribute('data-loading', 'true');
    expect(deleteButton).toHaveAttribute('data-loading', 'true');

    fireEvent.click(viewButton);
    fireEvent.click(cancelButton);
    fireEvent.click(deleteButton);

    expect(onViewDetails).toHaveBeenCalledWith('job-1');
    expect(onCancel).toHaveBeenCalledWith('job-1');
    expect(onDelete).toHaveBeenCalledWith('job-1');
  });

  it('omits cancel and delete actions when they are not applicable', () => {
    render(
      <JobTableActionsRuntimeProvider
        value={{
          onViewDetails: vi.fn(),
          onCancel: vi.fn(),
          isCancelling: () => false,
        }}
      >
        <JobActionsCell jobId='job-2' status='completed' />
      </JobTableActionsRuntimeProvider>
    );

    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cancel job/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete job/i })).not.toBeInTheDocument();
  });
});
