'use client';

import React, { useMemo, useState } from 'react';
import { resolveKangurStorefrontAppearance } from '@/features/cms/public';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  AppearanceSlot,
  SLOT_CONFIG,
  SLOT_ORDER,
  ThemeSelectionId,
} from './AppearancePage.constants';

type PreviewTarget = 'current' | AppearanceSlot;

const PREVIEW_TARGET_LABELS: Record<PreviewTarget, string> = {
  current: 'Preview',
  daily: 'Dzień',
  dawn: 'Świt',
  sunset: 'Zmierzch',
  nightly: 'Noc',
};

const PREVIEW_TARGET_ORDER: PreviewTarget[] = ['current', ...SLOT_ORDER];

const resolvePreviewModeForSelection = (
  id: ThemeSelectionId,
  assignments?: Record<AppearanceSlot, { id: string; name: string } | null>
): 'default' | 'dark' | 'dawn' | 'sunset' => {
  const directSlot = SLOT_ORDER.find(
    (slot) =>
      SLOT_CONFIG[slot].builtinId === id || SLOT_CONFIG[slot].factoryId === id
  );
  if (directSlot) {
    if (directSlot === 'daily') return 'default';
    if (directSlot === 'nightly') return 'dark';
    if (directSlot === 'dawn') return 'dawn';
    return 'sunset';
  }
  const assignedSlot = assignments
    ? SLOT_ORDER.find((slot) => assignments[slot]?.id === id)
    : null;
  if (assignedSlot) {
    if (assignedSlot === 'daily') return 'default';
    if (assignedSlot === 'nightly') return 'dark';
    if (assignedSlot === 'dawn') return 'dawn';
    return 'sunset';
  }
  return 'default';
};

/* ── Gloss overlay (can't use ::before inline, so we render a child div) ── */
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

/* ── Home action mini-card ── */
const HOME_ACTIONS = [
  { id: 'lessons', label: 'Lekcje', emoji: '\ud83d\udcda' },
  { id: 'play', label: 'Graj', emoji: '\ud83c\udfae' },
  { id: 'training', label: 'Trening', emoji: '\ud83c\udfc6' },
  { id: 'kangur', label: 'Kangur', emoji: '\ud83e\udd98' },
] as const;

