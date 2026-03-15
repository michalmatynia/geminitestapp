'use client';

import React from 'react';

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

const isNonEmpty = (value?: string | null): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const resolveColor = (value: string | null | undefined, fallback: string): string =>
  isNonEmpty(value) ? value : fallback;

const resolveNumber = (value: number | null | undefined, fallback: number): number =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback;

const hexToRgba = (hex: string, alpha: number): string | null => {
  const normalized = hex.replace('#', '').trim();
  if (![3, 4, 6, 8].includes(normalized.length)) return null;
  const full =
    normalized.length <= 4
      ? normalized
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const withAlpha = (color: string, alpha: number): string => {
  const trimmed = color.trim();
  if (trimmed.startsWith('rgba') || trimmed.startsWith('hsla')) return trimmed;
  if (trimmed.startsWith('rgb') || trimmed.startsWith('hsl')) {
    return trimmed.replace(/\)$/, `, ${alpha})`).replace('rgb(', 'rgba(').replace('hsl(', 'hsla(');
  }
  const rgba = hexToRgba(trimmed, alpha);
  return rgba ?? trimmed;
};

const resolveGradient = (
  start: string | null | undefined,
  mid: string | null | undefined,
  end: string | null | undefined,
  fallbackStart: string,
  fallbackEnd: string
): string => {
  const first = resolveColor(start, fallbackStart);
  const last = resolveColor(end, fallbackEnd);
  const middle = isNonEmpty(mid) ? mid.trim() : null;
  if (middle) {
    return `linear-gradient(135deg, ${first}, ${middle}, ${last})`;
  }
  return `linear-gradient(135deg, ${first}, ${last})`;
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
      <div className='grid grid-cols-3 gap-2'>
        {swatches.map((swatch) => (
          <div key={swatch.label} className='rounded-lg border border-border/60 p-2 text-[10px] text-gray-300'>
            <div
              className='h-8 w-full rounded-md border border-border/60'
              style={{ background: swatch.color }}
            />
            <div className='mt-1 text-center'>{swatch.label}</div>
          </div>
        ))}
      </div>
    </PreviewCard>
  );
}

function TextOverridesPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const pageText = resolveColor(theme.pageTextColor, theme.textColor);
  const pageMuted = resolveColor(theme.pageMutedTextColor, theme.mutedTextColor);
  const cardText = resolveColor(theme.cardTextColor, theme.textColor);
  const navText = resolveColor(theme.navTextColor, theme.textColor);
  const navActive = resolveColor(theme.navActiveTextColor, theme.primaryColor);
  const navHover = resolveColor(theme.navHoverTextColor, theme.secondaryColor);

  return (
    <PreviewCard title='Text Overrides'>
      <div className='flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs'>
        <span style={{ color: navText }}>Home</span>
        <span style={{ color: navActive }}>Active</span>
        <span style={{ color: navHover }}>Hover</span>
      </div>
      <div
        className='rounded-lg border border-border/60 p-3'
        style={{ background: theme.surfaceColor, color: pageText }}
      >
        <div className='text-sm font-semibold' style={{ color: cardText }}>
          Card headline
        </div>
        <div className='text-xs' style={{ color: pageMuted }}>
          Muted helper text preview.
        </div>
      </div>
    </PreviewCard>
  );
}

function LogoPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const wordmarkGradient = resolveGradient(
    theme.logoWordStart,
    theme.logoWordMid,
    theme.logoWordEnd,
    theme.primaryColor,
    theme.secondaryColor
  );
  const ringGradient = resolveGradient(
    theme.logoRingStart,
    null,
    theme.logoRingEnd,
    theme.secondaryColor,
    theme.accentColor
  );
  const accentGradient = resolveGradient(
    theme.logoAccentStart,
    null,
    theme.logoAccentEnd,
    theme.accentColor,
    theme.primaryColor
  );

  return (
    <PreviewCard title='Logo & Loader'>
      <div className='flex items-center gap-3'>
        <div
          className='text-lg font-bold tracking-[0.3em] text-transparent'
          style={{
            backgroundImage: wordmarkGradient,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
          }}
        >
          KANGUR
        </div>
        <div className='flex items-center gap-2'>
          <div
            className='h-10 w-10 rounded-full border border-white/20'
            style={{ background: ringGradient }}
          />
          <div
            className='h-6 w-6 rounded-full border border-white/20'
            style={{ background: accentGradient }}
          />
        </div>
      </div>
    </PreviewCard>
  );
}

function BackgroundPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  return (
    <PreviewCard title='Backgrounds & Surfaces'>
      <div className='grid grid-cols-2 gap-2 text-[10px] text-gray-300'>
        <div className='rounded-lg border border-border/60 p-2' style={{ background: theme.backgroundColor }}>
          Page
        </div>
        <div className='rounded-lg border border-border/60 p-2' style={{ background: theme.surfaceColor }}>
          Surface
        </div>
        <div className='rounded-lg border border-border/60 p-2' style={{ background: theme.cardBg }}>
          Card
        </div>
        <div className='rounded-lg border border-border/60 p-2' style={{ background: theme.containerBg }}>
          Container
        </div>
      </div>
    </PreviewCard>
  );
}

function ButtonsPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const paddingX = resolveNumber(theme.btnPaddingX, 18);
  const paddingY = resolveNumber(theme.btnPaddingY, 10);
  const fontSize = resolveNumber(theme.btnFontSize, 14);
  const fontWeight = theme.btnFontWeight ?? '600';
  const radius = resolveNumber(theme.btnBorderRadius ?? theme.btnRadius, 10);
  const borderWidth = resolveNumber(theme.btnBorderWidth, 1);
  const borderOpacity = resolveNumber(theme.btnBorderOpacity, 100) / 100;
  const borderColor = resolveColor(theme.btnOutlineBorder, theme.borderColor);
  const shadowOpacity = resolveNumber(theme.btnShadowOpacity, 0);
  const shadowX = resolveNumber(theme.btnShadowX, 0);
  const shadowY = resolveNumber(theme.btnShadowY, 2);
  const shadowBlur = resolveNumber(theme.btnShadowBlur, 6);
  const glowOpacity = resolveNumber(theme.btnGlowOpacity, 0);
  const glowSpread = resolveNumber(theme.btnGlowSpread, 8);
  const glowColor = resolveColor(theme.btnGlowColor, theme.primaryColor);

  const baseShadow =
    shadowOpacity > 0
      ? `${shadowX}px ${shadowY}px ${shadowBlur}px ${withAlpha('#000000', shadowOpacity)}`
      : 'none';  const glowShadow =
    glowOpacity > 0 ? `0 0 ${glowSpread}px ${withAlpha(glowColor, glowOpacity)}` : '';
  const buttonShadow = [baseShadow, glowShadow].filter(Boolean).join(', ');

  return (
    <PreviewCard title='Buttons'>
      <div className='flex flex-col gap-2'>
        <button
          type='button'
          className='text-xs font-semibold'
          style={{
            background: resolveColor(theme.btnPrimaryBg, theme.primaryColor),
            color: resolveColor(theme.btnPrimaryText, '#ffffff'),
            padding: `${paddingY}px ${paddingX}px`,
            borderRadius: radius,
            border: `${borderWidth}px solid ${withAlpha(borderColor, borderOpacity)}`,
            fontSize,
            fontWeight,
            boxShadow: buttonShadow,
          }}
        >
          Primary CTA
        </button>
        <button
          type='button'
          className='text-xs font-semibold'
          style={{
            background: resolveColor(theme.btnSecondaryBg, theme.secondaryColor),
            color: resolveColor(theme.btnSecondaryText, '#ffffff'),
            padding: `${paddingY}px ${paddingX}px`,
            borderRadius: radius,
            border: `${borderWidth}px solid ${withAlpha(borderColor, borderOpacity)}`,
            fontSize,
            fontWeight,
          }}
        >
          Secondary CTA
        </button>
      </div>
    </PreviewCard>
  );
}

function PillsPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const paddingX = resolveNumber(theme.pillPaddingX, 12);
  const paddingY = resolveNumber(theme.pillPaddingY, 4);
  const fontSize = resolveNumber(theme.pillFontSize, 12);
  const radius = resolveNumber(theme.pillRadius, 999);

  return (
    <PreviewCard title='Navigation Pills'>
      <div className='flex items-center gap-2'>
        <span
          className='text-xs font-medium'
          style={{
            background: resolveColor(theme.pillBg, theme.surfaceColor),
            color: resolveColor(theme.pillText, theme.textColor),
            padding: `${paddingY}px ${paddingX}px`,
            borderRadius: radius,
            fontSize,
          }}
        >
          Default
        </span>
        <span
          className='text-xs font-medium'
          style={{
            background: resolveColor(theme.pillActiveBg, theme.primaryColor),
            color: resolveColor(theme.pillActiveText, '#ffffff'),
            padding: `${paddingY}px ${paddingX}px`,
            borderRadius: radius,
            fontSize,
          }}
        >
          Active
        </span>
      </div>
    </PreviewCard>
  );
}

function GradientsPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const gradients = [
    { label: 'Indigo', start: theme.gradientIndigoStart, end: theme.gradientIndigoEnd },
    { label: 'Violet', start: theme.gradientVioletStart, end: theme.gradientVioletEnd },
    { label: 'Emerald', start: theme.gradientEmeraldStart, end: theme.gradientEmeraldEnd },
    { label: 'Sky', start: theme.gradientSkyStart, end: theme.gradientSkyEnd },
    { label: 'Amber', start: theme.gradientAmberStart, end: theme.gradientAmberEnd },
    { label: 'Rose', start: theme.gradientRoseStart, end: theme.gradientRoseEnd },
    { label: 'Teal', start: theme.gradientTealStart, end: theme.gradientTealEnd },
    { label: 'Slate', start: theme.gradientSlateStart, end: theme.gradientSlateEnd },
  ];

  return (
    <PreviewCard title='Gradients'>
      <div className='grid grid-cols-2 gap-2 text-[10px] text-gray-300'>
        {gradients.map((gradient) => (
          <div key={gradient.label} className='rounded-lg border border-border/60 p-2'>
            <div
              className='h-7 rounded-md border border-border/60'
              style={{ background: `linear-gradient(135deg, ${gradient.start}, ${gradient.end})` }}
            />
            <div className='mt-1 text-center'>{gradient.label}</div>
          </div>
        ))}
      </div>
    </PreviewCard>
  );
}

function HomeActionsPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const actions = [
    { label: 'Lessons', prefix: 'homeActionLessons' },
    { label: 'Play', prefix: 'homeActionPlay' },
    { label: 'Training', prefix: 'homeActionTraining' },
    { label: 'Kangur', prefix: 'homeActionKangur' },
  ] as const;

  return (
    <PreviewCard title='Home Actions'>
      <div className='grid grid-cols-2 gap-2'>
        {actions.map((action) => {
          const start = theme[`${action.prefix}LabelStart` as keyof ThemeSettings] as string;
          const mid = theme[`${action.prefix}LabelMid` as keyof ThemeSettings] as string;
          const end = theme[`${action.prefix}LabelEnd` as keyof ThemeSettings] as string;
          const textColor = theme[`${action.prefix}TextColor` as keyof ThemeSettings] as string;

          return (
            <div
              key={action.label}
              className='rounded-lg border border-border/60 px-3 py-2 text-xs font-semibold'
              style={{
                background: resolveGradient(start, mid, end, theme.primaryColor, theme.secondaryColor),
                color: resolveColor(textColor, theme.textColor),
              }}
            >
              {action.label}
            </div>
          );
        })}
      </div>
    </PreviewCard>
  );
}

function ProgressPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const track = resolveColor(theme.progressTrackColor, theme.borderColor);
  const fill = theme.primaryColor;

  return (
    <PreviewCard title='Progress Bars'>
      <div className='h-2 rounded-full' style={{ background: track }}>
        <div className='h-2 w-2/3 rounded-full' style={{ background: fill }} />
      </div>
    </PreviewCard>
  );
}

function InputsPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const height = resolveNumber(theme.inputHeight, 40);
  const radius = resolveNumber(theme.inputRadius, 10);
  const fontSize = resolveNumber(theme.inputFontSize, 14);

  return (
    <PreviewCard title='Inputs'>
      <div
        className='w-full rounded-lg border px-3 py-2 text-xs'
        style={{
          height,
          borderColor: resolveColor(theme.inputBorderColor, theme.borderColor),
          background: resolveColor(theme.inputBg, theme.surfaceColor),
          color: resolveColor(theme.inputText, theme.textColor),
          borderRadius: radius,
          fontSize,
        }}
      >
        <span style={{ color: resolveColor(theme.inputPlaceholder, theme.mutedTextColor) }}>
          Search prompt…
        </span>
      </div>
    </PreviewCard>
  );
}

function TypographyPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const headingSize = resolveNumber(theme.baseSize, 16) * 1.4;

  return (
    <PreviewCard title='Typography & Layout'>
      <div className='space-y-1'>
        <div
          className='font-semibold'
          style={{
            fontFamily: theme.headingFont,
            fontSize: headingSize,
            lineHeight: theme.headingLineHeight,
          }}
        >
          Kangur Heading
        </div>
        <div
          className='text-xs'
          style={{
            fontFamily: theme.bodyFont,
            fontSize: theme.baseSize,
            lineHeight: theme.lineHeight,
            color: theme.mutedTextColor,
          }}
        >
          Body text sample with the current base size and line height.
        </div>
      </div>
    </PreviewCard>
  );
}

function ShapePreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  return (
    <PreviewCard title='Shape & Spacing'>
      <div className='grid grid-cols-2 gap-2 text-[10px] text-gray-300'>
        <div
          className='rounded-lg border border-border/60 p-3'
          style={{ borderRadius: resolveNumber(theme.containerRadius, 12), background: theme.containerBg }}
        >
          Panel
        </div>
        <div
          className='rounded-lg border border-border/60 p-3'
          style={{ borderRadius: resolveNumber(theme.cardRadius, 12), background: theme.cardBg }}
        >
          Card
        </div>
      </div>
    </PreviewCard>
  );
}

function ShadowPreview({ theme }: { theme: ThemeSettings }): React.JSX.Element {
  const shadowOpacity = resolveNumber(theme.containerShadowOpacity, 0);
  const shadowX = resolveNumber(theme.containerShadowX, 0);
  const shadowY = resolveNumber(theme.containerShadowY, 10);
  const shadowBlur = resolveNumber(theme.containerShadowBlur, 20);

  return (
    <PreviewCard title='Shadows & Depth'>
      <div
        className='rounded-lg border border-border/60 p-4 text-xs text-gray-300'
        style={{
          background: theme.containerBg,
          boxShadow:
            shadowOpacity > 0
              ? `${shadowX}px ${shadowY}px ${shadowBlur}px ${withAlpha('#000000', shadowOpacity)}`
              : 'none',
        }}
      >
        Floating panel preview
      </div>
    </PreviewCard>
  );
}

export function KangurThemePreviewPanel({
  section,
  theme,
  mode,
}: KangurThemePreviewPanelProps): React.JSX.Element {
  const resolvedSection = section ?? 'Core Palette';

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
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
        {resolvedSection === 'Core Palette' && <CorePalettePreview theme={theme} />}
        {resolvedSection === 'Text Overrides' && <TextOverridesPreview theme={theme} />}
        {resolvedSection === 'Logo & Loader' && <LogoPreview theme={theme} />}
        {resolvedSection === 'Backgrounds and Surfaces' && <BackgroundPreview theme={theme} />}
        {resolvedSection === 'Buttons' && <ButtonsPreview theme={theme} />}
        {resolvedSection === 'Navigation Pills' && <PillsPreview theme={theme} />}
        {resolvedSection === 'Gradients' && <GradientsPreview theme={theme} />}
        {resolvedSection === 'Home Actions' && <HomeActionsPreview theme={theme} />}
        {resolvedSection === 'Progress Bars' && <ProgressPreview theme={theme} />}
        {resolvedSection === 'Inputs' && <InputsPreview theme={theme} />}
        {resolvedSection === 'Typography and Layout' && <TypographyPreview theme={theme} />}
        {resolvedSection === 'Shape and Spacing' && <ShapePreview theme={theme} />}
        {resolvedSection === 'Shadows and Depth' && <ShadowPreview theme={theme} />}

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
            <CorePalettePreview theme={theme} />
          )}
      </div>
    </div>
  );
}
