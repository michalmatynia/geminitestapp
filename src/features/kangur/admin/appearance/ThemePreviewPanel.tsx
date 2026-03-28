'use client';

import React, { useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import { resolveKangurStorefrontAppearance } from '@/features/cms/public';
import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  AppearanceSlot,
  SLOT_CONFIG,
  SLOT_ORDER,
  ThemeSelectionId,
} from './AppearancePage.constants';
import {
  getAppearancePreviewCopy,
  resolveAppearanceAdminLocale,
  type AppearancePreviewSection,
} from './appearance.copy';
import { getPreviewStyles } from './preview-panel/ThemePreviewPanel.styles';
import { ButtonGloss, HomeActionCard } from './preview-panel/ThemePreviewPanel.components';

type PreviewTarget = 'current' | AppearanceSlot;

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
  const locale = resolveAppearanceAdminLocale(useLocale());
  const copy = getAppearancePreviewCopy(locale);
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget>('current');
  const [collapsed, setCollapsed] = useState<Set<AppearancePreviewSection>>(new Set());

  const toggle = (section: AppearancePreviewSection) =>
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

  const {
    navStyle,
    pillBase,
    pillActive,
    pillInactive,
    cardStyle,
    btnPrimary,
    btnPrimaryHover,
    btnSecondary,
    btnSurface,
    btnWarning,
    btnSuccess,
    inputStyle,
    glassStyle,
    sectionLabelStyle,
  } = getPreviewStyles();

  const sceneStyle: React.CSSProperties = {
    ...(appearance.vars as React.CSSProperties),
    background: appearance.background,
    fontFamily: 'var(--kangur-font-body, sans-serif)',
    fontSize: 'var(--kangur-font-base-size, 16px)',
    lineHeight: 'var(--kangur-font-line-height, 1.5)',
    color: 'var(--kangur-page-text, #333)',
  };

  const SectionToggle = ({
    label,
    section,
  }: {
    label: string;
    section: AppearancePreviewSection;
  }) => (
    <button
      type='button'
      onClick={() => toggle(section)}
      aria-expanded={!collapsed.has(section)}
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
      <div className='flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5'>
        <div className='flex flex-wrap rounded-full border border-border/60 bg-background/60 p-0.5'>
          {PREVIEW_TARGET_ORDER.map((target) => (
            <button
              key={target}
              type='button'
              onClick={() => setPreviewTarget(target)}
              aria-pressed={previewTarget === target}
              className={[
                'rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors',
                previewTarget === target ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {copy.targetLabels[target]}
            </button>
          ))}
        </div>
      </div>

      <div style={sceneStyle} className='space-y-2 p-3'>
        <SectionToggle label={copy.sectionLabels.page} section='page' />
        {!collapsed.has('page') && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg, var(--kangur-logo-ring-start) 0%, var(--kangur-logo-ring-end) 100%)', boxShadow: '0 2px 6px var(--kangur-logo-shadow, rgba(0,0,0,.12))', flexShrink: 0, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'linear-gradient(180deg, var(--kangur-logo-inner-start) 0%, var(--kangur-logo-inner-end) 100%)' }} />
              </div>
              <span style={{ fontFamily: 'var(--kangur-font-heading, sans-serif)', fontWeight: 800, fontSize: 15, background: 'linear-gradient(90deg, var(--kangur-logo-word-start) 0%, var(--kangur-logo-word-mid) 50%, var(--kangur-logo-word-end) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kangur</span>
              <div style={{ flex: 1 }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, var(--kangur-logo-accent-start), var(--kangur-logo-accent-end))' }} />
            </div>

            <div style={navStyle}>
              {copy.navItems.map((label: string, i: number) => (
                <span key={label} style={i === 0 ? pillActive : label === copy.navItems[1] ? { ...pillBase, background: 'var(--kangur-nav-item-hover-background, transparent)', color: 'var(--kangur-nav-item-hover-text, var(--kangur-nav-item-text))', border: '1px solid var(--kangur-nav-item-hover-border, transparent)' } : pillInactive}>{label}</span>
              ))}
            </div>

            <div style={{ padding: '2px 0' }}>
              <div style={{ fontFamily: 'var(--kangur-font-heading, sans-serif)', fontWeight: 700, fontSize: 15, lineHeight: 'var(--kangur-font-heading-line-height, 1.2)', color: 'var(--kangur-page-text)', margin: '2px 0 1px' }}>{copy.pageHeading}</div>
              <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{copy.pageSubtext}</p>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {copy.homeActions.map((a: (typeof copy.homeActions)[number]) => (
                <HomeActionCard key={a.id} actionId={a.id} label={a.label} emoji={a.emoji} />
              ))}
            </div>
          </>
        )}

        <SectionToggle label={copy.sectionLabels.buttons} section='buttons' />
        {!collapsed.has('buttons') && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={btnPrimary}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.buttonLabels.primary}</span></span>
              <span style={btnPrimaryHover}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.buttonLabels.hover}</span></span>
              <span style={btnSecondary}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.buttonLabels.secondary}</span></span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <span style={btnSurface}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.buttonLabels.surface}</span></span>
              <span style={btnWarning}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.buttonLabels.warning}</span></span>
              <span style={btnSuccess}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.buttonLabels.success}</span></span>
            </div>
          </div>
        )}

        <SectionToggle label={copy.sectionLabels.cards} section='cards' />
        {!collapsed.has('cards') && (
          <>
            <div style={cardStyle}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 'var(--kangur-gradient-icon-tile-radius-md, 8px)', background: 'linear-gradient(135deg, var(--kangur-accent-indigo-start) 0%, var(--kangur-accent-indigo-end) 100%)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 12, margin: 0 }}>{copy.lessonTitle}</p>
                  <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 9, margin: 0 }}>{copy.lessonMeta}</p>
                </div>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: 'var(--kangur-progress-track, rgba(128,128,128,.15))', marginBottom: 6 }}>
                <div style={{ width: '68%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, var(--kangur-accent-indigo-start) 0%, var(--kangur-accent-violet-end) 100%)' }} />
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                <span style={{ ...btnPrimary, fontSize: 10, padding: '4px 10px' }}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.continueLabel}</span></span>
                <span style={{ ...btnSecondary, fontSize: 10, padding: '4px 10px' }}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.resultsLabel}</span></span>
              </div>
            </div>

            <input readOnly tabIndex={-1} placeholder={copy.searchPlaceholder} style={inputStyle} />

            <div style={glassStyle}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--kangur-accent-emerald-start) 0%, var(--kangur-accent-emerald-end) 100%)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, margin: 0 }}>{copy.studentOneName}</p>
                  <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 9, margin: 0 }}>{copy.studentOneMeta}</p>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--kangur-accent-violet-start) 0%, var(--kangur-accent-violet-end) 100%)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, margin: 0 }}>{copy.studentTwoName}</p>
                <p style={{ color: 'var(--kangur-page-muted-text)', fontSize: 9, margin: 0 }}>{copy.studentTwoMeta}</p>
              </div>
              <span style={{ ...btnPrimary, fontSize: 9, padding: '3px 8px' }}><ButtonGloss /><span style={{ position: 'relative', zIndex: 2 }}>{copy.profileLabel}</span></span>
            </div>

            <div style={{ background: 'var(--kangur-soft-card-background)', border: '1px solid var(--kangur-soft-card-border)', borderRadius: 'var(--kangur-card-radius, 12px)', boxShadow: 'var(--kangur-soft-card-shadow)', overflow: 'hidden' }}>
              {copy.dropdownItems.map((item: string, i: number) => (
                <div key={item} style={{ padding: '5px 10px', fontSize: 10, cursor: 'default', background: i === 0 ? 'var(--kangur-nav-item-active-background)' : 'transparent', color: i === 0 ? 'var(--kangur-nav-item-active-text)' : 'var(--kangur-page-text)', borderBottom: i < 2 ? '1px solid var(--kangur-soft-card-border)' : 'none' }}>{item}</div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
