'use client';

import React, { useMemo } from 'react';

import { Button, FormSection, LoadingState } from '@/shared/ui';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';
import type { SocialPublishingImageAddon } from '@/shared/contracts/social-publishing-image-addons';
import { useSocialPostContext } from './SocialPostContext';
import {
  SocialImageAddonCard,
  type SocialImageAddonCardProps,
} from './SocialPost.ImageAddonCard';
import {
  getRuntimeString,
  hasBlockingVisualMutationJob,
  visualMutationBlockTitle,
} from './SocialPost.VisualsRuntime';

type AddonAction = () => Promise<void>;
type AddonsQueryRuntime = { isFetching?: unknown; isLoading?: unknown } | null | undefined;

type MissingAddonsState = {
  count: number;
  errorMessage: string | null;
  isPending: boolean;
  isRefreshing: boolean;
  isRemoving: boolean;
  onRefresh: () => void;
  onRemove: () => void;
};

type PersonaEntry = [string, string];

const getRuntimeArray = <T,>(value: T[] | undefined): T[] =>
  Array.isArray(value) ? value : [];

const getRuntimeBoolean = (value: unknown): boolean => value === true;

const resolveOptionalAsyncAction = (value: unknown): AddonAction | null => {
  if (typeof value !== 'function') return null;
  return value as AddonAction;
};

const runOptionalAction = (action: AddonAction | null): void => {
  if (action === null) return;
  void action();
};

const buildMissingAddonMessage = (count: number): string => {
  if (count === 1) {
    return '1 selected image add-on is missing from the loaded list. Refresh the image add-ons to review or remove it here.';
  }

  return `${count} selected image add-ons are missing from the loaded list. Refresh the image add-ons to review or remove them here.`;
};

const hasAddonPersona = (addon: SocialPublishingImageAddon): boolean =>
  getRuntimeString(addon.playwrightPersonaId).length > 0;

const personaEntry = (persona: { id?: unknown; name?: unknown }): PersonaEntry[] => {
  const id = getRuntimeString(persona.id);
  if (id.length === 0) return [];

  const name = getRuntimeString(persona.name);
  if (name.length > 0) return [[id, name]];
  return [[id, id]];
};

function MissingAddonsWarning({ state }: { state: MissingAddonsState }): React.JSX.Element | null {
  if (state.count <= 0) return null;
  return (
    <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
      <div>{buildMissingAddonMessage(state.count)}</div>
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

function AddonsGrid({
  addons,
  selectedAddonSet,
  ...cardProps
}: Omit<SocialImageAddonCardProps, 'addon' | 'isSelected'> & {
  addons: SocialPublishingImageAddon[];
  selectedAddonSet: Set<string>;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 sm:grid-cols-2'>
      {addons.map((addon) => (
        <SocialImageAddonCard
          key={addon.id}
          addon={addon}
          isSelected={selectedAddonSet.has(addon.id)}
          {...cardProps}
        />
      ))}
    </div>
  );
}

function ImageAddonsContent({
  addons,
  loading,
  selectedAddonSet,
  ...cardProps
}: Omit<SocialImageAddonCardProps, 'addon' | 'isSelected'> & {
  addons: SocialPublishingImageAddon[];
  loading: boolean;
  selectedAddonSet: Set<string>;
}): React.JSX.Element {
  if (loading) {
    return (
      <LoadingState
        message='Loading image add-ons...'
        size='sm'
        className='rounded-xl border border-border/60 bg-background/40 py-6'
      />
    );
  }

  if (addons.length === 0) {
    return <div className='text-xs text-muted-foreground'>No image add-ons yet.</div>;
  }

  return <AddonsGrid addons={addons} selectedAddonSet={selectedAddonSet} {...cardProps} />;
}

const buildMissingState = ({
  context,
  count,
  isRefreshing,
  isRemoving,
}: {
  context: ReturnType<typeof useSocialPostContext>;
  count: number;
  isRefreshing: boolean;
  isRemoving: boolean;
}): MissingAddonsState => ({
  count,
  errorMessage: context.missingImageAddonActionErrorMessage,
  isPending: isRefreshing || isRemoving,
  isRefreshing,
  isRemoving,
  onRefresh: () => {
    runOptionalAction(resolveOptionalAsyncAction(context.handleRefreshMissingImageAddons));
  },
  onRemove: () => {
    runOptionalAction(resolveOptionalAsyncAction(context.handleRemoveMissingAddons));
  },
});

export function SocialPostImageAddonsSection(): React.JSX.Element {
  const context = useSocialPostContext();
  const addons = getRuntimeArray(context.recentAddons);
  const selectedAddonIds = getRuntimeArray(context.imageAddonIds);
  const missingAddonIds = getRuntimeArray(context.missingSelectedImageAddonIds);
  const selectedAddonSet = useMemo(() => new Set(selectedAddonIds), [selectedAddonIds]);
  const personasQuery = usePlaywrightPersonas({ enabled: addons.some(hasAddonPersona) });
  const personaNameById = useMemo(
    () => new Map((personasQuery.data ?? []).flatMap(personaEntry)),
    [personasQuery.data]
  );
  const query = context.addonsQuery as AddonsQueryRuntime;
  const isRefreshing = context.missingImageAddonActionPending === 'refresh' ||
    getRuntimeBoolean(query?.isFetching);
  const isRemoving = context.missingImageAddonActionPending === 'remove';
  const isInteractionBlocked = hasBlockingVisualMutationJob(context);

  return (
    <FormSection title='Image add-ons' className='space-y-3'>
      <div className='text-xs text-muted-foreground'>
        Select existing visual add-ons for this post. Create new captures from the Settings modal.
      </div>
      <MissingAddonsWarning
        state={buildMissingState({
          context,
          count: missingAddonIds.length,
          isRefreshing,
          isRemoving,
        })}
      />
      <ImageAddonsContent
        addons={addons}
        allAddons={addons}
        isInteractionBlocked={isInteractionBlocked}
        loading={getRuntimeBoolean(query?.isLoading)}
        onRemove={context.handleRemoveAddon}
        onSelect={context.handleSelectAddon}
        personaNameById={personaNameById}
        selectedAddonSet={selectedAddonSet}
        title={visualMutationBlockTitle(isInteractionBlocked)}
      />
    </FormSection>
  );
}
