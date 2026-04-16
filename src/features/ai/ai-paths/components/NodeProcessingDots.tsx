import React from 'react';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NodeProcessingDotsProps {
  /** Whether the node is actively processing (show dots). */
  active: boolean;
}

/**
 * Three small bouncing dots that indicate a node is actively processing data.
 *
 * Rendered inside blocker nodes (model, agent, poll, delay) while their status
 * is 'polling', 'queued', 'running', or 'pending'.
 */
export const NodeProcessingDots = React.memo(({
  active,
}: NodeProcessingDotsProps): React.JSX.Element | null => {
  if (!active) return null;

  return (
    <span className='inline-flex items-center gap-[3px] ml-1.5'>
      <span
        className='block h-[5px] w-[5px] rounded-full bg-sky-400'
        style={{ animation: 'ai-paths-dot-bounce 1.2s ease-in-out infinite', animationDelay: '0s' }}
      />
      <span
        className='block h-[5px] w-[5px] rounded-full bg-sky-400'
        style={{
          animation: 'ai-paths-dot-bounce 1.2s ease-in-out infinite',
          animationDelay: '0.2s',
        }}
      />
      <span
        className='block h-[5px] w-[5px] rounded-full bg-sky-400'
        style={{
          animation: 'ai-paths-dot-bounce 1.2s ease-in-out infinite',
          animationDelay: '0.4s',
        }}
      />
    </span>
  );
});
