'use client';

import React from 'react';

import { Button } from '@/shared/ui';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import { resolveImagePreview } from './SocialPublishingPage.Constants';
import { getSocialPostAddonCaptureDetailLabels } from './social-post-addon-capture-details';
import { getRuntimeString, hasText } from './SocialPost.VisualsRuntime';
import type {
  SocialVisualAnalysisModalContext,
  VisualAnalysisModalSelectionState,
} from './SocialPost.VisualAnalysisModalState';

type AddonAction = () => Promise<void>;
type AddonsQueryRuntime = { isFetching?: unknown } | null | undefined;

type MissingVisualState = {
  errorMessage: string | null;
  isPending: boolean;
  isRefreshing: boolean;
  isRemoving: boolean;
  missingCount: number;
  onRefresh: () => void;
  onRemove: () => void;
};

const getRuntimeBoolean = (value: unknown): boolean => value === true;

const resolveOptionalAsyncAction = (value: unknown): AddonAction | null => {
  if (typeof value !== 'function') return null;
  return value as AddonAction;
};

const runOptionalAction = (action: AddonAction | null): void => {
  if (action === null) return;
  void action();
};

const personaEntries = (persona: { id?: unknown; name?: unknown }): Array<[string, string]> => {
  const id = getRuntimeString(persona.id);
  if (id.length === 0) return [];

  const name = getRuntimeString(persona.name);
  if (name.length > 0) return [[id, name]];
  return [[id, id]];
};

export function useVisualAnalysisPersonaNames(
  selection: VisualAnalysisModalSelectionState
): Map<string, string> {
  const personasQuery = usePlaywrightPersonas({ enabled: selection.shouldLoadPersonas });
  return React.useMemo(
    () => new Map((personasQuery.data ?? []).flatMap(personaEntries)),
    [personasQuery.data]
  );
}

const missingVisualMessage = (count: number): string => {
  if (count === 1) {
    return '1 selected image add-on is missing from the loaded list. Refresh the image add-ons and try again.';
  }

  return `${count} selected image add-ons are missing from the loaded list. Refresh the image add-ons and try again.`;
};

const buildMissingVisualState = (
  context: SocialVisualAnalysisModalContext,
  selection: VisualAnalysisModalSelectionState
): MissingVisualState => {
  const query = context.addonsQuery as AddonsQueryRuntime;
  const isRefreshing = context.missingImageAddonActionPending === 'refresh' ||
    getRuntimeBoolean(query?.isFetching);
  const isRemoving = context.missingImageAddonActionPending === 'remove';

  return {
    errorMessage: context.missingImageAddonActionErrorMessage,
    isPending: isRefreshing || isRemoving,
    isRefreshing,
    isRemoving,
    missingCount: selection.missingCount,
    onRefresh: () => {
      runOptionalAction(resolveOptionalAsyncAction(context.handleRefreshMissingImageAddons));
    },
    onRemove: () => {
      runOptionalAction(resolveOptionalAsyncAction(context.handleRemoveMissingAddons));
    },
  };
};

function EmptySelectionAlert(): React.JSX.Element {
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm text-muted-foreground'>
      Select at least one image add-on before running image analysis.
    </div>
  );
}

function MissingSelectedVisualsWarning({
  state,
}: {
  state: MissingVisualState;
}): React.JSX.Element {
  return (
    <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
      <div>{missingVisualMessage(state.missingCount)}</div>
      <div className='mt-2 flex flex-wrap gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={state.onRefresh}
          disabled={state.isPending}
        >
          {state.isRefreshing ? 'Refreshing image add-ons...' : 'Refresh image add-ons'}
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={state.onRemove}
          disabled={state.isPending}
        >
          {state.isRemoving ? 'Removing missing add-ons...' : 'Remove missing add-ons'}
        </Button>
      </div>
      {state.errorMessage !== null ? (
        <div className='mt-2 text-xs text-destructive'>{state.errorMessage}</div>
      ) : null}
    </div>
  );
}

function CaptureDetailLabels({
  addon,
  personaNameById,
}: {
  addon: SocialPublishingImageAddon;
  personaNameById: Map<string, string>;
}): React.JSX.Element | null {
  const labels = getSocialPostAddonCaptureDetailLabels(addon, { personaNameById });
  if (labels.length === 0) return null;

  return (
    <div className='mt-2 flex flex-wrap gap-1 text-[11px] text-muted-foreground'>
      {labels.map((label) => (
        <span key={`${addon.id}-${label}`} className='rounded-full border border-border/50 px-1.5 py-0.5'>
          {label}
        </span>
      ))}
    </div>
  );
}

function SelectedVisualCard({
  addon,
  personaNameById,
}: {
  addon: SocialPublishingImageAddon;
  personaNameById: Map<string, string>;
}): React.JSX.Element {
  return (
    <div className='rounded-xl border border-border/60 bg-background/40 p-2'>
      <div className='overflow-hidden rounded-lg border border-border/50'>
        <img
          src={resolveImagePreview(addon.imageAsset)}
          alt={hasText(addon.title) ? addon.title : 'Selected visual'}
          className='h-28 w-full object-cover'
          loading='lazy'
        />
      </div>
      <div className='mt-2 text-xs'>
        <div className='font-medium text-foreground/90'>{addon.title}</div>
        {hasText(addon.description) ? (
          <div className='mt-1 text-muted-foreground'>{addon.description}</div>
        ) : null}
        <CaptureDetailLabels addon={addon} personaNameById={personaNameById} />
      </div>
    </div>
  );
}

function SelectedVisualGrid({
  personaNameById,
  selection,
}: {
  personaNameById: Map<string, string>;
  selection: VisualAnalysisModalSelectionState;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
      {selection.selectedAddons.map((addon) => (
        <SelectedVisualCard key={addon.id} addon={addon} personaNameById={personaNameById} />
      ))}
    </div>
  );
}

export function SocialVisualAnalysisSelectedVisuals({
  context,
  personaNameById,
  selection,
}: {
  context: SocialVisualAnalysisModalContext;
  personaNameById: Map<string, string>;
  selection: VisualAnalysisModalSelectionState;
}): React.JSX.Element {
  if (selection.selectedCount === 0) return <EmptySelectionAlert />;
  if (selection.missingCount > 0) {
    return <MissingSelectedVisualsWarning state={buildMissingVisualState(context, selection)} />;
  }

  return <SelectedVisualGrid personaNameById={personaNameById} selection={selection} />;
}
