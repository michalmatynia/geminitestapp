'use client';

import React from 'react';

import { resolveKangurStorefrontAppearance } from '@/features/cms/public';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { Badge } from '@/shared/ui';
import type { KangurThemeMode } from '@/features/kangur/admin/components/KangurThemeSettingsPanel';

type KangurThemePreviewPanelProps = {
  section: string | null;
  theme: ThemeSettings;
  mode: KangurThemeMode;
};

const MODE_LABELS: Record<KangurThemeMode, string> = {
  daily: 'Daily',
  dawn: 'Dawn',
  sunset: 'Sunset',
  nightly: 'Nightly',
};

const resolveAppearanceMode = (
  mode: KangurThemeMode
): 'default' | 'dark' | 'dawn' | 'sunset' => {
  if (mode === 'nightly') return 'dark';
  if (mode === 'dawn') return 'dawn';
  if (mode === 'sunset') return 'sunset';
  return 'default';
};

const PreviewCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element => (
  <div className='rounded-xl border border-border/60 bg-card/30 p-3 space-y-2'>
    <div className='text-[10px] uppercase tracking-[0.2em] text-gray-400'>{title}</div>
    {children}
  </div>
);

const PreviewScene = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}): React.JSX.Element => (
  <div
    className={`rounded-lg p-3 ${className ?? ''}`}
    style={{
      background: 'var(--kangur-page-background)',
      color: 'var(--kangur-page-text)',
      fontFamily: 'var(--kangur-font-body, sans-serif)',
      fontSize: 'var(--kangur-font-base-size, 16px)',
      lineHeight: 'var(--kangur-font-line-height, 1.5)',
      border: '1px solid var(--kangur-soft-card-border, rgba(148,163,184,0.3))',
      ...style,
    }}
  >
    {children}
  </div>
);

const navStyle: React.CSSProperties = {
  background: 'var(--kangur-nav-group-background)',
  border: '1px solid var(--kangur-nav-group-border)',
  borderRadius: 'var(--kangur-nav-group-radius)',
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexWrap: 'wrap',
};

const pillBase: React.CSSProperties = {
  borderRadius: 'var(--kangur-nav-item-radius)',
  padding: 'var(--kangur-pill-padding-y) var(--kangur-pill-padding-x)',
  fontSize: 'var(--kangur-pill-font-size)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const pillActive: React.CSSProperties = {
  ...pillBase,
  background: 'var(--kangur-nav-item-active-background)',
  color: 'var(--kangur-nav-item-active-text)',
  border: '1px solid var(--kangur-nav-item-active-border, transparent)',
};

const pillInactive: React.CSSProperties = {
  ...pillBase,
  background: 'transparent',
  color: 'var(--kangur-nav-item-text)',
  border: '1px solid transparent',
};

const pillHover: React.CSSProperties = {
  ...pillBase,
  background: 'var(--kangur-nav-item-hover-background, transparent)',
  color: 'var(--kangur-nav-item-hover-text, var(--kangur-nav-item-text))',
  border: '1px solid var(--kangur-nav-item-hover-border, transparent)',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--kangur-soft-card-background)',
  border: '1px solid var(--kangur-soft-card-border)',
  borderRadius: 'var(--kangur-card-radius)',
  padding: '10px 12px',
  boxShadow: 'var(--kangur-soft-card-shadow)',
  color: 'var(--kangur-soft-card-text)',
};

const glassStyle: React.CSSProperties = {
  background: 'var(--kangur-glass-panel-background)',
  border: '1px solid var(--kangur-glass-panel-border)',
  borderRadius: 'var(--kangur-panel-radius-soft)',
  padding: '10px 12px',
  boxShadow: 'var(--kangur-glass-panel-shadow)',
};

const buttonBase: React.CSSProperties = {
  borderRadius: 'var(--kangur-button-border-radius, var(--kangur-button-radius, 999px))',
  padding: 'var(--kangur-button-padding-y) var(--kangur-button-padding-x)',
  fontSize: 'var(--kangur-button-font-size)',
  fontWeight: 600,
  textShadow: 'var(--kangur-button-text-shadow, none)',
  border: 'var(--kangur-button-border-width, 0px) solid var(--kangur-button-border-color, transparent)',
  minHeight: 'var(--kangur-button-height, auto)',
  cursor: 'default',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
  position: 'relative',
  overflow: 'hidden',
};

