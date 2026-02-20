import React from 'react';

export type ImageStudioAnalysisSummaryChipData = {
  detectionUsed: string;
  confidence: number;
  fallbackApplied: boolean;
  policyReason: string;
  policyVersion: string;
};

type ImageStudioAnalysisSummaryChipProps = {
  data: ImageStudioAnalysisSummaryChipData;
  stale?: boolean;
  label?: string;
  className?: string;
};

const formatConfidencePercent = (value: number): string => {
  const clamped = Math.max(0, Math.min(1, value));
  return `${(clamped * 100).toFixed(1)}%`;
};

export function ImageStudioAnalysisSummaryChip({
  data,
  stale = false,
  label = 'Analysis',
  className = '',
}: ImageStudioAnalysisSummaryChipProps): React.JSX.Element {
  const lowConfidence = data.fallbackApplied || data.confidence < 0.35;
  const toneClassName = stale
    ? 'border-rose-500/40 bg-rose-500/10 text-rose-100'
    : lowConfidence
      ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
  const resolvedClassName = className.trim();

  return (
    <div className={`rounded border px-2 py-1 text-[10px] ${toneClassName}${resolvedClassName ? ` ${resolvedClassName}` : ''}`}>
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
        <span className='uppercase tracking-wide text-[9px] opacity-80'>{label}</span>
        <span>{data.detectionUsed}</span>
        <span>Confidence {formatConfidencePercent(data.confidence)}</span>
        <span>{data.fallbackApplied ? 'Fallback yes' : 'Fallback no'}</span>
        <span>{data.policyVersion}</span>
      </div>
      <div className='mt-0.5 truncate opacity-90'>
        {stale ? `Stale: ${data.policyReason}` : data.policyReason}
      </div>
    </div>
  );
}

