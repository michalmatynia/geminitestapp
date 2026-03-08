/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  KangurAccentDot,
  KangurActivityColumn,
  KangurButton,
  KangurDivider,
  KangurDisplayEmoji,
  KangurEmptyState,
  KangurEquationDisplay,
  KangurFeatureHeader,
  KangurGlassPanel,
  KangurGradientHeading,
  KangurGradientIconTile,
  KangurHeadline,
  KangurIconBadge,
  KangurInlineFallback,
  KangurMediaFrame,
  KangurMetricCard,
  KangurMenuItem,
  KangurOptionCardButton,
  KangurPageContainer,
  KangurProgressBar,
  KangurProse,
  KangurResultBadge,
  KangurSectionHeading,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurSurfacePanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';

describe('Kangur shared primitives', () => {
  it('renders shared badge, summary, and empty-state styling tokens', () => {
    render(
      <>
        <KangurStatusChip accent='amber'>Warm badge</KangurStatusChip>
        <KangurAccentDot accent='rose' data-testid='kangur-dot' size='lg' />
        <KangurIconBadge accent='emerald' data-testid='kangur-icon-badge' size='sm'>
          4
        </KangurIconBadge>
        <KangurIconBadge accent='amber' data-testid='kangur-icon-badge-3xl' size='3xl'>
          🦘
        </KangurIconBadge>
        <KangurGradientIconTile
          data-testid='kangur-gradient-icon-tile'
          gradientClass='from-indigo-400 to-fuchsia-500'
          size='lg'
        >
          📚
        </KangurGradientIconTile>
        <KangurDisplayEmoji data-testid='kangur-display-emoji' size='lg'>
          🏆
        </KangurDisplayEmoji>
        <KangurDisplayEmoji data-testid='kangur-display-emoji-xs' size='xs'>
          🧮
        </KangurDisplayEmoji>
        <KangurGradientHeading
          data-testid='kangur-gradient-heading'
          gradientClass='from-indigo-500 to-purple-600'
          size='lg'
        >
          Gradient title
        </KangurGradientHeading>
        <KangurHeadline accent='emerald' data-testid='kangur-headline'>
          Shared headline
        </KangurHeadline>
        <KangurHeadline accent='indigo' data-testid='kangur-headline-xs' size='xs'>
          Small shared headline
        </KangurHeadline>
        <KangurFeatureHeader
          accent='amber'
          data-testid='kangur-feature-header'
          icon='🎮'
          title='Gra z piłkami!'
        />
        <KangurSectionHeading
          align='left'
          accent='indigo'
          data-testid='kangur-section-heading'
          description='Shared section body'
          headingSize='md'
          icon='🧭'
          iconSize='lg'
          layout='inline'
          title='Shared section'
        />
        <KangurEquationDisplay accent='sky' data-testid='kangur-equation-display'>
          8 ÷ 2 = ?
        </KangurEquationDisplay>
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
        <KangurInlineFallback
          accent='amber'
          data-testid='kangur-inline-fallback'
          title='Missing shared content'
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
        <KangurButton data-testid='kangur-button-primary' variant='primary'>
          Primary CTA
        </KangurButton>
        <KangurButton data-testid='kangur-button-surface' variant='surface'>
          Surface CTA
        </KangurButton>
        <KangurSurfacePanel accent='sky' data-testid='kangur-surface-panel' fillHeight>
          Shared surface
        </KangurSurfacePanel>
        <KangurGlassPanel data-testid='kangur-glass-panel' surface='solid' variant='elevated'>
          Shared glass
        </KangurGlassPanel>
        <KangurGlassPanel data-testid='kangur-glass-panel-frost' surface='frost'>
          Frost glass
        </KangurGlassPanel>
        <KangurGlassPanel data-testid='kangur-glass-panel-mist-soft' surface='mistSoft'>
          Soft mist glass
        </KangurGlassPanel>
        <KangurGlassPanel data-testid='kangur-glass-panel-warm-glow' surface='warmGlow'>
          Warm glow glass
        </KangurGlassPanel>
        <KangurGlassPanel data-testid='kangur-glass-panel-success-glow' surface='successGlow'>
          Success glow glass
        </KangurGlassPanel>
        <KangurGlassPanel data-testid='kangur-glass-panel-play-glow' surface='playGlow'>
          Play glow glass
        </KangurGlassPanel>
        <KangurGlassPanel data-testid='kangur-glass-panel-play-field' surface='playField'>
          Play field glass
        </KangurGlassPanel>
        <KangurGlassPanel data-testid='kangur-glass-panel-teal-field' surface='tealField'>
          Teal field glass
        </KangurGlassPanel>
        <KangurMenuItem data-testid='kangur-menu-item'>Shared menu item</KangurMenuItem>
        <KangurMediaFrame accent='amber' data-testid='kangur-media-frame' mediaType='image'>
          {/* Intentional raw image element to assert frame styling without Next.js image behavior. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt='Example' src='/example.png' />
        </KangurMediaFrame>
        <KangurResultBadge data-testid='kangur-result-badge' tone='success'>
          Brawo!
        </KangurResultBadge>
        <KangurProse
          accent='indigo'
          data-testid='kangur-prose'
          dangerouslySetInnerHTML={{
            __html: '<p>Shared <a href="#">content</a></p><blockquote>Quote</blockquote>',
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
    expect(screen.getByTestId('kangur-icon-badge-3xl')).toHaveClass(
      'h-24',
      'w-24',
      'text-5xl',
      'bg-amber-100',
      'text-amber-700'
    );
    expect(screen.getByTestId('kangur-gradient-icon-tile')).toHaveClass(
      'h-16',
      'w-16',
      'rounded-[24px]',
      'from-indigo-400',
      'to-fuchsia-500'
    );
    expect(screen.getByTestId('kangur-display-emoji')).toHaveClass('inline-flex', 'text-6xl');
    expect(screen.getByTestId('kangur-display-emoji-xs')).toHaveClass('inline-flex', 'text-3xl');
    expect(screen.getByTestId('kangur-gradient-heading')).toHaveClass(
      'bg-gradient-to-r',
      'bg-clip-text',
      'text-transparent',
      'text-4xl',
      'from-indigo-500',
      'to-purple-600'
    );
    expect(screen.getByTestId('kangur-headline')).toHaveClass('text-2xl', 'text-green-700');
    expect(screen.getByTestId('kangur-headline-xs')).toHaveClass('text-lg', 'text-indigo-700');
    expect(screen.getByTestId('kangur-feature-header')).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'text-center'
    );
    expect(screen.getByText('Gra z piłkami!')).toHaveClass('text-2xl', 'text-amber-700');
    expect(screen.getByText('🎮')).toHaveClass('h-16', 'w-16', 'bg-amber-100', 'text-amber-700');
    expect(screen.getByTestId('kangur-section-heading')).toHaveClass(
      'flex',
      'flex-row',
      'items-start',
      'text-left'
    );
    expect(screen.getByText('Shared section')).toHaveClass('text-2xl', 'text-indigo-700');
    expect(screen.getByText('🧭')).toHaveClass('h-16', 'w-16', 'bg-indigo-100', 'text-indigo-700');
    expect(screen.getByTestId('kangur-equation-display')).toHaveClass(
      'text-3xl',
      'text-blue-600'
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
    expect(screen.getByTestId('kangur-inline-fallback')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80',
      'w-full'
    );
    expect(screen.getByTestId('kangur-option')).toHaveClass(
      'soft-card',
      'border-amber-300',
      'cursor-pointer'
    );
    expect(screen.getByTestId('kangur-option-muted')).toHaveClass(
      'soft-card',
      'border-slate-200/80',
      'text-slate-400',
      'opacity-70'
    );
    expect(screen.getByTestId('kangur-option-muted')).not.toHaveClass('cursor-pointer');
    expect(screen.getByTestId('kangur-button-primary')).toHaveClass(
      'kangur-cta-pill',
      'primary-cta',
      'focus-visible:ring-amber-300/70'
    );
    expect(screen.getByTestId('kangur-button-surface')).toHaveClass(
      'kangur-cta-pill',
      'surface-cta',
      'focus-visible:ring-indigo-300/70'
    );
    expect(screen.getByTestId('kangur-surface-panel')).toHaveClass(
      'glass-panel',
      'border-sky-200/80',
      'bg-white/95',
      'flex'
    );
    expect(screen.getByTestId('kangur-glass-panel')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(screen.getByTestId('kangur-glass-panel-frost')).toHaveClass(
      'glass-panel',
      'border-white/75',
      'bg-white/88'
    );
    expect(screen.getByTestId('kangur-glass-panel-mist-soft')).toHaveClass(
      'glass-panel',
      'border-white/70',
      'bg-white/45'
    );
    expect(screen.getByTestId('kangur-glass-panel-warm-glow')).toHaveClass(
      'glass-panel',
      'border-amber-200/70'
    );
    expect(screen.getByTestId('kangur-glass-panel-success-glow')).toHaveClass(
      'glass-panel',
      'border-emerald-200/70'
    );
    expect(screen.getByTestId('kangur-glass-panel-play-glow')).toHaveClass(
      'glass-panel',
      'border-indigo-200/70'
    );
    expect(screen.getByTestId('kangur-glass-panel-play-field')).toHaveClass(
      'glass-panel',
      'border-white/80'
    );
    expect(screen.getByTestId('kangur-glass-panel-teal-field')).toHaveClass(
      'glass-panel',
      'border-white/75',
      'bg-white/86'
    );
    expect(screen.getByTestId('kangur-menu-item')).toHaveClass(
      'rounded-[16px]',
      'text-[15px]',
      'data-[highlighted]:bg-white/80'
    );
    expect(screen.getByTestId('kangur-media-frame')).toHaveClass(
      'soft-card',
      'border-amber-100',
      'from-amber-50'
    );
    expect(screen.getByTestId('kangur-result-badge')).toHaveClass(
      'border-emerald-200',
      'bg-emerald-100',
      'text-emerald-700'
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

  it('renders the page container as a focusable div for embedded Kangur surfaces', () => {
    render(
      <KangurRoutingProvider
        basePath='/admin/kangur'
        embedded
        pageKey='Game'
        requestedPath='/admin/kangur'
      >
        <KangurPageContainer id='embedded-kangur-main'>Embedded Kangur</KangurPageContainer>
      </KangurRoutingProvider>
    );

    const container = screen.getByText('Embedded Kangur');
    expect(container.tagName).toBe('DIV');
    expect(container).toHaveAttribute('id', 'embedded-kangur-main');
    expect(container).toHaveAttribute('tabindex', '-1');
  });
});