function HomeActionCard({ actionId, label, emoji }: { actionId: string; label: string; emoji: string }): React.JSX.Element {
  return (
    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        borderRadius: 10,
        padding: '8px 4px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        background: `linear-gradient(
          180deg,
          var(--kangur-home-action-${actionId}-underlay-start) 0%,
          var(--kangur-home-action-${actionId}-underlay-mid) 50%,
          var(--kangur-home-action-${actionId}-underlay-end) 100%
        )`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* accent bar */}
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
            var(--kangur-home-action-${actionId}-accent-start) 0%,
            var(--kangur-home-action-${actionId}-accent-mid) 50%,
            var(--kangur-home-action-${actionId}-accent-end) 100%
          )`,
        }}
      />
      <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          background: `linear-gradient(
            90deg,
            var(--kangur-home-action-${actionId}-label-start) 0%,
            var(--kangur-home-action-${actionId}-label-mid) 50%,
            var(--kangur-home-action-${actionId}-label-end) 100%
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

/* ── Collapsible section ── */
type PreviewSection = 'page' | 'buttons' | 'cards' | 'colors' | 'chat' | 'components';

export function ThemePreviewPanel({
  draft,
  selectedId,
  slotAssignments,
  slotThemes,
}: {
  draft: ThemeSettings;
  selectedId: ThemeSelectionId;
  slotAssignments: Record<AppearanceSlot, { id: string; name: string } | null>;
  slotThemes: Record<AppearanceSlot, ThemeSettings>;
}): React.JSX.Element {
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget>('current');
  const [collapsed, setCollapsed] = useState<Set<PreviewSection>>(new Set());

  const toggle = (section: PreviewSection) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });

  const previewSelection = useMemo(() => {
    if (previewTarget === 'current') {
      const mode = resolvePreviewModeForSelection(selectedId, slotAssignments);
      return { theme: draft, mode };
    }
    const mode: 'default' | 'dark' | 'dawn' | 'sunset' =
      previewTarget === 'daily'
        ? 'default'
        : previewTarget === 'nightly'
          ? 'dark'
          : previewTarget;
    return { theme: slotThemes[previewTarget], mode };
  }, [draft, previewTarget, selectedId, slotAssignments, slotThemes]);

  const appearance = useMemo(
    () => resolveKangurStorefrontAppearance(previewSelection.mode, previewSelection.theme),
    [previewSelection.mode, previewSelection.theme]
  );

  const sceneStyle: React.CSSProperties = {
    ...(appearance.vars as React.CSSProperties),
    background: appearance.background,
    fontFamily: 'var(--kangur-font-body, sans-serif)',
    fontSize: 'var(--kangur-font-base-size, 16px)',
    lineHeight: 'var(--kangur-font-line-height, 1.5)',
    color: 'var(--kangur-page-text, #333)',
  };

  // ── Shared inline styles ──────────────────────────────────

  const navStyle: React.CSSProperties = {
    background: 'var(--kangur-nav-group-background)',
    border: '1px solid var(--kangur-nav-group-border)',
    borderRadius: 'var(--kangur-nav-group-radius)',
    padding: '5px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
  };

  const pillBase: React.CSSProperties = {
    borderRadius: 'var(--kangur-nav-item-radius)',
    padding: '4px 8px',
    fontSize: 10,
    cursor: 'default',
    whiteSpace: 'nowrap' as const,
    fontWeight: 500,
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

  const cardStyle: React.CSSProperties = {
    background: 'var(--kangur-soft-card-background)',
    border: '1px solid var(--kangur-soft-card-border)',
    borderRadius: 'var(--kangur-card-radius)',
    padding: '10px 12px',
    boxShadow: 'var(--kangur-soft-card-shadow)',
    color: 'var(--kangur-soft-card-text)',
  };

  const btnShared: React.CSSProperties = {
    borderRadius: 'var(--kangur-button-border-radius, var(--kangur-button-radius, 999px))',
    padding: '5px 12px',
    fontSize: 11,
    fontWeight: 600,
    textShadow: 'var(--kangur-button-text-shadow, none)',
    border: 'var(--kangur-button-border-width, 0px) solid var(--kangur-button-border-color, transparent)',
    cursor: 'default',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const btnPrimary: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-primary-background)',
    color: 'var(--kangur-button-primary-text, #fff)',
    boxShadow: 'var(--kangur-button-primary-shadow)',
  };

  const btnPrimaryHover: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-primary-hover-background, var(--kangur-button-primary-background))',
    color: 'var(--kangur-button-primary-text, #fff)',
    boxShadow: 'var(--kangur-button-primary-hover-shadow, var(--kangur-button-primary-shadow))',
  };

  const btnSecondary: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-secondary-background)',
    color: 'var(--kangur-button-secondary-text)',
    boxShadow: 'var(--kangur-button-secondary-shadow)',
  };

  const btnSurface: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-surface-background)',
    color: 'var(--kangur-button-surface-text)',
    boxShadow: 'var(--kangur-button-surface-shadow)',
  };

  const btnWarning: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-warning-background)',
    color: 'var(--kangur-button-warning-text)',
    boxShadow: 'var(--kangur-button-warning-shadow)',
  };

  const btnSuccess: React.CSSProperties = {
    ...btnShared,
    background: 'var(--kangur-button-success-background)',
    color: 'var(--kangur-button-success-text)',
    boxShadow: 'var(--kangur-button-success-shadow)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--kangur-text-field-background)',
    border: '1px solid var(--kangur-text-field-border)',
    borderRadius: 'var(--kangur-input-radius, 22px)',
    height: '34px',
    fontSize: 11,
    color: 'var(--kangur-text-field-placeholder)',
    padding: '0 12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  const glassStyle: React.CSSProperties = {
    background: 'var(--kangur-glass-panel-background)',
    border: '1px solid var(--kangur-glass-panel-border)',
    boxShadow: 'var(--kangur-glass-panel-shadow)',
    borderRadius: 'var(--kangur-panel-radius-soft, 16px)',
    padding: '10px 12px',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: 'var(--kangur-page-muted-text)',
    marginBottom: 5,
  };

  const SectionToggle = ({ label, section }: { label: string; section: PreviewSection }) => (
    <button
      type='button'
      onClick={() => toggle(section)}
      aria-expanded={!collapsed.has(section)}
      className='rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background'
      style={{
        ...sectionLabelStyle,
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: collapsed.has(section) ? 0 : 5,
        padding: 0,
        border: 'none',
        background: 'transparent',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 8, opacity: 0.6 }}>{collapsed.has(section) ? '\u25b6' : '\u25bc'}</span>
      {label}
    </button>
  );

  return (
    <div className='overflow-hidden rounded-2xl border border-border/60 shadow-md'>
      {/* mode toggle header */}
      <div className='flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5'>
        <div className='flex flex-wrap rounded-full border border-border/60 bg-background/60 p-0.5'>
          {PREVIEW_TARGET_ORDER.map((target) => (
            <button
              key={target}
              type='button'
              onClick={() => setPreviewTarget(target)}
              aria-pressed={previewTarget === target}
              aria-label={PREVIEW_TARGET_LABELS[target]}
              className={[
                'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 ring-offset-background',
                previewTarget === target
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {PREVIEW_TARGET_LABELS[target]}
            </button>
          ))}
        </div>
      </div>

      {/* preview scene */}
      <div style={sceneStyle} className='space-y-2 p-3' role='group' aria-label='Theme preview'>

        {/* ════════════ PAGE: Logo + Nav + Heading ════════════ */}
        <SectionToggle label='Page & Navigation' section='page' />
        {!collapsed.has('page') && (
          <>
            {/* Logo wordmark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--kangur-logo-ring-start) 0%, var(--kangur-logo-ring-end) 100%)',
                  boxShadow: '0 2px 6px var(--kangur-logo-shadow, rgba(0,0,0,.12))',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {/* inner highlight */}
                <div style={{
                  position: 'absolute',
                  inset: 3,
                  borderRadius: '50%',
                  background: 'linear-gradient(180deg, var(--kangur-logo-inner-start) 0%, var(--kangur-logo-inner-end) 100%)',
                }} />
              </div>
              <span
                style={{
                  fontFamily: 'var(--kangur-font-heading, sans-serif)',
                  fontWeight: 800,
                  fontSize: 15,
                  background: 'linear-gradient(90deg, var(--kangur-logo-word-start) 0%, var(--kangur-logo-word-mid) 50%, var(--kangur-logo-word-end) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Kangur
              </span>
              <div style={{ flex: 1 }} />
              {/* Accent dot */}
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--kangur-logo-accent-start), var(--kangur-logo-accent-end))',
              }} />
            </div>

            {/* Nav bar */}
            <div style={navStyle}>
              {['Kursy', 'Wyniki', 'Profil'].map((label, i) => (
                <span
                  key={label}
                  style={
                    i === 0
                      ? pillActive
                      : label === 'Wyniki'
                        ? {
                          ...pillBase,
                          background: 'var(--kangur-nav-item-hover-background, transparent)',
                          color: 'var(--kangur-nav-item-hover-text, var(--kangur-nav-item-text))',
                          border: '1px solid var(--kangur-nav-item-hover-border, transparent)',
                        }
                        : pillInactive
                  }
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Page heading + subtext */}
            <div style={{ padding: '2px 0' }}>
              <div
                style={{
                  fontFamily: 'var(--kangur-font-heading, sans-serif)',
                  fontWeight: 700,
                  fontSize: 15,
                  lineHeight: 'var(--kangur-font-heading-line-height, 1.2)',
                  color: 'var(--kangur-page-text)',
                  margin: '2px 0 1px',
                }}
              >
                Alphabet — 6 lat
              </div>
              <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 10, margin: 0, lineHeight: 1.4 }}>
                Litery, sylaby i pierwsze słowa.
              </p>
            </div>

            {/* Home action cards */}
            <div style={{ display: 'flex', gap: 4 }}>
              {HOME_ACTIONS.map((a) => (
                <HomeActionCard key={a.id} actionId={a.id} label={a.label} emoji={a.emoji} />
              ))}
            </div>
          </>
        )}

        {/* ════════════ BUTTONS ════════════ */}
        <SectionToggle label='Buttons' section='buttons' />
        {!collapsed.has('buttons') && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={btnPrimary}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Primary</span></span>
              <span style={btnPrimaryHover}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Hover</span></span>
              <span style={btnSecondary}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Secondary</span></span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={btnSurface}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Surface</span></span>
              <span style={btnWarning}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Warning</span></span>
              <span style={btnSuccess}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Success</span></span>
            </div>
          </div>
        )}

        {/* ════════════ CARDS & INPUTS ════════════ */}
        <SectionToggle label='Cards & Inputs' section='cards' />
        {!collapsed.has('cards') && (
          <>
            {/* Lesson card */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: 'var(--kangur-gradient-icon-tile-radius-md, 8px)',
                  background: 'linear-gradient(135deg, var(--kangur-accent-indigo-start) 0%, var(--kangur-accent-indigo-end) 100%)',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>Lekcja 3 — Ułamki</p>
                  <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 9, margin: 0 }}>12 ćwiczeń · 45 min</p>
                </div>
              </div>
              {/* progress bar */}
              <div style={{ height: 4, borderRadius: 99, background: 'var(--kangur-progress-track, rgba(128,128,128,.15))', marginBottom: 6 }}>
                <div style={{ width: '68%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--kangur-accent-indigo-start) 0%, var(--kangur-accent-violet-end) 100%)' }} />
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ ...btnPrimary, fontSize: 10, padding: '4px 10px' }}>
                  <ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Kontynuuj</span>
                </span>
                <span style={{ ...btnSecondary, fontSize: 10, padding: '4px 10px' }}>
                  <ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Wyniki</span>
                </span>
              </div>
            </div>

            {/* Input */}
            <input readOnly tabIndex={-1} placeholder='Wyszukaj ćwiczenie…' style={inputStyle} aria-label='preview input' />

            {/* Glass panel */}
            <div style={glassStyle}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--kangur-accent-emerald-start) 0%, var(--kangur-accent-emerald-end) 100%)',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, margin: 0 }}>Anna Kowalska</p>
                  <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 9, margin: 0 }}>Postęp: 74% · #12 w klasie</p>
                </div>
              </div>
            </div>

            {/* Avatar + stats card */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--kangur-accent-violet-start) 0%, var(--kangur-accent-violet-end) 100%)',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, margin: 0 }}>Jan Nowak</p>
                <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 9, margin: 0 }}>1 240 pkt</p>
              </div>
              <span style={{ ...btnPrimary, fontSize: 9, padding: '3px 8px' }}>
                <ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>Profil</span>
              </span>
            </div>

            {/* Dropdown */}
            <div
              style={{
                background: 'var(--kangur-soft-card-background)',
                border: '1px solid var(--kangur-soft-card-border)',
                borderRadius: 'var(--kangur-card-radius, 12px)',
                boxShadow: 'var(--kangur-soft-card-shadow)',
                overflow: 'hidden',
              }}
            >
              {['Ułamki zwykłe', 'Ułamki dziesiętne', 'Procenty'].map((item, i) => (
                <div
                  key={item}
                  style={{
                    padding: '5px 10px',
                    fontSize: 10,
                    cursor: 'default',
                    background: i === 0 ? 'var(--kangur-nav-item-active-background)' : 'transparent',
                    color: i === 0 ? 'var(--kangur-nav-item-active-text)' : 'var(--kangur-page-text)',
                    borderBottom: i < 2 ? '1px solid var(--kangur-soft-card-border)' : 'none',
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ════════════ COLORS & GRADIENTS ════════════ */}
        <SectionToggle label='Colors & Gradients' section='colors' />
        {!collapsed.has('colors') && (
          <>
            {/* Accent gradients */}
            <div style={sectionLabelStyle}>Accent Gradients</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, marginBottom: 6 }}>
              {([
                ['Indigo', '--kangur-accent-indigo-start', '--kangur-accent-indigo-end'],
                ['Violet', '--kangur-accent-violet-start', '--kangur-accent-violet-end'],
                ['Emerald', '--kangur-accent-emerald-start', '--kangur-accent-emerald-end'],
                ['Sky', '--kangur-accent-sky-start', '--kangur-accent-sky-end'],
                ['Amber', '--kangur-accent-amber-start', '--kangur-accent-amber-end'],
                ['Rose', '--kangur-accent-rose-start', '--kangur-accent-rose-end'],
                ['Teal', '--kangur-accent-teal-start', '--kangur-accent-teal-end'],
                ['Slate', '--kangur-accent-slate-start', '--kangur-accent-slate-end'],
              ] as const).map(([name, start, end]) => (
                <div key={name} style={{ textAlign: 'center' }}>
                  <div
                    title={name}
                    style={{
                      height: 16,
                      borderRadius: 4,
                      background: `linear-gradient(135deg, var(${start}) 0%, var(${end}) 100%)`,
                      border: '1px solid var(--kangur-soft-card-border)',
                      marginBottom: 1,
                    }}
                  />
                  <span style={{ fontSize: 7, color: 'var(--kangur-page-muted-text)' }}>{name}</span>
                </div>
              ))}
            </div>

            {/* Logo palette */}
            <div style={sectionLabelStyle}>Logo Palette</div>
            <div style={{ display: 'flex', gap: 3, marginBottom: 6 }}>
              {([
                ['Word\nStart', '--kangur-logo-word-start'],
                ['Word\nMid', '--kangur-logo-word-mid'],
                ['Word\nEnd', '--kangur-logo-word-end'],
                ['Ring\nStart', '--kangur-logo-ring-start'],
                ['Ring\nEnd', '--kangur-logo-ring-end'],
                ['Accent\nStart', '--kangur-logo-accent-start'],
                ['Accent\nEnd', '--kangur-logo-accent-end'],
              ] as const).map(([name, v]) => (
                <div key={name} style={{ textAlign: 'center', flex: '1 1 0' }}>
                  <div
                    title={name}
                    style={{
                      height: 16,
                      borderRadius: 4,
                      background: `var(${v})`,
                      border: '1px solid var(--kangur-soft-card-border)',
                      marginBottom: 1,
                    }}
                  />
                  <span style={{ fontSize: 6, color: 'var(--kangur-page-muted-text)', lineHeight: 1.1, display: 'block' }}>
                    {name.replace('\n', ' ')}
                  </span>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div style={sectionLabelStyle}>Badges</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {([
                ['Nowe', 'indigo'],
                ['-20%', 'amber'],
                ['Done', 'emerald'],
                ['Ważne', 'rose'],
                ['Info', 'sky'],
                ['VIP', 'violet'],
              ] as const).map(([text, gradient]) => (
                <span
                  key={text}
                  style={{
                    display: 'inline-block',
                    padding: '2px 6px',
                    borderRadius: 99,
                    fontSize: 8,
                    fontWeight: 600,
                    background: `linear-gradient(135deg, var(--kangur-accent-${gradient}-start), var(--kangur-accent-${gradient}-end))`,
                    color: '#fff',
                  }}
                >
                  {text}
                </span>
              ))}
            </div>
          </>
        )}

        {/* ════════════ CHAT ════════════ */}
        <SectionToggle label='Chat' section='chat' />
        {!collapsed.has('chat') && (
          <div
            style={{
              background: 'var(--kangur-chat-panel-background)',
              border: '1px solid var(--kangur-chat-panel-border)',
              borderRadius: 'var(--kangur-chat-panel-radius-compact, 14px)',
              boxShadow: 'var(--kangur-chat-panel-shadow)',
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {/* Header */}
            <div style={{
              background: 'var(--kangur-chat-header-background)',
              border: '1px solid var(--kangur-chat-header-border, transparent)',
              borderRadius: 'var(--kangur-chat-inset-radius, 10px)',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--kangur-chat-panel-text)',
            }}>
              <div style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'var(--kangur-chat-avatar-shell-background)',
                border: '1px solid var(--kangur-chat-avatar-shell-border)',
                flexShrink: 0,
              }} />
              Asystent AI
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 8, color: 'var(--kangur-chat-muted-text)', fontWeight: 400 }}>online</span>
            </div>

            {/* AI bubble */}
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
              <div style={{
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: 'var(--kangur-chat-avatar-shell-background)',
                border: '1px solid var(--kangur-chat-avatar-shell-border)',
                boxShadow: 'var(--kangur-chat-avatar-shell-shadow, none)',
                flexShrink: 0,
              }} />
              <div style={{
                background: 'var(--kangur-chat-surface-soft-background)',
                border: '1px solid var(--kangur-chat-surface-soft-border)',
                boxShadow: 'var(--kangur-chat-surface-soft-shadow, none)',
                borderRadius: 'var(--kangur-chat-bubble-radius, 14px)',
                padding: '4px 8px',
                fontSize: 9,
                color: 'var(--kangur-chat-panel-text)',
                maxWidth: '82%',
              }}>
                Cześć! W czym mogę Ci dzisiaj pomóc?
              </div>
            </div>

            {/* Info surface */}
            <div style={{
              background: 'var(--kangur-chat-surface-info-background)',
              border: '1px solid var(--kangur-chat-surface-info-border)',
              boxShadow: 'var(--kangur-chat-surface-info-shadow, none)',
              borderRadius: 'var(--kangur-chat-inset-radius, 10px)',
              padding: '4px 8px',
              fontSize: 8,
              color: 'var(--kangur-chat-panel-text)',
              marginLeft: 21,
            }}>
              Podpowiedź: zapytaj o ułamki
            </div>

            {/* User bubble */}
            <div style={{
              alignSelf: 'flex-end',
              background: 'var(--kangur-button-primary-background)',
              color: 'var(--kangur-button-primary-text, #fff)',
              borderRadius: 'var(--kangur-chat-bubble-radius, 14px)',
              padding: '4px 8px',
              fontSize: 9,
              maxWidth: '75%',
            }}>
              Wyjaśnij mi ułamki dziesiętne
            </div>

            {/* Success surface */}
            <div style={{
              background: 'var(--kangur-chat-surface-success-background)',
              border: '1px solid var(--kangur-chat-surface-success-border)',
              borderRadius: 'var(--kangur-chat-inset-radius, 10px)',
              padding: '4px 8px',
              fontSize: 8,
              color: 'var(--kangur-chat-panel-text)',
              marginLeft: 21,
            }}>
              Odpowiedź wygenerowana pomyślnie
            </div>

            {/* Chips */}
            <div style={{ display: 'flex', gap: 3, marginLeft: 21 }}>
              {['Więcej', 'Quiz'].map((chip) => (
                <span key={chip} style={{
                  background: 'var(--kangur-chat-chip-background)',
                  border: '1px solid var(--kangur-chat-chip-border)',
                  color: 'var(--kangur-chat-chip-text)',
                  borderRadius: 99,
                  padding: '2px 6px',
                  fontSize: 8,
                  fontWeight: 500,
                }}>
                  {chip}
                </span>
              ))}
            </div>

            {/* Composer */}
            <div style={{
              background: 'var(--kangur-chat-composer-background, var(--kangur-text-field-background))',
              border: '1px solid var(--kangur-text-field-border)',
              borderRadius: 'var(--kangur-input-radius, 16px)',
              height: 24,
              padding: '0 8px',
              display: 'flex',
              alignItems: 'center',
              fontSize: 9,
              color: 'var(--kangur-text-field-placeholder)',
            }}>
              Napisz wiadomość…
            </div>
          </div>
        )}

        {/* ════════════ COMPONENTS ════════════ */}
        <SectionToggle label='Components' section='components' />
        {!collapsed.has('components') && (
          <>
            {/* Panels side by side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <div style={{
                background: 'var(--kangur-glass-panel-background)',
                border: '1px solid var(--kangur-glass-panel-border)',
                boxShadow: 'var(--kangur-glass-panel-shadow)',
                borderRadius: 'var(--kangur-panel-radius-elevated, 20px)',
                padding: '8px',
              }}>
                <div style={{ ...sectionLabelStyle, marginBottom: 3 }}>Elevated</div>
                <div style={{ height: 4, borderRadius: 99, background: 'var(--kangur-progress-track)', marginBottom: 4 }}>
                  <div style={{ width: '45%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--kangur-accent-emerald-start), var(--kangur-accent-emerald-end))' }} />
                </div>
                <span style={{ fontSize: 8, color: 'var(--kangur-page-muted-text)' }}>45%</span>
              </div>
              <div style={{
                background: 'var(--kangur-soft-card-background)',
                border: '1px solid var(--kangur-soft-card-border)',
                boxShadow: 'var(--kangur-soft-card-shadow)',
                borderRadius: 'var(--kangur-panel-radius-subtle, 12px)',
                padding: '8px',
              }}>
                <div style={{ ...sectionLabelStyle, marginBottom: 3 }}>Subtle</div>
                <div style={{ height: 4, borderRadius: 99, background: 'var(--kangur-progress-track)', marginBottom: 4 }}>
                  <div style={{ width: '82%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--kangur-accent-sky-start), var(--kangur-accent-sky-end))' }} />
                </div>
                <span style={{ fontSize: 8, color: 'var(--kangur-page-muted-text)' }}>82%</span>
              </div>
            </div>

            {/* Segmented control */}
            <div style={{
              display: 'flex',
              background: 'var(--kangur-nav-group-background)',
              border: '1px solid var(--kangur-nav-group-border)',
              borderRadius: 'var(--kangur-segmented-control-radius, var(--kangur-nav-group-radius, 12px))',
              padding: 3,
              gap: 2,
            }}>
              {['Dzień', 'Tydzień', 'Miesiąc'].map((label, i) => (
                <div key={label} style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '4px 0',
                  borderRadius: 'var(--kangur-segmented-item-radius, var(--kangur-nav-item-radius, 8px))',
                  background: i === 0 ? 'var(--kangur-nav-item-active-background)' : 'transparent',
                  color: i === 0 ? 'var(--kangur-nav-item-active-text)' : 'var(--kangur-nav-item-text)',
                  cursor: 'default',
                }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Disabled input */}
            <div style={{
              width: '100%',
              background: 'var(--kangur-text-field-disabled-background, var(--kangur-text-field-background))',
              border: '1px solid var(--kangur-text-field-disabled-border, var(--kangur-text-field-border))',
              borderRadius: 'var(--kangur-input-radius, 22px)',
              height: '30px',
              fontSize: 10,
              color: 'var(--kangur-text-field-placeholder)',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              opacity: 0.6,
              boxSizing: 'border-box',
            }}>
              Pole wyłączone
            </div>

            {/* Control row */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
              {(['primary', 'warning', 'success'] as const).map((variant) => (
                <div
                  key={variant}
                  style={{
                    background: 'var(--kangur-chat-control-background)',
                    border: '1px solid var(--kangur-chat-control-border)',
                    color: 'var(--kangur-chat-control-text)',
                    borderRadius: 6,
                    padding: '3px 7px',
                    fontSize: 8,
                    fontWeight: 500,
                  }}
                >
                  Control
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
