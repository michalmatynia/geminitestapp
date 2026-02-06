'use client';

import React, { useEffect, useRef, useState, useId, useCallback } from 'react';
import { createPortal } from 'react-dom';

const INSPECTOR_TOOLTIP_DELAY_MS = 500;
const INSPECTOR_TOOLTIP_WIDTH = 260;
const INSPECTOR_TOOLTIP_GAP = 10;
const inspectorTooltipOrder: string[] = [];

const registerInspectorTooltip = (id: string): number => {
  const existingIndex = inspectorTooltipOrder.indexOf(id);
  if (existingIndex >= 0) return existingIndex;
  inspectorTooltipOrder.push(id);
  return inspectorTooltipOrder.length - 1;
};

const unregisterInspectorTooltip = (id: string): void => {
  const index = inspectorTooltipOrder.indexOf(id);
  if (index >= 0) inspectorTooltipOrder.splice(index, 1);
};

const getInspectorTooltipIndex = (id: string): number => inspectorTooltipOrder.indexOf(id);
export const STYLE_KEY_REGEX = /(color|padding|margin|radius|border|shadow|align|font|size|width|height|spacing|background|opacity)/i;

export const formatSettingValue = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return (value as unknown[]).map((item: unknown) => formatSettingValue(item)).join(', ');
  try {
    return JSON.stringify(value);
  } catch {
    return 'Object';
  }
};

export type InspectorEntry = { label: string; value: string };
export type InspectorSection = { title: string; entries: InspectorEntry[] };

export const resolveNodeLabel = (fallback: string, value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return fallback;
};

export const buildStyleEntries = (settings: Record<string, unknown>): InspectorEntry[] => {
  return Object.entries(settings)
    .filter(([key, value]: [string, unknown]) => STYLE_KEY_REGEX.test(key) && value !== undefined && value !== null && value !== '')
    .map(([key, value]: [string, unknown]) => ({
      label: key,
      value: formatSettingValue(value),
    }))
    .filter((entry: InspectorEntry) => entry.value.length > 0)
    .slice(0, 12);
};

export const renderInspectorEntries = (entries: InspectorEntry[]): React.ReactNode => (
  <div className="space-y-1">
    {entries.map((entry: InspectorEntry) => (
      <div key={`${entry.label}-${entry.value}`} className="flex items-start gap-2">
        <span className="min-w-[110px] text-[10px] uppercase tracking-wider text-gray-400">{entry.label}</span>
        <span className="text-[11px] text-gray-200 break-all">
          {entry.value.length > 80 ? `${entry.value.slice(0, 80)}…` : entry.value}
        </span>
      </div>
    ))}
  </div>
);

export const InspectorTooltip = ({
  title,
  sections,
}: {
  title: string;
  sections: InspectorSection[];
}): React.ReactNode => {
  const visibleSections = sections.filter((section: InspectorSection) => section.entries.length > 0);
  return (
    <div className="space-y-2 text-xs">
      <div className="text-[10px] uppercase tracking-wider text-blue-200">{title}</div>
      {visibleSections.length === 0 ? (
        <div className="text-[11px] text-gray-400">No inspector details</div>
      ) : (
        visibleSections.map((section: InspectorSection) => (
          <div key={section.title} className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">{section.title}</div>
            {renderInspectorEntries(section.entries)}
          </div>
        ))
      )}
    </div>
  );
};

export const InspectorHover = ({
  enabled,
  showTooltip = true,
  nodeId,
  onHover,
  fallbackNodeId,
  content,
  children,
  className,
}: {
  enabled: boolean;
  showTooltip?: boolean;
  nodeId: string;
  onHover?: ((nodeId: string | null) => void) | undefined;
  fallbackNodeId?: string | null;
  content?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}): React.ReactNode => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const reactId = useId();
  const tooltipId = `inspector-${reactId.replace(/:/g, '')}`;
  const isTooltipEnabled = enabled && showTooltip;
  const effectiveOpen = isTooltipEnabled ? open : false;

  const clearTimer = (): void => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const updateTooltipPosition = useCallback((): void => {
    const viewport = typeof document !== 'undefined'
      ? document.querySelector('[data-cms-canvas-viewport=\'true\']')
      : null;
    const canvas = typeof document !== 'undefined'
      ? document.querySelector('[data-cms-canvas=\'true\']')
      : null;
    const el = viewport ?? canvas ?? wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 12;
    const index = Math.max(0, getInspectorTooltipIndex(tooltipId));
    const offset = index * (INSPECTOR_TOOLTIP_WIDTH + INSPECTOR_TOOLTIP_GAP);
    const minRightEdge = margin + INSPECTOR_TOOLTIP_WIDTH;
    const rightEdge = rect.right - margin - offset;
    setTooltipPos({
      top: rect.bottom - margin,
      left: Math.max(minRightEdge, rightEdge),
    });
  }, [tooltipId]);

  useEffect((): void | (() => void) => {
    if (!isTooltipEnabled) {
      clearTimer();
      return undefined;
    }
    return (): void => {
      clearTimer();
    };
  }, [isTooltipEnabled]);

  const handleEnter = (): void => {
    if (!enabled) return;
    onHover?.(nodeId);
    clearTimer();
    if (showTooltip) {
      timerRef.current = window.setTimeout(() => {
        registerInspectorTooltip(tooltipId);
        updateTooltipPosition();
        setOpen(true);
      }, INSPECTOR_TOOLTIP_DELAY_MS);
    }
  };

  const handleLeave = (): void => {
    if (!enabled) return;
    onHover?.(fallbackNodeId ?? null);
    clearTimer();
    setOpen(false);
    unregisterInspectorTooltip(tooltipId);
  };

  useEffect((): void | (() => void) => {
    if (!open || !isTooltipEnabled) return undefined;
    const handleScroll = (): void => updateTooltipPosition();
    const handleResize = (): void => updateTooltipPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [open, isTooltipEnabled, updateTooltipPosition]);

  useEffect((): (() => void) => {
    return () => {
      unregisterInspectorTooltip(tooltipId);
    };
  }, [tooltipId]);

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className ?? ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
      {enabled && showTooltip && effectiveOpen && content && tooltipPos && typeof document !== 'undefined'
        ? createPortal(
          <div
            className="fixed z-[99999] -translate-x-full -translate-y-full rounded-md border border-gray-700 bg-gray-900/95 px-3 py-2 text-xs text-gray-200 shadow-lg pointer-events-none"
            style={{ left: tooltipPos.left, top: tooltipPos.top, width: INSPECTOR_TOOLTIP_WIDTH }}
          >
            {content}
          </div>,
          document.body
        )
        : null}
    </div>
  );
};
