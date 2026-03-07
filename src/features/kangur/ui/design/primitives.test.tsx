/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  KangurAccentDot,
  KangurActivityColumn,
  KangurDivider,
  KangurEmptyState,
  KangurIconBadge,
  KangurMediaFrame,
  KangurMetricCard,
  KangurMenuItem,
  KangurOptionCardButton,
  KangurProgressBar,
  KangurProse,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurSurfacePanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';

describe('Kangur shared primitives', () => {
  it('renders shared badge, summary, and empty-state styling tokens', () => {
    render(
      <>
        <KangurStatusChip accent='amber'>Warm badge</KangurStatusChip>
        <KangurAccentDot accent='rose' data-testid='kangur-dot' size='lg' />
        <KangurIconBadge accent='emerald' data-testid='kangur-icon-badge' size='sm'>
          4
        </KangurIconBadge>
        <KangurDivider accent='indigo' data-testid='kangur-divider' size='sm' />
        <KangurActivityColumn
          accent='indigo'
          active
          data-testid='kangur-activity-column'
          value={72}
        />
        <KangurSummaryPanel
          accent='indigo'
          data-testid='kangur-summary'
          description='Shared summary body'
          label='Sekcja'
          tone='accent'
          title='Shared title'
        />
        <KangurMetricCard
          accent='emerald'
          align='center'
          data-testid='kangur-metric'
          description='Shared metric body'
          label='Wynik'
          value='92%'
        />
        <KangurEmptyState
          accent='slate'
          data-testid='kangur-empty'
          description='Nothing here yet'
          title='Empty'
        />
        <KangurOptionCardButton
          accent='amber'
          data-testid='kangur-option'
          emphasis='accent'
        >
          Shared option
        </KangurOptionCardButton>
        <KangurOptionCardButton data-testid='kangur-option-muted' state='muted'>
          Muted option
        </KangurOptionCardButton>
        <KangurSurfacePanel accent='sky' data-testid='kangur-surface-panel' fillHeight>
          Shared surface
        </KangurSurfacePanel>
        <KangurMenuItem data-testid='kangur-menu-item'>Shared menu item</KangurMenuItem>
        <KangurMediaFrame accent='amber' data-testid='kangur-media-frame' mediaType='image'>
          <img alt='Example' src='/example.png' />
        </KangurMediaFrame>
        <KangurProse
          accent='indigo'
          data-testid='kangur-prose'
          dangerouslySetInnerHTML={{
            __html: '<p>Shared <a href=\"#\">content</a></p><blockquote>Quote</blockquote>',
          }}
        />
        <KangurTextField
          accent='indigo'
          data-testid='kangur-input'
          placeholder='Search'
          type='search'
        />
        <KangurSelectField accent='indigo' data-testid='kangur-select' defaultValue='all'>
          <option value='all'>All</option>
        </KangurSelectField>
        <KangurProgressBar accent='rose' data-testid='kangur-progress' size='sm' value={65} />
      </>
    );

    expect(screen.getByText('Warm badge')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByTestId('kangur-dot')).toHaveClass('h-4', 'w-4', 'bg-rose-500');
    expect(screen.getByTestId('kangur-icon-badge')).toHaveClass(
      'h-9',
      'w-9',
      'bg-emerald-100',
      'text-emerald-700'
    );
    expect(screen.getByTestId('kangur-divider')).toHaveClass('h-px', 'w-12', 'bg-indigo-200');
    expect(screen.getByTestId('kangur-activity-column')).toHaveClass(
      'bg-gradient-to-t',
      'from-indigo-500',
      'to-purple-400'
    );
    expect(screen.getByTestId('kangur-activity-column')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('kangur-activity-column')).toHaveStyle({ height: '72%' });
    expect(screen.getByTestId('kangur-summary')).toHaveClass('soft-card', 'border-indigo-300');
    expect(screen.getByText('Sekcja')).toHaveClass('border-indigo-200', 'bg-indigo-100');
    expect(screen.getByTestId('kangur-metric')).toHaveClass('soft-card', 'border-emerald-300');
    expect(screen.getByText('92%')).toHaveClass('text-emerald-700');
    expect(screen.getByTestId('kangur-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
    expect(screen.getByTestId('kangur-option')).toHaveClass('soft-card', 'border-amber-300');
    expect(screen.getByTestId('kangur-option-muted')).toHaveClass(
      'soft-card',
      'border-slate-200/80',
      'text-slate-400',
      'opacity-70'
    );
    expect(screen.getByTestId('kangur-surface-panel')).toHaveClass(
      'glass-panel',
      'border-sky-200/80',
      'bg-white/95',
      'flex'
    );
    expect(screen.getByTestId('kangur-menu-item')).toHaveClass(
      'rounded-2xl',
      'text-sm',
      'data-[highlighted]:bg-slate-100'
    );
    expect(screen.getByTestId('kangur-media-frame')).toHaveClass(
      'soft-card',
      'border-amber-100',
      'from-amber-50'
    );
    expect(screen.getByTestId('kangur-prose')).toHaveClass(
      '[&_a]:text-indigo-600',
      '[&_blockquote]:border-indigo-200'
    );
    expect(screen.getByTestId('kangur-input')).toHaveClass(
      'soft-card',
      'border-slate-200/80',
      'focus:border-indigo-300'
    );
    expect(screen.getByTestId('kangur-select')).toHaveClass(
      'soft-card',
      'border-slate-200/80',
      'focus:border-indigo-300'
    );
    expect(screen.getByTestId('kangur-progress')).toHaveClass('bg-slate-100/95', 'h-2');
    expect(screen.getByTestId('kangur-progress')).toHaveAttribute('aria-valuenow', '65');
    expect(screen.getByTestId('kangur-progress').firstElementChild).toHaveClass(
      'bg-gradient-to-r',
      'from-red-400',
      'to-pink-400'
    );
  });
});
