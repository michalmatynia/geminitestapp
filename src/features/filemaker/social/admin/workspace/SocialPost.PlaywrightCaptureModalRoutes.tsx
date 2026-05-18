'use client';

import React from 'react';

import { Button, Input } from '@/shared/ui';
import type {
  SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';

import type {
  SocialPostPlaywrightCaptureContext,
  SocialPostPlaywrightCaptureModalState,
} from './SocialPost.PlaywrightCaptureModal.runtime';

const toNonNegativeNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, parsed);
};

export function SocialPostPlaywrightCaptureRoutes({
  context,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <div className='space-y-3 rounded-xl border border-border/60 bg-background/40 p-4'>
      <div>
        <div className='text-sm font-semibold text-foreground'>Capture routes</div>
        <div className='text-xs text-muted-foreground'>
          Each route becomes one programmable screenshot target passed into the Playwright script as `input.captures`.
        </div>
      </div>

      {context.programmableCaptureRoutes.length === 0 ? (
        <div className='rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground'>
          Add at least one route or seed routes from the current Social presets.
        </div>
      ) : (
        <div className='space-y-3'>
          {context.programmableCaptureRoutes.map((route, index) => (
            <SocialPostPlaywrightCaptureRouteCard
              key={route.id}
              context={context}
              index={index}
              route={route}
              state={state}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SocialPostPlaywrightCaptureRouteCard({
  context,
  index,
  route,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  index: number;
  route: SocialPublishingProgrammableCaptureRoute;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  const routeValidationState = state.routeValidationById.get(route.id) ?? null;

  return (
    <div className={`space-y-3 rounded-lg border px-3 py-3 ${routeValidationState?.issue !== null && routeValidationState?.issue !== undefined ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/60 bg-background'}`}>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-sm font-medium text-foreground'>Route {index + 1}</div>
        <Button
          type='button'
          variant='ghost'
          size='xs'
          onClick={() => context.handleRemoveProgrammableCaptureRoute(route.id)}
          disabled={state.isConfigEditingLocked}
          title={state.configLockTitle}
        >
          Remove
        </Button>
      </div>

      <SocialPostPlaywrightCaptureRouteFields
        context={context}
        index={index}
        route={route}
        state={state}
      />
      <SocialPostPlaywrightCaptureRoutePreview routeValidationState={routeValidationState} />
    </div>
  );
}

function SocialPostPlaywrightCaptureRouteFields({
  context,
  index,
  route,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  index: number;
  route: SocialPublishingProgrammableCaptureRoute;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-2'>
      <SocialPostPlaywrightRouteTextFields
        context={context}
        index={index}
        route={route}
        state={state}
      />
      <SocialPostPlaywrightRouteTimingFields
        context={context}
        index={index}
        route={route}
        state={state}
      />
    </div>
  );
}

function SocialPostPlaywrightRouteTextFields({
  context,
  index,
  route,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  index: number;
  route: SocialPublishingProgrammableCaptureRoute;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <>
      <Input
        value={route.title}
        onChange={(event) => context.handleUpdateProgrammableCaptureRoute(route.id, {
          title: event.target.value,
        })}
        placeholder='Route title'
        aria-label={`Programmable route ${index + 1} title`}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      />
      <Input
        value={route.path}
        onChange={(event) => context.handleUpdateProgrammableCaptureRoute(route.id, {
          path: event.target.value,
        })}
        placeholder='/pricing or https://example.com/pricing'
        aria-label={`Programmable route ${index + 1} path`}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      />
      <Input
        value={route.selector ?? ''}
        onChange={(event) => context.handleUpdateProgrammableCaptureRoute(route.id, {
          selector: event.target.value,
        })}
        placeholder='Optional selector'
        aria-label={`Programmable route ${index + 1} selector`}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      />
      <Input
        value={route.description}
        onChange={(event) => context.handleUpdateProgrammableCaptureRoute(route.id, {
          description: event.target.value,
        })}
        placeholder='Optional description'
        aria-label={`Programmable route ${index + 1} description`}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      />
    </>
  );
}

function SocialPostPlaywrightRouteTimingFields({
  context,
  index,
  route,
  state,
}: {
  context: SocialPostPlaywrightCaptureContext;
  index: number;
  route: SocialPublishingProgrammableCaptureRoute;
  state: SocialPostPlaywrightCaptureModalState;
}): React.JSX.Element {
  return (
    <>
      <Input
        type='number'
        min='0'
        step='100'
        value={route.waitForMs ?? 0}
        onChange={(event) => context.handleUpdateProgrammableCaptureRoute(route.id, {
          waitForMs: toNonNegativeNumber(event.target.value, 0),
        })}
        placeholder='Wait before capture (ms)'
        aria-label={`Programmable route ${index + 1} wait before capture`}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      />
      <Input
        type='number'
        min='0'
        step='100'
        value={route.waitForSelectorMs ?? 10000}
        onChange={(event) => context.handleUpdateProgrammableCaptureRoute(route.id, {
          waitForSelectorMs: toNonNegativeNumber(event.target.value, 10000),
        })}
        placeholder='Wait for selector (ms)'
        aria-label={`Programmable route ${index + 1} wait for selector`}
        disabled={state.isConfigEditingLocked}
        title={state.configLockTitle}
      />
    </>
  );
}

const routePreviewClassName = (hasIssue: boolean): string => {
  if (hasIssue) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200';
  }
  return 'border-border/50 bg-background/80 text-muted-foreground';
};

const routeIssue = (
  routeValidationState:
    | SocialPostPlaywrightCaptureModalState['routeValidation']['routes'][number]
    | null
): string | null => routeValidationState?.issue ?? null;

function SocialPostPlaywrightCaptureRoutePreview({
  routeValidationState,
}: {
  routeValidationState:
    | SocialPostPlaywrightCaptureModalState['routeValidation']['routes'][number]
    | null;
}): React.JSX.Element {
  const issue = routeIssue(routeValidationState);
  const hasIssue = issue !== null;
  const resolvedUrl = routeValidationState?.resolvedUrl ?? null;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${routePreviewClassName(hasIssue)}`}>
      <div className='font-medium uppercase tracking-wide text-foreground/80'>
        Resolved target
      </div>
      {resolvedUrl !== null ? <div className='mt-1 break-all'>{resolvedUrl}</div> : null}
      {issue !== null ? <div className='mt-1'>{issue}</div> : null}
    </div>
  );
}
