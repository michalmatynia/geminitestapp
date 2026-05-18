'use client';

import React from 'react';

import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import {
  buildSocialPublishingProgrammableCaptureRuntimeRequestPreview,
  resolveSocialPublishingProgrammableCaptureRoutePreview,
  SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
} from '@/features/filemaker/social/shared/social-playwright-capture';
import type { SocialPublishingProgrammableCaptureRoute } from '@/shared/contracts/social-publishing-image-addons';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';
import { Button } from '@/shared/ui';

import { useSocialPostContext } from '../SocialPostContext';
import {
  resolveCaptureActionState,
  type SocialCaptureActionState,
} from './SocialSettingsCaptureTab.runtime';

type ProgrammableRouteSummary = {
  route: SocialPublishingProgrammableCaptureRoute;
  preview: ReturnType<typeof resolveSocialPublishingProgrammableCaptureRoutePreview>;
};

const resolveProgrammablePersonaSummary = ({
  personaId,
  personas,
}: {
  personaId: string;
  personas: Array<{ id: string; name?: string | null }> | undefined;
}): string => {
  if (personaId.length === 0) {
    return 'Default runtime persona';
  }

  const resolvedName = personas?.find((persona) => persona.id === personaId)?.name?.trim() ?? '';
  return resolvedName.length > 0 ? `${resolvedName} (${personaId})` : personaId;
};

const ProgrammableDefaultsActions = ({
  actionState,
}: {
  actionState: SocialCaptureActionState;
}): React.ReactElement => {
  const {
    handleOpenProgrammablePlaywrightModalFromDefaults,
    handleResetProgrammableCaptureDefaults,
    hasSavedProgrammableCaptureDefaults,
  } = useSocialPostContext();
  const handleResetClick = (): void => {
    void handleResetProgrammableCaptureDefaults();
  };

  return (
    <div className='flex flex-wrap justify-start gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleOpenProgrammablePlaywrightModalFromDefaults}
      >
        Open programmable editor
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={handleResetClick}
        disabled={!hasSavedProgrammableCaptureDefaults || actionState.hasBlockingRuntimeJob}
        title={actionState.hasBlockingRuntimeJob ? actionState.captureActionTitle : 'Reset saved defaults'}
      >
        Reset saved defaults
      </Button>
    </div>
  );
};

const ProgrammableRouteTarget = ({
  preview,
}: {
  preview: ProgrammableRouteSummary['preview'];
}): React.ReactElement => {
  const resolvedUrl = preview.resolvedUrl ?? '';

  return (
    <>
      <span className='font-medium text-foreground/80'>Target:</span>{' '}
      {resolvedUrl.length > 0 ? resolvedUrl : preview.issue}
    </>
  );
};

const ProgrammableRouteList = ({
  routes,
}: {
  routes: ProgrammableRouteSummary[];
}): React.ReactElement | null => {
  if (routes.length === 0) {
    return null;
  }

  return (
    <div className='pt-1'>
      <div className='pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
        Saved routes
      </div>
      <div className='space-y-2'>
        {routes.map(({ route, preview }) => (
          <div key={route.id} className='rounded-lg border border-border/50 bg-background/60 px-2 py-2'>
            <div className='font-medium text-foreground/90'>
              {route.title.trim().length > 0 ? route.title.trim() : route.id}
            </div>
            <div className='mt-1 break-all text-[11px] text-muted-foreground'>
              <ProgrammableRouteTarget preview={preview} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgrammableDefaultsSummary = ({
  personaSummary,
  routeSummaries,
}: {
  personaSummary: string;
  routeSummaries: ProgrammableRouteSummary[];
}): React.ReactElement => {
  const context = useSocialPostContext();
  const baseUrl = context.persistedProgrammableCaptureBaseUrl ?? '';
  const scriptLabel =
    context.persistedProgrammableCaptureScript !==
    SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT
      ? 'Custom script saved'
      : 'Default script template';
  const runtimePreview = buildSocialPublishingProgrammableCaptureRuntimeRequestPreview({
    appearanceMode: context.captureAppearanceMode,
    personaId: context.persistedProgrammableCapturePersonaId,
    routes: context.persistedProgrammableCaptureRoutes,
    baseUrl,
  });

  return (
    <div className='space-y-1.5'>
      <div>
        Base URL:{' '}
        <span className='font-medium text-foreground/90'>
          {baseUrl.length > 0 ? baseUrl : 'Use modal input'}
        </span>
      </div>
      <div>
        Persona: <span className='font-medium text-foreground/90'>{personaSummary}</span>
      </div>
      <div>
        Routes:{' '}
        <span className='font-medium text-foreground/90'>
          {context.persistedProgrammableCaptureRoutes.length}
        </span>
      </div>
      <div>
        Script: <span className='font-medium text-foreground/90'>{scriptLabel}</span>
      </div>
      <ProgrammableRouteList routes={routeSummaries} />
      <div className='pt-1'>
        <div className='pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>
          Runtime request preview
        </div>
        <pre className='overflow-x-auto rounded-lg border border-border/50 bg-background px-3 py-2 text-[11px] text-muted-foreground'>
          {JSON.stringify(runtimePreview, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export function SocialSettingsProgrammableDefaultsCard(): React.ReactElement {
  const context = useSocialPostContext();
  const personaId = context.persistedProgrammableCapturePersonaId?.trim() ?? '';
  const personasQuery = usePlaywrightPersonas({ enabled: personaId.length > 0 });
  const actionState = resolveCaptureActionState({
    batchCapturePending: context.batchCapturePending,
    batchCaptureJob: context.batchCaptureJob,
    runtimeJobs: [
      context.currentVisualAnalysisJob,
      context.currentGenerationJob,
      context.currentPipelineJob,
    ],
  });
  const personaSummary = resolveProgrammablePersonaSummary({
    personaId,
    personas: personasQuery.data,
  });
  const routeSummaries = React.useMemo(
    () =>
      context.persistedProgrammableCaptureRoutes.map((route) => ({
        route,
        preview: resolveSocialPublishingProgrammableCaptureRoutePreview(
          route.path,
          context.persistedProgrammableCaptureBaseUrl ?? ''
        ),
      })),
    [context.persistedProgrammableCaptureBaseUrl, context.persistedProgrammableCaptureRoutes]
  );

  return (
    <KangurAdminCard>
      <div className='space-y-3'>
        <div>
          <div className='text-sm font-semibold text-foreground'>
            Programmable Playwright defaults
          </div>
          <div className='text-sm text-muted-foreground'>
            Saved from the advanced Playwright capture modal and reused the next time it opens.
          </div>
        </div>
        <ProgrammableDefaultsActions actionState={actionState} />
        <div className='rounded-xl border border-border/60 bg-background/40 p-3 text-xs text-muted-foreground'>
          {context.hasSavedProgrammableCaptureDefaults ? (
            <ProgrammableDefaultsSummary
              personaSummary={personaSummary}
              routeSummaries={routeSummaries}
            />
          ) : (
            <div>No programmable capture defaults have been saved yet.</div>
          )}
        </div>
      </div>
    </KangurAdminCard>
  );
}