const buttonPrimary: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--kangur-button-primary-background)',
  color: 'var(--kangur-button-primary-text, #fff)',
  boxShadow: 'var(--kangur-button-primary-shadow)',
};

const buttonPrimaryHover: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--kangur-button-primary-hover-background, var(--kangur-button-primary-background))',
  color: 'var(--kangur-button-primary-text, #fff)',
  boxShadow: 'var(--kangur-button-primary-hover-shadow, var(--kangur-button-primary-shadow))',
};

const buttonSecondary: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--kangur-button-secondary-background)',
  color: 'var(--kangur-button-secondary-text)',
  boxShadow: 'var(--kangur-button-secondary-shadow)',
};

const buttonSurface: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--kangur-button-surface-background)',
  color: 'var(--kangur-button-surface-text)',
  boxShadow: 'var(--kangur-button-surface-shadow)',
};

const buttonWarning: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--kangur-button-warning-background)',
  color: 'var(--kangur-button-warning-text)',
  boxShadow: 'var(--kangur-button-warning-shadow)',
};

const buttonSuccess: React.CSSProperties = {
  ...buttonBase,
  background: 'var(--kangur-button-success-background)',
  color: 'var(--kangur-button-success-text)',
  boxShadow: 'var(--kangur-button-success-shadow)',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--kangur-text-field-background)',
  border: '1px solid var(--kangur-text-field-border)',
  borderRadius: 'var(--kangur-input-radius, 22px)',
  height: 'var(--kangur-input-height, 34px)',
  fontSize: 'var(--kangur-input-font-size, 12px)',
  color: 'var(--kangur-text-field-text)',
  padding: '0 12px',
  outline: 'none',
  boxSizing: 'border-box',
};

function ButtonGloss(): React.JSX.Element {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: '1px 1px auto',
        height: 'var(--kangur-button-gloss-height, 48%)',
        borderRadius: 'inherit',
        background: `linear-gradient(
          var(--kangur-button-gloss-angle, 180deg),
          color-mix(in srgb, var(--kangur-button-gloss-color, #fff) calc(var(--kangur-button-gloss-opacity, 0) * 100%), transparent),
          transparent
        )`,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}

const HOME_ACTIONS = [
  { id: 'lessons', label: 'Lessons', icon: 'L' },
  { id: 'play', label: 'Play', icon: 'P' },
  { id: 'training', label: 'Training', icon: 'T' },
  { id: 'kangur', label: 'Kangur', icon: 'K' },
] as const;

