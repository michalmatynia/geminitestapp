// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

const { useTriggerButtonsMock } = vi.hoisted(() => ({
  useTriggerButtonsMock: vi.fn(),
}));

vi.mock('../../hooks/useTriggerButtons', () => ({
  useTriggerButtons: (...args: unknown[]) => useTriggerButtonsMock(...args),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  ToggleRow: ({ label }: { label: string }) => <div>{label}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StatusBadge: ({ label, status }: { label?: string; status: string }) => (
    <span>{label ?? status}</span>
  ),
  ActionMenu: ({
    children,
    trigger,
    ariaLabel,
  }: {
    children: React.ReactNode;
    trigger?: React.ReactNode;
    ariaLabel?: string;
  }) => (
    <div>
      <button type='button' aria-label={ariaLabel ?? 'Open actions menu'}>
        {trigger ?? 'Menu'}
      </button>
      <div>{children}</div>
    </div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: (event: Event) => void;
  }) => (
    <button type='button' onClick={() => onSelect?.(new Event('select'))}>
      {children}
    </button>
  ),
  Dialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DialogTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div role='dialog'>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode; className?: string }) => <p>{children}</p>,
}));

import { TriggerButtonBar } from './TriggerButtonBar';

const BUTTON = {
  id: 'button-product-row',
  name: 'Trigger',
  iconId: null,
  locations: ['product_row'],
  mode: 'click',
  display: {
    label: 'Trigger',
  },
  pathId: 'path-product',
  enabled: true,
  sortIndex: 0,
  createdAt: '2026-03-06T00:00:00.000Z',
  updatedAt: '2026-03-06T00:00:00.000Z',
} satisfies AiTriggerButtonRecord;

describe('TriggerButtonBar', () => {
  beforeEach(() => {
    useTriggerButtonsMock.mockReset();
    useTriggerButtonsMock.mockReturnValue({
      buttons: [BUTTON],
      toggleMap: {},
      successMap: {},
      runStates: {},
      lastRuns: {},
      handleTrigger: vi.fn(),
      isLoading: false,
    });
  });

  it('renders product run feedback with a queue link and failure summary', () => {
    useTriggerButtonsMock.mockReturnValue({
      buttons: [BUTTON],
      toggleMap: {},
      successMap: {},
      runStates: {},
      lastRuns: {
        [BUTTON.id]: {
          runId: 'run-product-feedback-123456',
          status: 'failed',
          updatedAt: '2026-03-09T12:00:05.000Z',
          finishedAt: '2026-03-09T12:00:05.000Z',
          errorMessage: 'Database write affected 0 records for update.',
        },
      },
      handleTrigger: vi.fn(),
      isLoading: false,
    });

    render(<TriggerButtonBar location='product_row' entityType='product' entityId='product-1' />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByTitle('run-product-feedback-123456')).toBeInTheDocument();
    // Error text appears in both the trigger preview button and the expanded dialog content
    expect(screen.getAllByText('Database write affected 0 records for update.').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('link', { name: 'Job Queue' })).toHaveAttribute(
      'href',
      '/admin/ai-paths/queue?tab=paths-all&query=run-product-feedback-123456&runId=run-product-feedback-123456&status=all'
    );
  });

  it('does not render inline run feedback outside product row and modal locations', () => {
    useTriggerButtonsMock.mockReturnValue({
      buttons: [{ ...BUTTON, locations: ['note_list'] }],
      toggleMap: {},
      successMap: {},
      runStates: {},
      lastRuns: {
        [BUTTON.id]: {
          runId: 'run-note-feedback-1',
          status: 'completed',
          updatedAt: '2026-03-09T12:00:05.000Z',
          finishedAt: '2026-03-09T12:00:05.000Z',
          errorMessage: null,
        },
      },
      handleTrigger: vi.fn(),
      isLoading: false,
    });

    render(<TriggerButtonBar location='note_list' entityType='note' entityId='note-1' />);

    expect(screen.queryByRole('link', { name: 'Job Queue' })).not.toBeInTheDocument();
    expect(screen.queryByText('Completed')).not.toBeInTheDocument();
  });

  it('moves overflow product-row actions into a compact menu', () => {
    useTriggerButtonsMock.mockReturnValue({
      buttons: [
        BUTTON,
        {
          ...BUTTON,
          id: 'button-product-row-2',
          name: 'Second Trigger',
          sortIndex: 1,
        },
        {
          ...BUTTON,
          id: 'button-product-row-3',
          name: 'Third Trigger',
          sortIndex: 2,
        },
      ],
      toggleMap: {},
      successMap: {},
      runStates: {},
      lastRuns: {},
      handleTrigger: vi.fn(),
      isLoading: false,
    });

    render(<TriggerButtonBar location='product_row' entityType='product' entityId='product-1' />);

    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open 2 more AI actions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Second Trigger' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Third Trigger' })).toBeInTheDocument();
  });
});
