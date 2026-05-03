import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IconSelector } from '@/shared/lib/icons/components/IconSelector';

const genericGridPickerMock = vi.hoisted(() => vi.fn());
const tooltipMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/ui/primitives.public', () => ({
  Tooltip: tooltipMock,
}));
vi.mock('@/shared/ui/templates/pickers', () => ({
  GenericGridPicker: genericGridPickerMock,
}));

const SunIcon = ({ className }: { className?: string }) => (
  <svg data-testid='icon-sun' className={className} />
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg data-testid='icon-moon' className={className} />
);

describe('IconSelector', () => {
  beforeEach(() => {
    genericGridPickerMock.mockReset();
    tooltipMock.mockReset();

    tooltipMock.mockImplementation(
      ({
        children,
        content,
        side,
      }: {
        children: React.ReactNode;
        content: string;
        side: string;
      }) => (
        <div data-testid={`tooltip-${content}`} data-side={side}>
          {children}
        </div>
      )
    );

    genericGridPickerMock.mockImplementation(
      ({
        className,
        columns,
        emptyState,
        items,
        onSelect,
        renderItem,
        searchable,
        searchPlaceholder,
        selectedId,
      }: {
        className?: string;
        columns: number;
        emptyState: React.ReactNode;
        items: Array<{ id: string }>;
        onSelect: (item: { id: string }) => void;
        renderItem: (item: { id: string }, selected: boolean) => React.ReactNode;
        searchable: boolean;
        searchPlaceholder?: string;
        selectedId?: string;
      }) => (
        <div
          data-testid='generic-grid-picker'
          data-class-name={className ?? ''}
          data-columns={String(columns)}
          data-search-placeholder={searchPlaceholder ?? ''}
          data-searchable={searchable ? 'true' : 'false'}
        >
          <div data-testid='empty-state'>{emptyState}</div>
          {items.map((item) => (
            <button
              key={item.id}
              data-testid={`grid-item-${item.id}`}
              type='button'
              onClick={() => onSelect(item)}
            >
              {renderItem(item, selectedId === item.id)}
            </button>
          ))}
        </div>
      )
    );
  });

  it('maps icon items into the picker and renders helper text and selected styles', () => {
    render(
      <IconSelector
        value='moon'
        onChange={vi.fn()}
        items={[
          { id: 'sun', label: 'Sun', icon: SunIcon },
          { id: 'moon', label: 'Moon', icon: MoonIcon },
        ]}
        columns={4}
        showSearch={false}
        searchPlaceholder='Find an icon'
        className='wrapper-x'
        gridClassName='grid-x'
        buttonClassName='button-x'
        iconClassName='icon-x'
        emptyLabel='Nothing here'
        helperText='Choose one icon'
      />
    );

    expect(screen.getByTestId('generic-grid-picker')).toHaveAttribute('data-columns', '4');
    expect(screen.getByTestId('generic-grid-picker')).toHaveAttribute('data-searchable', 'false');
    expect(screen.getByTestId('generic-grid-picker')).toHaveAttribute(
      'data-search-placeholder',
      'Find an icon'
    );
    expect(screen.getByTestId('generic-grid-picker')).toHaveAttribute('data-class-name', 'grid-x');
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Choose one icon')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-Sun')).toHaveAttribute('data-side', 'top');
    expect(screen.getByTestId('tooltip-Moon')).toHaveAttribute('data-side', 'top');

    expect(screen.getByTestId('icon-sun')).toHaveClass('h-5', 'w-5', 'icon-x');
    expect(screen.getByTestId('icon-moon')).toHaveClass('h-5', 'w-5', 'icon-x');
    expect(screen.getByTestId('icon-sun').parentElement).toHaveClass('border-border', 'button-x');
    expect(screen.getByTestId('icon-moon').parentElement).toHaveClass(
      'border-emerald-500',
      'button-x'
    );
  });

  it('selects a new icon and clears the current selection when allowClear is enabled', () => {
    const onChange = vi.fn();

    render(
      <IconSelector
        value='moon'
        onChange={onChange}
        allowClear
        items={[
          { id: 'sun', label: 'Sun', icon: SunIcon },
          { id: 'moon', label: 'Moon', icon: MoonIcon },
        ]}
      />
    );

    fireEvent.click(screen.getByTestId('grid-item-sun'));
    fireEvent.click(screen.getByTestId('grid-item-moon'));

    expect(onChange).toHaveBeenNthCalledWith(1, 'sun');
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });

  it('keeps the selected icon when allowClear is disabled', () => {
    const onChange = vi.fn();

    render(
      <IconSelector
        value='moon'
        onChange={onChange}
        allowClear={false}
        items={[
          { id: 'sun', label: 'Sun', icon: SunIcon },
          { id: 'moon', label: 'Moon', icon: MoonIcon },
        ]}
      />
    );

    fireEvent.click(screen.getByTestId('grid-item-moon'));

    expect(onChange).toHaveBeenCalledWith('moon');
  });
});
