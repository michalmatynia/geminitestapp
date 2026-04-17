'use client';

import { LiveScripterAssignDrawer } from './LiveScripterAssignDrawer';
import { LiveScripterDraftList } from './LiveScripterDraftList';
import { LiveScripterPreview } from './LiveScripterPreview';
import { LiveScripterScopeControls } from './LiveScripterScopeControls';
import { LiveScripterUrlBar } from './LiveScripterUrlBar';
import { useLiveScripterPanelModel } from './useLiveScripterPanelModel';

type Props = {
  initialUrl?: string | null;
  initialWebsiteId?: string | null;
  initialFlowId?: string | null;
  initialPersonaId?: string | null;
};

function LiveScripterErrorBanner({
  errorMessage,
}: {
  errorMessage: string | null;
}): React.JSX.Element | null {
  if (typeof errorMessage !== 'string' || errorMessage.length === 0) {
    return null;
  }
  return (
    <div className='rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300'>
      {errorMessage}
    </div>
  );
}

function LiveScripterCurrentTitle({
  title,
}: {
  title: string | null;
}): React.JSX.Element | null {
  if (typeof title !== 'string' || title.length === 0) {
    return null;
  }
  return <div className='text-xs text-muted-foreground'>Current page title: {title}</div>;
}

function LiveScripterWorkspace({
  liveScripter,
  websiteId,
  flowId,
}: {
  liveScripter: ReturnType<typeof useLiveScripterPanelModel>['liveScripter'];
  websiteId: string | null;
  flowId: string | null;
}): React.JSX.Element {
  return (
    <div className='grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,420px)]'>
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
  );
}

function LiveScripterPanelControls({
  model,
}: {
  model: ReturnType<typeof useLiveScripterPanelModel>;
}): React.JSX.Element {
  return (
    <>
      <LiveScripterUrlBar
        url={model.urlInput}
        onUrlChange={model.setUrlInput}
        currentUrl={model.liveScripter.currentUrl}
        status={model.liveScripter.status}
        mode={model.liveScripter.mode}
        onModeChange={model.liveScripter.setMode}
        onStartOrNavigate={model.handleStartOrNavigate}
        onBack={model.liveScripter.back}
        onForward={model.liveScripter.forward}
        onReload={model.liveScripter.reload}
        onDispose={model.handleDispose}
        typingValue={model.typingValue}
        onTypingValueChange={model.setTypingValue}
        onDriveType={model.handleDriveType}
      />
      <LiveScripterScopeControls
        websites={model.sequencer.websites}
        flows={model.flowsForWebsite}
        personas={model.personas}
        websiteId={model.sequencer.filterWebsiteId}
        flowId={model.sequencer.filterFlowId}
        personaId={model.personaId}
        onWebsiteChange={model.handleWebsiteChange}
        onFlowChange={model.sequencer.setFilterFlowId}
        onPersonaChange={model.setPersonaId}
      />
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
    <div className='space-y-4'>
      <LiveScripterPanelControls model={model} />
      <LiveScripterErrorBanner errorMessage={model.liveScripter.errorMessage} />
      <LiveScripterWorkspace
        liveScripter={model.liveScripter}
        websiteId={model.sequencer.filterWebsiteId}
        flowId={model.sequencer.filterFlowId}
      />
      <LiveScripterCurrentTitle title={model.liveScripter.currentTitle} />
    </div>
  );
}
