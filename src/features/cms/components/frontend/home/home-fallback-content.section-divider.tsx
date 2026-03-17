import React from 'react';

export function SectionDivider({ label }: { label: string }): React.JSX.Element {
  const lineStyle: React.CSSProperties = {
    background: 'color-mix(in srgb, var(--cms-appearance-page-border) 40%, transparent)',
  };
  return (
    <div className='w-full py-5'>
      <div className='container px-4 md:px-6'>
        <div className='flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--cms-appearance-muted-text)]'>
          <span className='h-px flex-1' style={lineStyle} aria-hidden='true' />
          <span className='rounded-full border border-[var(--cms-appearance-page-border)] px-3 py-1'>
            {label}
          </span>
          <span className='h-px flex-1' style={lineStyle} aria-hidden='true' />
        </div>
      </div>
    </div>
  );
}
