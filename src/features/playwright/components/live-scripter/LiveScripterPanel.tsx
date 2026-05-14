'use client';

import { LiveScripterAssignDrawer } from './LiveScripterAssignDrawer';
import { LiveScripterDraftList } from './LiveScripterDraftList';
import { LiveScripterProbePanel } from './LiveScripterProbePanel';
import { LiveScripterPreview } from './LiveScripterPreview';
import { LiveScripterScopeControls } from './LiveScripterScopeControls';
import { LiveScripterUrlBar } from './LiveScripterUrlBar';
import { useLiveScripterPanelModel } from './useLiveScripterPanelModel';
import { LiveScripterPanelProvider, useLiveScripterPanelContext } from './LiveScripterPanelContext';

type Props = {
  initialUrl?: string | null;
  initialWebsiteId?: string | null;
  initialFlowId?: string | null;
  initialPersonaId?: string | null;
};

function LiveScripterErrorBanner(): React.JSX.Element | null {
  const model = useLiveScripterPanelContext();
  const errorMessage = model.liveScripter.errorMessage;
  if (typeof errorMessage !== 'string' || errorMessage.length === 0) {
    return null;
  }
  return (
    <div className='rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>
      {errorMessage}
    </div>
  );
}

function LiveScripterCurrentTitle(): React.JSX.Element | null {
  const model = useLiveScripterPanelContext();
  const title = model.liveScripter.currentTitle;
  if (typeof title !== 'string' || title.length === 0) {
    return null;
  }
  return <div className='text-xs text-muted-foreground'>Current page title: {title}</div>;
}

function LiveScripterWorkspace(): React.JSX.Element {
  const model = useLiveScripterPanelContext();
  const { liveScripter, sequencer } = model;
  const websiteId = sequencer.filterWebsiteId;
  const flowId = sequencer.filterFlowId;

  return (
    <div className='space-y-4'>
      <LiveScripterProbePanel liveScripter={liveScripter} />

      <div className='grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,420px)]'>
        <LiveScripterPreview
          frame={liveScripter.frame}
          pickedElement={liveScripter.pickedElement}
          mode={liveScripter.mode}
          status={liveScripter.status}
          onDriveClick={liveScripter.driveClick}
          onPickAt={liveScripter.pickAt}
          onDriveScroll={liveScripter.driveScroll}
        />

        <div className='space-y-4'>
          <LiveScripterAssignDrawer
            pickedElement={liveScripter.pickedElement}
            websiteId={websiteId}
            flowId={flowId}
            onStepAppended={liveScripter.clearPickedElement}
          />
          <LiveScripterDraftList />
        </div>
      </div>
    </div>
  );
}

function LiveScripterPanelControls(): React.JSX.Element {
  return (
    <>
      <LiveScripterUrlBar />
      <LiveScripterScopeControls />
    </>
  );
}

export function LiveScripterPanel({
  initialUrl = null,
  initialWebsiteId = null,
  initialFlowId = null,
  initialPersonaId = null,
}: Props): React.JSX.Element {
  const model = useLiveScripterPanelModel({
    initialUrl,
    initialWebsiteId,
    initialFlowId,
    initialPersonaId,
  });

  return (
    <LiveScripterPanelProvider model={model}>
      <div className='space-y-4'>
        <LiveScripterPanelControls />
        <LiveScripterErrorBanner />
        <LiveScripterWorkspace />
        <LiveScripterCurrentTitle />
      </div>
    </LiveScripterPanelProvider>
  );
}
