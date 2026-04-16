/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Slug } from '@/shared/contracts/cms';

type MockFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  saveText?: string;
  isSaveDisabled?: boolean;
  isSaving?: boolean;
  children?: React.ReactNode;
};

type MockSearchableListProps<T> = {
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  getId: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;
  searchPlaceholder?: string;
  extraActions?: React.ReactNode;
};

const { latestFormModalProps, latestSearchableListProps, logClientErrorMock } = vi.hoisted(() => ({
  latestFormModalProps: { current: null as MockFormModalProps | null },
  latestSearchableListProps: { current: null as MockSearchableListProps<Slug> | null },
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormField: ({
    label,
    description,
    children,
  }: {
    label?: string;
    description?: string;
    children?: React.ReactNode;
  }) => (
    <div>
      {label ? <div>{label}</div> : null}
      {description ? <div>{description}</div> : null}
      {children}
    </div>
  ),
  FormModal: (props: MockFormModalProps) => {
    latestFormModalProps.current = props;

    return props.open ? (
      <div data-testid='attach-slug-form-modal'>
        <div>{props.title}</div>
        <div data-testid='attach-slug-save-text'>{props.saveText}</div>
        <div data-testid='attach-slug-save-disabled'>{String(props.isSaveDisabled)}</div>
        <div data-testid='attach-slug-is-saving'>{String(props.isSaving)}</div>
        <button type='button' onClick={props.onSave}>
          save-attach-slugs
        </button>
        <button type='button' onClick={props.onClose}>
          cancel-attach-slugs
        </button>
        {props.children}
      </div>
    ) : null;
  },
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  SearchableList: (props: MockSearchableListProps<Slug>) => {
    latestSearchableListProps.current = props;

    return (
      <div data-testid='attach-slug-searchable-list'>
        <div data-testid='attach-slug-selected-ids'>{props.selectedIds.join(',')}</div>
        <div>{props.searchPlaceholder}</div>
        {props.items.map((item) => (
          <div key={props.getId(item)} data-testid={`attach-slug-item-${props.getId(item)}`}>
            {props.renderItem?.(item)}
          </div>
        ))}
        {props.extraActions}
        {props.items[0] ? (
          <button type='button' onClick={() => props.onToggle(props.getId(props.items[0]))}>
            toggle-first-slug
          </button>
        ) : null}
      </div>
    );
  },
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
  UI_CENTER_ROW_SPACED_CLASSNAME: 'mock-row',
}));

import { AttachSlugModal } from '@/features/cms/components/slugs/AttachSlugModal';

const buildSlug = (overrides: Partial<Slug> = {}): Slug =>
  ({
    id: 'slug-home',
    slug: 'home',
    pageId: null,
    pageName: null,
    isCurrent: false,
    metadata: null,
    createdAt: '2026-03-22T00:00:00.000Z',
    updatedAt: '2026-03-22T00:00:00.000Z',
    ...overrides,
  }) as Slug;

describe('AttachSlugModal', () => {
  beforeEach(() => {
    latestFormModalProps.current = null;
    latestSearchableListProps.current = null;
    logClientErrorMock.mockReset();
  });

  it('passes filtered slugs directly into the modal and searchable list, then attaches the selection', async () => {
    const onAttach = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <AttachSlugModal
        isOpen
        onClose={onClose}
        onAttach={onAttach}
        alreadyAssignedIds={new Set(['slug-assigned'])}
        items={[
          buildSlug(),
          buildSlug({ id: 'slug-about', slug: 'about' }),
          buildSlug({ id: 'slug-assigned', slug: 'assigned' }),
        ]}
      />
    );

    expect(screen.getByTestId('attach-slug-form-modal')).toBeInTheDocument();
    expect(screen.getByText('Attach Existing Slug')).toBeInTheDocument();
    expect(screen.getByTestId('attach-slug-save-disabled')).toHaveTextContent('true');
    expect(latestSearchableListProps.current?.searchPlaceholder).toBe('Filter slugs...');
    expect(latestSearchableListProps.current?.items.map((item) => item.id)).toEqual([
      'slug-home',
      'slug-about',
    ]);
    expect(screen.getByTestId('attach-slug-item-slug-home')).toHaveTextContent('/home');
    expect(screen.getByTestId('attach-slug-item-slug-about')).toHaveTextContent('/about');
    expect(screen.queryByTestId('attach-slug-item-slug-assigned')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'toggle-first-slug' }));

    expect(screen.getByTestId('attach-slug-selected-ids')).toHaveTextContent('slug-home');
    expect(screen.getByTestId('attach-slug-save-text')).toHaveTextContent('Attach (1)');
    expect(screen.getByTestId('attach-slug-save-disabled')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'save-attach-slugs' }));

    await waitFor(() => expect(onAttach).toHaveBeenCalledWith(['slug-home']));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('renders the loading state without the searchable list', () => {
    render(
      <AttachSlugModal
        isOpen
        onClose={vi.fn()}
        onAttach={vi.fn()}
        alreadyAssignedIds={new Set()}
        items={[buildSlug()]}
        loading
      />
    );

    expect(screen.getByText('Fetching global slug index...')).toBeInTheDocument();
    expect(screen.queryByTestId('attach-slug-searchable-list')).not.toBeInTheDocument();
  });
});
