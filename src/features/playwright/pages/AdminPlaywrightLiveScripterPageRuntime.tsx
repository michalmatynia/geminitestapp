'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

import { PlaywrightStepSequencerProvider } from '@/features/playwright/context/PlaywrightStepSequencerContext';
import { usePlaywrightStepSequencerState } from '@/features/playwright/hooks/usePlaywrightStepSequencerState';

const LiveScripterPanel = dynamic(
  () =>
    import('@/features/playwright/components/live-scripter/LiveScripterPanel').then(
      (mod) => mod.LiveScripterPanel
    ),
  { ssr: false }
);

export function AdminPlaywrightLiveScripterPageRuntime(): React.JSX.Element {
  const searchParams = useSearchParams();
  const state = usePlaywrightStepSequencerState();

  return (
    <PlaywrightStepSequencerProvider value={state}>
      <LiveScripterPanel
        initialUrl={searchParams.get('url')}
        initialWebsiteId={searchParams.get('websiteId')}
        initialFlowId={searchParams.get('flowId')}
        initialPersonaId={searchParams.get('personaId')}
      />
    </PlaywrightStepSequencerProvider>
  );
}
