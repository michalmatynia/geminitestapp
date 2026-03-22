/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockSearchableListProps<T> = {
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  getId: (item: T) => string;
  renderItem?: (item: T) => React.ReactNode;
  searchPlaceholder?: string;
};

let latestSearchableListProps: MockSearchableListProps<{ id: string; slug: string }> | null = null;

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'page-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/features/cms/components/CmsDomainSelector', () => ({
  CmsDomainSelector: () => null,
}));

vi.mock('@/features/cms/components/CmsEditorLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/cms/hooks/useCmsDomainSelection', () => ({
  useCmsDomainSelection: () => ({
    activeDomainId: null,
  }),
}));

vi.mock('@/features/cms/hooks/useCmsQueries', () => ({
  useCmsAllSlugs: () => ({ data: [] }),
  useCmsPage: () => ({ isLoading: false, isError: false, data: null }),
  useCmsSlugs: () => ({ data: [] }),
  useUpdatePage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/shared/ui', () => ({
  AdminCmsBreadcrumbs: () => null,
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
  FormActions: () => null,
  FormSection: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  LoadingState: ({ message }: { message: string }) => <div>{message}</div>,
  SectionHeader: () => null,
  ToggleRow: () => null,
  StatusBadge: ({ status }: { status: string }) => <div>{status}</div>,
  SearchableList: (props: MockSearchableListProps<{ id: string; slug: string }>) => {
    latestSearchableListProps = props;

    return (
      <div data-testid='mock-searchable-list'>
        <div data-testid='selected-ids'>{props.selectedIds.join(',')}</div>
        <div>{props.searchPlaceholder}</div>
        {props.items.map((item) => (
          <div key={props.getId(item)} data-testid={`route-${props.getId(item)}`}>
            {props.renderItem?.(item)}
          </div>
        ))}
        <button type='button' onClick={() => props.onToggle(props.getId(props.items[0]))}>
          toggle-first-route
        </button>
      </div>
    );
  },
}));

import { EditPageRouteList } from './EditPagePage';

describe('EditPageRouteList', () => {
  beforeEach(() => {
    latestSearchableListProps = null;
  });

  it('passes route list props directly into SearchableList and preserves toggles', () => {
    const onToggleSlug = vi.fn();

    render(
      <EditPageRouteList
        visibleSlugs={[
          { id: 'slug-home', slug: 'home' } as never,
          { id: 'slug-about', slug: 'about' } as never,
        ]}
        selectedSlugIds={['slug-about']}
        domainSlugIds={new Set(['slug-home', 'slug-about'])}
        onToggleSlug={onToggleSlug}
      />
    );

    expect(screen.getByTestId('selected-ids')).toHaveTextContent('slug-about');
    expect(latestSearchableListProps?.searchPlaceholder).toBe('Filter routes...');

    fireEvent.click(screen.getByRole('button', { name: 'toggle-first-route' }));

    expect(onToggleSlug).toHaveBeenCalledWith('slug-home');
  });

  it('marks slugs outside the active domain as cross-zone assignments', () => {
    render(
      <EditPageRouteList
        visibleSlugs={[
          { id: 'slug-home', slug: 'home' } as never,
          { id: 'slug-external', slug: 'external' } as never,
        ]}
        selectedSlugIds={[]}
        domainSlugIds={new Set(['slug-home'])}
        onToggleSlug={vi.fn()}
      />
    );

    expect(screen.getByTestId('route-slug-home')).toHaveTextContent('/home');
    expect(screen.getByTestId('route-slug-external')).toHaveTextContent('/external');
    expect(screen.getAllByText('Cross-Zone')).toHaveLength(1);
  });
});
