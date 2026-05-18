'use client';

import React from 'react';

export type PipelineAlertTone = 'neutral' | 'warning' | 'success' | 'error';

const ALERT_CLASS_BY_TONE = {
  neutral: 'rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs text-muted-foreground',
  warning: 'rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-200',
  success: 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200',
  error: 'rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive',
} as const satisfies Record<PipelineAlertTone, string>;

export function PipelineAlertBox({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: PipelineAlertTone;
}): React.JSX.Element {
  return <div className={ALERT_CLASS_BY_TONE[tone]}>{children}</div>;
}
