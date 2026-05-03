import { render, screen } from '@testing-library/react';

import {
  KangurAccentDot,
  KangurActivityColumn,
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
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
  KangurMetaText,
  KangurMediaFrame,
  KangurMetricCard,
  KangurMenuItem,
  KangurOptionCardButton,
  KangurPageContainer,
  KangurPanelIntro,
  KangurProgressBar,
  KangurProse,
  KangurResultBadge,
  KangurSectionEyebrow,
  KangurSectionHeading,
  KangurSelectField,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurSurfacePanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { safeHtml } from '@/shared/lib/security/safe-html';

export const renderSharedPrimitivesShowcase = (): void => {
  render(
    <>
      <KangurStatusChip accent='amber'>Warm badge</KangurStatusChip>
      <KangurStatusChip accent='indigo' data-testid='kangur-status-chip-caps' labelStyle='caps'>
        Capsule badge
      </KangurStatusChip>
      <KangurAccentDot accent='rose' data-testid='kangur-dot' size='lg' />
      <KangurIconBadge accent='emerald' data-testid='kangur-icon-badge' size='sm'>
        4
      </KangurIconBadge>
      <KangurIconBadge accent='amber' data-testid='kangur-icon-badge-3xl' size='3xl'>
        🦘
      </KangurIconBadge>
      <KangurGradientIconTile
        data-testid='kangur-gradient-icon-tile'
        gradientClass='kangur-gradient-accent-indigo'
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
        gradientClass='kangur-gradient-accent-indigo'
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
      <KangurCardTitle data-testid='kangur-card-title'>Shared card title</KangurCardTitle>
      <KangurCardTitle data-testid='kangur-card-title-lg' size='lg'>
        Large shared card title
      </KangurCardTitle>
      <KangurCardDescription data-testid='kangur-card-description' relaxed size='xs'>
        Shared card description
      </KangurCardDescription>
      <KangurCardDescription data-testid='kangur-card-description-md' size='md'>
        Larger shared card description
      </KangurCardDescription>
      <KangurMetaText data-testid='kangur-meta-text' relaxed size='xs' tone='slate'>
        Shared meta text
      </KangurMetaText>
      <KangurMetaText data-testid='kangur-meta-text-caps' caps tone='amber'>
        Shared meta caps
      </KangurMetaText>
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
      <KangurSectionEyebrow data-testid='kangur-section-eyebrow'>
        Shared eyebrow
      </KangurSectionEyebrow>
      <KangurPanelIntro
        data-testid='kangur-panel-intro'
        description='Shared panel description'
        eyebrow='Panel section'
        title='Shared panel title'
        titleAs='h3'
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
      <KangurOptionCardButton data-testid='kangur-option-neutral'>
        Neutral option
      </KangurOptionCardButton>
      <KangurOptionCardButton data-testid='kangur-option-muted' state='muted'>
        Muted option
      </KangurOptionCardButton>
      <KangurButton data-testid='kangur-button-primary' variant='primary'>
        Primary CTA
      </KangurButton>
      <KangurButton data-testid='kangur-button-primary-sm' size='sm' variant='primary'>
        Small primary CTA
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
        <img alt='Example' src='/example.png' />
      </KangurMediaFrame>
      <KangurResultBadge data-testid='kangur-result-badge' tone='success'>
        Brawo!
      </KangurResultBadge>
      <KangurProse
        accent='indigo'
        data-testid='kangur-prose'
        dangerouslySetInnerHTML={{
          __html: safeHtml('<p>Shared <a href="#">content</a></p><blockquote>Quote</blockquote>'),
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
};

export const expectSharedPrimitivesShowcaseClasses = (): void => {
  expect(screen.getByText('Warm badge')).toHaveClass(
    '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-amber-start,#fb923c))]',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-amber-start,#fb923c))]'
  );
  expect(screen.getByTestId('kangur-status-chip-caps')).toHaveClass(
    'text-[11px]',
    'uppercase',
    'tracking-[0.16em]'
  );
  expect(screen.getByTestId('kangur-dot')).toHaveClass('h-4', 'w-4', 'bg-rose-500');
  expect(screen.getByTestId('kangur-button-primary')).toHaveClass(
    'cursor-pointer',
    'touch-manipulation',
    '[@media(pointer:coarse)]:min-h-11'
  );
  expect(screen.getByTestId('kangur-button-primary-sm')).toHaveClass(
    '[@media(pointer:coarse)]:min-h-11',
    '[@media(pointer:coarse)]:min-w-[3rem]'
  );
  expect(screen.getByTestId('kangur-icon-badge')).toHaveClass(
    'h-9',
    'w-9',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,var(--kangur-accent-emerald-start,#10b981))]',
    '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-emerald-end,#06b6d4))]'
  );
  expect(screen.getByTestId('kangur-option-neutral')).toHaveClass(
    'touch-manipulation',
    '[border-color:var(--kangur-soft-card-border)]',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,var(--kangur-page-background))]',
    '[color:var(--kangur-page-text)]'
  );
  expect(screen.getByTestId('kangur-option-muted')).toHaveClass(
    '[border-color:var(--kangur-soft-card-border)]',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,var(--kangur-page-background))]',
    '[color:var(--kangur-page-muted-text)]'
  );
  expect(screen.getByTestId('kangur-button-surface')).toHaveClass(
    'touch-manipulation',
    'surface-cta',
    'text-[var(--kangur-button-surface-text,#2f4db5)]'
  );
  expect(screen.getByTestId('kangur-icon-badge-3xl')).toHaveClass(
    'h-24',
    'w-24',
    'text-5xl',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,var(--kangur-accent-amber-start,#fb923c))]',
    '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-amber-end,#facc15))]'
  );
  expect(screen.getByTestId('kangur-gradient-icon-tile')).toHaveClass(
    'h-16',
    'w-16',
    'kangur-gradient-icon-tile-lg',
    'kangur-gradient-accent-indigo'
  );
  expect(screen.getByTestId('kangur-display-emoji')).toHaveClass('inline-flex', 'text-6xl');
  expect(screen.getByTestId('kangur-display-emoji-xs')).toHaveClass('inline-flex', 'text-3xl');
  expect(screen.getByTestId('kangur-gradient-heading')).toHaveClass(
    'bg-gradient-to-r',
    'bg-clip-text',
    'text-transparent',
    'text-4xl',
    'kangur-gradient-accent-indigo'
  );
  expect(screen.getByTestId('kangur-headline')).toHaveClass(
    'text-xl',
    'sm:text-2xl',
    '[color:var(--kangur-accent-emerald-start,#10b981)]'
  );
  expect(screen.getByTestId('kangur-headline-xs')).toHaveClass(
    'text-base',
    'sm:text-lg',
    '[color:var(--kangur-accent-indigo-start,#a855f7)]'
  );
  expect(screen.getByTestId('kangur-card-title')).toHaveClass(
    'text-sm',
    'font-semibold',
    '[color:var(--kangur-page-text)]'
  );
  expect(screen.getByTestId('kangur-card-title-lg')).toHaveClass(
    'text-lg',
    'font-extrabold',
    'tracking-tight'
  );
  expect(screen.getByTestId('kangur-card-description')).toHaveClass(
    'text-xs',
    'leading-6',
    '[color:var(--kangur-page-muted-text)]'
  );
  expect(screen.getByTestId('kangur-card-description-md')).toHaveClass(
    'text-base',
    '[color:var(--kangur-page-muted-text)]'
  );
  expect(screen.getByTestId('kangur-meta-text')).toHaveClass(
    'text-[11px]',
    'leading-6',
    'text-slate-500'
  );
  expect(screen.getByTestId('kangur-meta-text-caps')).toHaveClass(
    'uppercase',
    'tracking-[0.14em]',
    'text-amber-900'
  );
  expect(screen.getByTestId('kangur-feature-header')).toHaveClass(
    'flex',
    'flex-col',
    'items-center',
    'text-center'
  );
  expect(screen.getByText('Gra z piłkami!')).toHaveClass(
    'text-lg',
    'sm:text-xl',
    '[color:var(--kangur-accent-amber-start,#f59e0b)]'
  );
  expect(screen.getByText('🎮')).toHaveClass(
    'h-16',
    'w-16',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,var(--kangur-accent-amber-start,#fb923c))]',
    '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-amber-end,#facc15))]'
  );
  expect(screen.getByTestId('kangur-section-heading')).toHaveClass(
    'flex',
    'flex-row',
    'items-start',
    'text-left'
  );
  expect(screen.getByText('Shared section')).toHaveClass(
    'text-xl',
    'sm:text-2xl',
    '[color:var(--kangur-accent-indigo-start,#a855f7)]'
  );
  expect(screen.getByText('🧭')).toHaveClass(
    'h-16',
    'w-16',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,var(--kangur-accent-indigo-start,#a855f7))]',
    '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-indigo-end,#6366f1))]'
  );
  expect(screen.getByTestId('kangur-equation-display')).toHaveClass(
    'text-3xl',
    'text-blue-600'
  );
  expect(screen.getByTestId('kangur-divider')).toHaveClass('h-px', 'w-12', 'bg-indigo-200');
  expect(screen.getByTestId('kangur-activity-column')).toHaveClass(
    'bg-gradient-to-t',
    'kangur-gradient-accent-indigo'
  );
  expect(screen.getByTestId('kangur-activity-column')).toHaveAttribute('data-active', 'true');
  expect(screen.getByTestId('kangur-activity-column')).toHaveStyle({ height: '72%' });
  expect(screen.getByTestId('kangur-summary')).toHaveClass(
    'soft-card',
    'kangur-card-surface',
    'kangur-card-padding-lg',
    '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,var(--kangur-accent-indigo-end,#6366f1))]',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,var(--kangur-accent-indigo-start,#a855f7))]'
  );
  expect(screen.getByText('Sekcja')).toHaveClass(
    '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-indigo-start,#a855f7))]',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-indigo-start,#a855f7))]'
  );
  expect(screen.getByTestId('kangur-section-eyebrow')).toHaveClass(
    'text-[11px]',
    'font-bold',
    'uppercase'
  );
  expect(screen.getByTestId('kangur-panel-intro')).toHaveTextContent('Panel section');
  expect(screen.getByRole('heading', { level: 3, name: 'Shared panel title' })).toHaveClass(
    'font-semibold',
    '[color:var(--kangur-page-text)]'
  );
  expect(screen.getByText('Shared panel description')).toHaveClass(
    'text-sm',
    '[color:var(--kangur-page-muted-text)]'
  );
  expect(screen.getByTestId('kangur-metric')).toHaveClass(
    'soft-card',
    'kangur-card-surface',
    '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,var(--kangur-accent-emerald-end,#06b6d4))]',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,var(--kangur-accent-emerald-start,#10b981))]'
  );
  expect(screen.getByText('92%')).toHaveClass(
    '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-emerald-end,#06b6d4))]'
  );
  expect(screen.getByTestId('kangur-empty')).toHaveClass(
    'soft-card',
    'kangur-card-surface',
    'border-dashed',
    'border',
    'text-center'
  );
  expect(screen.getByTestId('kangur-inline-fallback')).toHaveClass(
    'soft-card',
    'kangur-card-surface',
    'border-dashed',
    'border',
    'w-full'
  );
  expect(screen.getByTestId('kangur-option')).toHaveClass(
    'soft-card',
    'kangur-card-surface',
    'kangur-card-padding-md',
    'touch-manipulation',
    'active:scale-[0.995]',
    '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_46%,var(--kangur-accent-amber-end,#facc15))]',
    '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,var(--kangur-accent-amber-start,#fb923c))]',
    'cursor-pointer'
  );
  expect(screen.getByTestId('kangur-option-muted')).toHaveClass(
    'soft-card',
    'border',
    '[border-color:var(--kangur-soft-card-border)]',
    '[color:var(--kangur-page-muted-text)]',
    'opacity-70'
  );
  expect(screen.getByTestId('kangur-option-muted')).not.toHaveClass('cursor-pointer');
  expect(screen.getByTestId('kangur-button-primary')).toHaveClass(
    'kangur-button-shell',
    'kangur-button-size-md',
    'kangur-cta-pill',
    'touch-manipulation',
    'active:scale-[0.985]',
    'primary-cta',
    'focus-visible:ring-amber-300/70'
  );
  expect(screen.getByTestId('kangur-button-primary-sm')).toHaveClass(
    'kangur-button-shell',
    'kangur-button-size-sm',
    '[@media(pointer:coarse)]:min-h-11',
    '[@media(pointer:coarse)]:min-w-[3rem]',
    'primary-cta'
  );
  expect(screen.getByTestId('kangur-button-surface')).toHaveClass(
    'kangur-button-shell',
    'kangur-button-size-md',
    'kangur-cta-pill',
    'touch-manipulation',
    'surface-cta',
    'focus-visible:ring-indigo-300/70'
  );
  expect(screen.getByTestId('kangur-progress').firstElementChild).toHaveClass(
    'kangur-progress-fill',
    'bg-gradient-to-r'
  );
  expect(screen.getByTestId('kangur-progress').firstElementChild).toHaveAttribute(
    'data-kangur-accent',
    'rose'
  );
  expect(screen.getByTestId('kangur-surface-panel')).toHaveClass(
    'glass-panel',
    'kangur-panel-soft',
    'kangur-panel-padding-lg',
    'rounded-[34px]',
    'flex',
    'kangur-surface-panel-accent-sky'
  );
  expect(screen.getByTestId('kangur-glass-panel')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-solid'
  );
  expect(screen.getByTestId('kangur-glass-panel').getAttribute('style')).toBeNull();
  expect(screen.getByTestId('kangur-glass-panel-frost')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-frost'
  );
  expect(screen.getByTestId('kangur-glass-panel-mist-soft')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-mist-soft'
  );
  expect(screen.getByTestId('kangur-glass-panel-warm-glow')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-warm-glow'
  );
  expect(screen.getByTestId('kangur-glass-panel-success-glow')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-success-glow'
  );
  expect(screen.getByTestId('kangur-glass-panel-play-glow')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-play-glow'
  );
  expect(screen.getByTestId('kangur-glass-panel-play-field')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-play-field'
  );
  expect(screen.getByTestId('kangur-glass-panel-teal-field')).toHaveClass(
    'glass-panel',
    'kangur-glass-surface-teal-field'
  );
  expect(screen.getByTestId('kangur-menu-item')).toHaveClass(
    'kangur-menu-item',
    'font-medium',
    'data-[highlighted]:[background:var(--kangur-nav-item-hover-background)]'
  );
  expect(screen.getByTestId('kangur-media-frame')).toHaveClass(
    'soft-card',
    'kangur-card-surface',
    'kangur-media-padding-md',
    'kangur-media-frame-accent-amber',
    'kangur-gradient-accent-soft-amber'
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
    'border',
    'kangur-text-field-accent-indigo'
  );
  expect(screen.getByTestId('kangur-select')).toHaveClass(
    'soft-card',
    'border',
    'kangur-text-field-accent-indigo'
  );
  expect(screen.getByTestId('kangur-progress')).toHaveClass(
    'h-2',
    '[background:var(--kangur-progress-track)]'
  );
  expect(screen.getByTestId('kangur-progress')).toHaveAttribute('aria-valuenow', '65');
  expect(screen.getByTestId('kangur-progress').firstElementChild).toHaveClass('bg-gradient-to-r');
  expect(screen.getByTestId('kangur-progress').firstElementChild).toHaveAttribute(
    'data-kangur-accent',
    'rose'
  );
};

export const renderEmbeddedKangurPageContainer = (): void => {
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
};
