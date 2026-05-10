import React from 'react';
'use client';

type ProbeClusterSectionProps = {
  resolvedClusters: Array<{
    clusterKey: string;
    label: string;
    sessionCount: number;
    suggestionCount: number;
  }>;
};

export const ProbeClusterSection = ({ resolvedClusters }: ProbeClusterSectionProps): React.ReactElement => (
  <>
    {resolvedClusters.map((cluster) => (
      <div
        key={cluster.clusterKey}
        className='space-y-2 rounded-lg border border-border bg-background/40 p-4'
      >
        <div className='flex flex-wrap items-center gap-2'>
          <h3 className='text-sm font-semibold'>{cluster.label}</h3>
          <span className='rounded border border-border px-2 py-0.5 text-xs'>
            {cluster.sessionCount} sessions
          </span>
          <span className='rounded border border-border px-2 py-0.5 text-xs'>
            {cluster.suggestionCount} suggestions
          </span>
        </div>
      </div>
    ))}
  </>
);
