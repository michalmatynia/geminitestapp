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
    return SLOT_CONFIG[directSlot].label.toLowerCase() as any; // Map to mode
  }
  const assignedSlot = assignments
    ? SLOT_ORDER.find((slot) => assignments[slot]?.id === id)
    : null;
  
  if (assignedSlot) {
    if (assignedSlot === 'daily') return 'default';
    return assignedSlot as any;
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
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget>('current');
  
  const previewSelection = useMemo(() => {
    if (previewTarget === 'current') {
      const mode = resolvePreviewModeForSelection(selectedId, slotAssignments);
      return {
        theme: draft,
        mode: (mode === 'daily' ? 'default' : mode) as any,
      };
    }
    const config = SLOT_CONFIG[previewTarget];
    const mode = previewTarget === 'daily' ? 'default' : previewTarget;
    return {
      theme: slotThemes[previewTarget],
      mode: mode as any,
    };
  }, [draft, previewTarget, selectedId, slotAssignments, slotThemes]);

  const appearance = useMemo(
    () => resolveKangurStorefrontAppearance(previewSelection.mode, previewSelection.theme),
    [previewSelection.mode, previewSelection.theme]
  );
  
  const previewTheme = previewSelection.theme;

  const sceneStyle: React.CSSProperties = {
    ...(appearance.vars as React.CSSProperties),
    background: appearance.background,
  };

  const navStyle: React.CSSProperties = {
    background: 'var(--kangur-nav-group-background)',
    border: '1px solid var(--kangur-nav-group-border)',
    borderRadius: 'var(--kangur-nav-group-radius)',
    padding: '6px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  const pillBase: React.CSSProperties = {
    borderRadius: 'var(--kangur-nav-item-radius)',
    paddingTop: 'var(--kangur-pill-padding-y, 10px)',
    paddingBottom: 'var(--kangur-pill-padding-y, 10px)',
    paddingLeft: 'var(--kangur-pill-padding-x, 16px)',
    paddingRight: 'var(--kangur-pill-padding-x, 16px)',
    fontSize: 'var(--kangur-pill-font-size, 14px)',
    cursor: 'default',
    whiteSpace: 'nowrap' as const,
  };

  const pillActive: React.CSSProperties = {
    ...pillBase,
    background: 'var(--kangur-nav-item-active-background)',
    color: 'var(--kangur-nav-item-active-text)',
  };

  const pillInactive: React.CSSProperties = {
    ...pillBase,
    background: 'transparent',
    color: 'var(--kangur-nav-item-text)',
  };

  const cardStyle: React.CSSProperties = {
    background: 'var(--kangur-soft-card-background)',
    border: '1px solid var(--kangur-soft-card-border)',
    borderRadius: 'var(--kangur-card-radius)',
    padding: 'var(--kangur-card-padding-md, 16px)',
    boxShadow: 'var(--kangur-soft-card-shadow)',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'var(--kangur-button-primary-background)',
    color: previewTheme.btnPrimaryText || '#ffffff',
    borderRadius: 'var(--kangur-button-radius, 999px)',
    paddingTop: 'var(--kangur-button-padding-y, 10px)',
    paddingBottom: 'var(--kangur-button-padding-y, 10px)',
    paddingLeft: 'var(--kangur-button-padding-x, 20px)',
    paddingRight: 'var(--kangur-button-padding-x, 20px)',
    fontSize: 'var(--kangur-button-font-size, 14px)',
    boxShadow: 'var(--kangur-button-primary-shadow)',
    textShadow: 'var(--kangur-button-text-shadow)',
    border: 'none',
    cursor: 'default',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const btnSecondary: React.CSSProperties = {
    background: 'var(--kangur-button-secondary-background)',
    color: 'var(--kangur-button-secondary-text)',
    borderRadius: 'var(--kangur-button-radius, 999px)',
    paddingTop: 'var(--kangur-button-padding-y, 10px)',
    paddingBottom: 'var(--kangur-button-padding-y, 10px)',
    paddingLeft: 'var(--kangur-button-padding-x, 20px)',
    paddingRight: 'var(--kangur-button-padding-x, 20px)',
    fontSize: 'var(--kangur-button-font-size, 14px)',
    boxShadow: 'var(--kangur-button-secondary-shadow)',
    textShadow: 'var(--kangur-button-text-shadow)',
    border: 'none',
    cursor: 'default',
    display: 'inline-block',
    whiteSpace: 'nowrap' as const,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--kangur-text-field-background)',
    border: '1px solid var(--kangur-text-field-border)',
    borderRadius: 'var(--kangur-input-radius, 22px)',
    height: 'var(--kangur-input-height, 50px)',
    fontSize: 'var(--kangur-input-font-size, 14px)',
    color: 'var(--kangur-text-field-placeholder)',
    padding: '0 16px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  };

  return (
    <div className='overflow-hidden rounded-2xl border border-border/60 shadow-md'>
      {/* mode toggle header */}
      <div className='flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2'>
        <div className='flex rounded-full border border-border/60 bg-background/60 p-0.5'>
          {PREVIEW_TARGET_ORDER.map((target) => (
            <button
              key={target}
              type='button'
              onClick={() => setPreviewTarget(target)}
              className={[
                'rounded-full px-3 py-0.5 text-xs font-medium transition-colors',
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
      <div style={sceneStyle} className='space-y-3 p-4' role='img' aria-label='Theme preview'>
        {/* nav bar */}
        <div style={navStyle}>
          <span
            style={{
              color: 'var(--kangur-page-text)',
              fontWeight: 700,
              fontSize: 14,
              marginRight: 6,
              whiteSpace: 'nowrap',
            }}
          >
            Kangur
          </span>
          {['Kursy', 'Testy', 'Wyniki'].map((label, i) => (
            <span key={label} style={i === 0 ? pillActive : pillInactive}>
              {label}
            </span>
          ))}
        </div>

        {/* card */}
        <div style={cardStyle}>
          <h3
            style={{
              color: 'var(--kangur-soft-card-text)',
              fontWeight: 600,
              fontSize: 15,
              marginBottom: 6,
            }}
          >
            Matematyka — klasa 4
          </h3>
          <p
            style={{
              color: 'var(--kangur-page-muted-text)',
              fontSize: 13,
              marginBottom: 14,
              lineHeight: 1.5,
            }}
          >
            Ułamki i działania na ułamkach.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={btnPrimary}>Zacznij naukę</span>
            <span style={btnSecondary}>Wyniki</span>
          </div>
        </div>

        {/* input */}
        <input
          readOnly
          tabIndex={-1}
          placeholder='Wyszukaj ćwiczenie…'
          style={inputStyle}
          aria-label='preview input'
        />

        {/* second card – lighter content card */}
        <div
          style={{
            ...cardStyle,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--kangur-button-primary-background)',
              flexShrink: 0,
            }}
          />
          <div>
            <p
              style={{
                color: 'var(--kangur-soft-card-text)',
                fontSize: 13,
                fontWeight: 600,
                margin: 0,
              }}
            >
              Anna Kowalska
            </p>
            <p
              style={{
                color: 'var(--kangur-page-muted-text)',
                fontSize: 11,
                margin: 0,
              }}
            >
              Postęp: 74%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