function HomeActionCard({
  actionId,
  label,
  icon,
}: {
  actionId: string;
  label: string;
  icon: string;
}): React.JSX.Element {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        borderRadius: 12,
        padding: '8px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        background: `linear-gradient(
          180deg,
          var(--kangur-home-action-${actionId}-underlay-start, var(--kangur-cta-primary-start)) 0%,
          var(--kangur-home-action-${actionId}-underlay-mid, var(--kangur-cta-primary-mid)) 50%,
          var(--kangur-home-action-${actionId}-underlay-end, var(--kangur-cta-primary-end)) 100%
        )`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 12px 18px -16px rgba(var(--kangur-home-action-${actionId}-underlay-shadow-rgb, 0,0,0), 0.5)`,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(
            90deg,
            var(--kangur-home-action-${actionId}-accent-start, var(--kangur-cta-primary-start)) 0%,
            var(--kangur-home-action-${actionId}-accent-mid, var(--kangur-cta-primary-mid)) 50%,
            var(--kangur-home-action-${actionId}-accent-end, var(--kangur-cta-primary-end)) 100%
          )`,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 'auto 0 0',
          height: '40%',
          background: `linear-gradient(
            180deg,
            transparent,
            rgba(var(--kangur-home-action-${actionId}-surface-shadow-rgb, 0,0,0), 0.22)
          )`,
        }}
      />
      <span style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}>{icon}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          background: `linear-gradient(
            90deg,
            var(--kangur-home-action-${actionId}-label-start, var(--kangur-cta-primary-start)) 0%,
            var(--kangur-home-action-${actionId}-label-mid, var(--kangur-cta-primary-mid)) 50%,
            var(--kangur-home-action-${actionId}-label-end, var(--kangur-cta-primary-end)) 100%
          )`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CorePalettePreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const swatches = [
    { label: 'Primary', color: theme.primaryColor },
    { label: 'Secondary', color: theme.secondaryColor },
    { label: 'Accent', color: theme.accentColor },
    { label: 'Success', color: theme.successColor },
    { label: 'Text', color: theme.textColor },
    { label: 'Muted', color: theme.mutedTextColor },
  ];

  return (
    <PreviewCard title='Core Palette'>
      <PreviewScene>
        <div className='grid grid-cols-3 gap-2'>
          {swatches.map((swatch) => (
            <div
              key={swatch.label}
              className='rounded-lg border border-border/60 p-2 text-[10px] text-gray-300'
            >
              <div
                className='h-8 w-full rounded-md border border-border/60'
                style={{ background: swatch.color }}
              />
              <div className='mt-1 text-center'>{swatch.label}</div>
            </div>
          ))}
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function TextOverridesPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Text Overrides'>
      <PreviewScene className='space-y-2'>
        <div style={navStyle}>
          <span style={pillActive}>Home</span>
          <span style={pillInactive}>Library</span>
          <span style={pillHover}>Hover</span>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              fontFamily: 'var(--kangur-font-heading, sans-serif)',
              fontWeight: 700,
              fontSize: 12,
              marginBottom: 2,
            }}
          >
            Card headline
          </div>
          <div style={{ color: 'var(--kangur-page-muted-text)', fontSize: 10 }}>
            Muted helper text preview.
          </div>
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function LogoPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Logo & Loader'>
      <PreviewScene className='space-y-2'>
        <div className='flex items-center gap-3'>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, var(--kangur-logo-ring-start) 0%, var(--kangur-logo-ring-end) 100%)',
              boxShadow: '0 2px 8px var(--kangur-logo-shadow, rgba(0,0,0,0.2))',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 5,
                borderRadius: '50%',
                background:
                  'linear-gradient(180deg, var(--kangur-logo-inner-start) 0%, var(--kangur-logo-inner-end) 100%)',
              }}
            />
          </div>
          <div
            className='text-lg font-bold uppercase tracking-[0.2em] text-transparent'
            style={{
              fontFamily: 'var(--kangur-font-heading, sans-serif)',
              background:
                'linear-gradient(90deg, var(--kangur-logo-word-start) 0%, var(--kangur-logo-word-mid) 50%, var(--kangur-logo-word-end) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
            }}
          >
            Kangur
          </div>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, var(--kangur-logo-accent-start) 0%, var(--kangur-logo-accent-end) 100%)',
            }}
          />
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function BackgroundPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Backgrounds & Surfaces'>
      <PreviewScene className='space-y-2'>
        <div style={{ ...glassStyle, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: 'var(--kangur-page-muted-text)' }}>
            Glass panel surface
          </div>
        </div>
        <div style={{ ...cardStyle, padding: '8px 10px' }}>
          <div style={{ fontSize: 10 }}>Soft card surface</div>
        </div>
        <div className='grid grid-cols-2 gap-2 text-[10px] text-gray-300'>
          <div
            className='rounded-md border border-border/60 p-2'
            style={{ background: 'var(--kangur-page-background)' }}
          >
            Page
          </div>
          <div
            className='rounded-md border border-border/60 p-2'
            style={{ background: 'var(--kangur-soft-card-background)' }}
          >
            Card
          </div>
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function ButtonsPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Buttons'>
      <PreviewScene className='space-y-2'>
        <div className='flex flex-wrap gap-2'>
          <span style={buttonPrimary}>
            <ButtonGloss />
            <span style={{ position: 'relative', zIndex: 2 }}>Primary</span>
          </span>
          <span style={buttonPrimaryHover}>
            <ButtonGloss />
            <span style={{ position: 'relative', zIndex: 2 }}>Hover</span>
          </span>
          <span style={buttonSecondary}>
            <ButtonGloss />
            <span style={{ position: 'relative', zIndex: 2 }}>Secondary</span>
          </span>
        </div>
        <div className='flex flex-wrap gap-2'>
          <span style={buttonSurface}>
            <ButtonGloss />
            <span style={{ position: 'relative', zIndex: 2 }}>Surface</span>
          </span>
          <span style={buttonWarning}>
            <ButtonGloss />
            <span style={{ position: 'relative', zIndex: 2 }}>Warning</span>
          </span>
          <span style={buttonSuccess}>
            <ButtonGloss />
            <span style={{ position: 'relative', zIndex: 2 }}>Success</span>
          </span>
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function PillsPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Navigation Pills'>
      <PreviewScene>
        <div style={navStyle}>
          <span style={pillActive}>Active</span>
          <span style={pillInactive}>Library</span>
          <span style={pillHover}>Hover</span>
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function GradientsPreview(): React.JSX.Element {
  const gradients = [
    { label: 'Indigo', start: '--kangur-accent-indigo-start', end: '--kangur-accent-indigo-end' },
    { label: 'Violet', start: '--kangur-accent-violet-start', end: '--kangur-accent-violet-end' },
    { label: 'Emerald', start: '--kangur-accent-emerald-start', end: '--kangur-accent-emerald-end' },
    { label: 'Sky', start: '--kangur-accent-sky-start', end: '--kangur-accent-sky-end' },
    { label: 'Amber', start: '--kangur-accent-amber-start', end: '--kangur-accent-amber-end' },
    { label: 'Rose', start: '--kangur-accent-rose-start', end: '--kangur-accent-rose-end' },
    { label: 'Teal', start: '--kangur-accent-teal-start', end: '--kangur-accent-teal-end' },
    { label: 'Slate', start: '--kangur-accent-slate-start', end: '--kangur-accent-slate-end' },
  ];

  return (
    <PreviewCard title='Gradients'>
      <PreviewScene>
        <div className='grid grid-cols-2 gap-2 text-[10px] text-gray-300'>
          {gradients.map((gradient) => (
            <div key={gradient.label} className='rounded-lg border border-border/60 p-2'>
              <div
                className='h-7 rounded-md border border-border/60'
                style={{
                  background: `linear-gradient(135deg, var(${gradient.start}), var(${gradient.end}))`,
                }}
              />
              <div className='mt-1 text-center'>{gradient.label}</div>
            </div>
          ))}
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function HomeActionsPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Home Actions'>
      <PreviewScene>
        <div className='grid grid-cols-2 gap-2'>
          {HOME_ACTIONS.map((action) => (
            <HomeActionCard
              key={action.id}
              actionId={action.id}
              label={action.label}
              icon={action.icon}
            />
          ))}
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function ProgressPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Progress Bars'>
      <PreviewScene>
        <div className='h-2 rounded-full' style={{ background: 'var(--kangur-progress-track)' }}>
          <div
            className='h-2 w-2/3 rounded-full'
            style={{
              background:
                'linear-gradient(90deg, var(--kangur-accent-indigo-start), var(--kangur-accent-violet-end))',
            }}
          />
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function InputsPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Inputs'>
      <PreviewScene>
        <input
          readOnly
          tabIndex={-1}
          placeholder='Search prompt…'
          style={inputStyle}
          aria-label='Input preview'
        />
      </PreviewScene>
    </PreviewCard>
  );
}

function TypographyPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Typography & Layout'>
      <PreviewScene className='space-y-2'>
        <div
          style={{
            fontFamily: 'var(--kangur-font-heading, sans-serif)',
            fontWeight: 700,
            fontSize: '1.1em',
            lineHeight: 'var(--kangur-font-heading-line-height, 1.2)',
          }}
        >
          Kangur Heading
        </div>
        <div
          style={{
            fontFamily: 'var(--kangur-font-body, sans-serif)',
            fontSize: '0.8em',
            lineHeight: 'var(--kangur-font-line-height, 1.5)',
            color: 'var(--kangur-page-muted-text)',
          }}
        >
          Body text sample with the current base size and line height.
        </div>
        <div>
          <div className='text-[10px] uppercase tracking-[0.2em] text-gray-400'>Layout</div>
          <div
            className='mt-1 h-2 rounded-full'
            style={{ background: 'var(--kangur-soft-card-border)' }}
          >
            <div
              className='h-2 rounded-full'
              style={{
                width: '65%',
                background: 'var(--kangur-accent-indigo-start)',
              }}
            />
          </div>
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function ShapePreview(): React.JSX.Element {
  return (
    <PreviewCard title='Shape & Spacing'>
      <PreviewScene className='space-y-2'>
        <div style={{ ...glassStyle, padding: 'var(--kangur-panel-padding-md)' }}>
          <div className='text-[10px] uppercase tracking-[0.2em] text-gray-400'>Panel</div>
        </div>
        <div style={{ ...cardStyle, padding: 'var(--kangur-card-padding-md)' }}>
          <div className='text-[10px] uppercase tracking-[0.2em] text-gray-400'>Card</div>
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

function ShadowPreview(): React.JSX.Element {
  return (
    <PreviewCard title='Shadows & Depth'>
      <PreviewScene className='space-y-2'>
        <div style={{ ...glassStyle, padding: '10px 12px' }}>
          <div className='text-[10px] uppercase tracking-[0.2em] text-gray-400'>Glass panel</div>
        </div>
        <div style={{ ...cardStyle, padding: '10px 12px' }}>
          <div className='text-[10px] uppercase tracking-[0.2em] text-gray-400'>Soft card</div>
        </div>
      </PreviewScene>
    </PreviewCard>
  );
}

export function KangurThemePreviewPanel(
  props: KangurThemePreviewPanelProps
): React.JSX.Element {
  const { section, theme, mode } = props;
  const activeTheme = theme;
  const resolvedSection = section ?? 'Core Palette';
  const appearance = React.useMemo(
    () => resolveKangurStorefrontAppearance(resolveAppearanceMode(mode), activeTheme),
    [mode, activeTheme]
  );
  const appearanceVars = React.useMemo(
    () => appearance.vars as React.CSSProperties,
    [appearance]
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col' style={appearanceVars}>
      <div className='border-b border-border px-4 py-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='text-sm font-semibold text-white'>Theme Preview</div>
          <Badge variant='neutral' className='text-[10px] uppercase tracking-wide'>
            {MODE_LABELS[mode]}
          </Badge>
        </div>
        <div className='text-xs text-gray-400 mt-1'>Editing: {resolvedSection}</div>
      </div>
      <div className='flex-1 overflow-y-auto p-4 space-y-3'>
        {resolvedSection === 'Core Palette' && <CorePalettePreview theme={activeTheme} />}
        {resolvedSection === 'Text Overrides' && <TextOverridesPreview />}
        {resolvedSection === 'Logo & Loader' && <LogoPreview />}
        {resolvedSection === 'Backgrounds and Surfaces' && <BackgroundPreview />}
        {resolvedSection === 'Buttons' && <ButtonsPreview />}
        {resolvedSection === 'Navigation Pills' && <PillsPreview />}
        {resolvedSection === 'Gradients' && <GradientsPreview />}
        {resolvedSection === 'Home Actions' && <HomeActionsPreview />}
        {resolvedSection === 'Progress Bars' && <ProgressPreview />}
        {resolvedSection === 'Inputs' && <InputsPreview />}
        {resolvedSection === 'Typography and Layout' && <TypographyPreview />}
        {resolvedSection === 'Shape and Spacing' && <ShapePreview />}
        {resolvedSection === 'Shadows and Depth' && <ShadowPreview />}

        {resolvedSection !== 'Core Palette' &&
          resolvedSection !== 'Text Overrides' &&
          resolvedSection !== 'Logo & Loader' &&
          resolvedSection !== 'Backgrounds and Surfaces' &&
          resolvedSection !== 'Buttons' &&
          resolvedSection !== 'Navigation Pills' &&
          resolvedSection !== 'Gradients' &&
          resolvedSection !== 'Home Actions' &&
          resolvedSection !== 'Progress Bars' &&
          resolvedSection !== 'Inputs' &&
          resolvedSection !== 'Typography and Layout' &&
          resolvedSection !== 'Shape and Spacing' &&
          resolvedSection !== 'Shadows and Depth' && (
            <CorePalettePreview theme={activeTheme} />
          )}
      </div>
    </div>
  );
}
