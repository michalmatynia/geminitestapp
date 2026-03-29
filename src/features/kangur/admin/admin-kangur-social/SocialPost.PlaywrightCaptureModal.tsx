'use client';

import React from 'react';

import {
  Button,
  FormField,
  FormModal,
  Input,
  LoadingState,
  SelectSimple,
  Textarea,
} from '@/features/kangur/shared/ui';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';

import { useSocialPostContext } from './SocialPostContext';

const PLAYWRIGHT_RUNTIME_PERSONA_VALUE = '';

export function SocialPostPlaywrightCaptureModal(): React.JSX.Element {
  const personasQuery = usePlaywrightPersonas({
    enabled: true,
  });
  const {
    isProgrammablePlaywrightModalOpen,
    handleCloseProgrammablePlaywrightModal,
    programmableCaptureBaseUrl,
    setProgrammableCaptureBaseUrl,
    programmableCapturePersonaId,
    setProgrammableCapturePersonaId,
    programmableCaptureScript,
    setProgrammableCaptureScript,
    programmableCaptureRoutes,
    programmableCapturePending,
    programmableCaptureMessage,
    programmableCaptureErrorMessage,
    handleAddProgrammableCaptureRoute,
    handleUpdateProgrammableCaptureRoute,
    handleRemoveProgrammableCaptureRoute,
    handleSeedProgrammableCaptureRoutesFromPresets,
    handleResetProgrammableCaptureScript,
    handleRunProgrammablePlaywrightCapture,
    handleRunProgrammablePlaywrightCaptureAndPipeline,
    canGenerateSocialDraft,
    socialDraftBlockedReason,
  } = useSocialPostContext();

  const personaOptions = React.useMemo(
    () => [
      { value: PLAYWRIGHT_RUNTIME_PERSONA_VALUE, label: 'Default runtime persona' },
      ...((personasQuery.data ?? []).map((persona) => ({
        value: persona.id,
        label: persona.name,
      })) ?? []),
    ],
    [personasQuery.data]
  );

  const canSave =
    programmableCaptureBaseUrl.trim().length > 0 &&
    programmableCaptureRoutes.some((route) => route.path.trim().length > 0) &&
    programmableCaptureScript.trim().length > 0 &&
    !programmableCapturePending;
  const canCaptureAndRunPipeline = canSave && canGenerateSocialDraft;
  const captureAndRunPipelineTitle = !canSave
    ? 'Add a base URL, at least one route, and a script before starting capture and pipeline.'
    : !canGenerateSocialDraft
      ? socialDraftBlockedReason ??
        'Choose a StudiQ Social post model before running capture and pipeline.'
      : 'Capture programmable screenshots, attach them to the draft, and start the normal generation pipeline.';

  return (
    <FormModal
      open={isProgrammablePlaywrightModalOpen}
      onClose={handleCloseProgrammablePlaywrightModal}
      title='Programmable Playwright capture'
      subtitle='Choose a persona, edit the script, and define custom capture routes for fresh Social visuals.'
      onSave={() => {
        void handleRunProgrammablePlaywrightCapture();
      }}
      saveText={programmableCapturePending ? 'Capturing...' : 'Capture programmable images'}
      isSaveDisabled={!canSave}
      showSaveButton={true}
      cancelText='Close'
      size='xl'
      actions={
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleAddProgrammableCaptureRoute}
            disabled={programmableCapturePending}
          >
            Add route
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleSeedProgrammableCaptureRoutesFromPresets}
            disabled={programmableCapturePending}
          >
            Seed from presets
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleResetProgrammableCaptureScript}
            disabled={programmableCapturePending}
          >
            Reset script
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <div className='grid gap-3 md:grid-cols-2'>
          <FormField
            label='Base URL'
            description='The modal routes are resolved against this URL unless you provide full absolute URLs.'
          >
            <Input
              type='url'
              value={programmableCaptureBaseUrl}
              onChange={(event) => setProgrammableCaptureBaseUrl(event.target.value)}
              placeholder='https://example.com'
              aria-label='Programmable capture base URL'
            />
          </FormField>

          <FormField
            label='Playwright persona'
            description='Use an existing persona to control browser behavior and fidelity.'
          >
            <SelectSimple
              value={programmableCapturePersonaId}
              onValueChange={setProgrammableCapturePersonaId}
              options={personaOptions}
              placeholder='Default runtime persona'
              ariaLabel='Playwright persona'
            />
          </FormField>
        </div>

        {personasQuery.isLoading ? (
          <LoadingState
            message='Loading Playwright personas...'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-4'
          />
        ) : null}

        {personasQuery.error ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200'>
            Failed to load Playwright personas. The default runtime persona will still work.
          </div>
        ) : null}

        <div className='space-y-3 rounded-xl border border-border/60 bg-background/40 p-4'>
          <div>
            <div className='text-sm font-semibold text-foreground'>Capture routes</div>
            <div className='text-xs text-muted-foreground'>
              Each route becomes one programmable screenshot target passed into the Playwright script as `input.captures`.
            </div>
          </div>

          {programmableCaptureRoutes.length === 0 ? (
            <div className='rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-muted-foreground'>
              Add at least one route or seed routes from the current Social presets.
            </div>
          ) : (
            <div className='space-y-3'>
              {programmableCaptureRoutes.map((route, index) => (
                <div
                  key={route.id}
                  className='space-y-3 rounded-lg border border-border/60 bg-background px-3 py-3'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <div className='text-sm font-medium text-foreground'>
                      Route {index + 1}
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='xs'
                      onClick={() => handleRemoveProgrammableCaptureRoute(route.id)}
                      disabled={programmableCapturePending}
                    >
                      Remove
                    </Button>
                  </div>

                  <div className='grid gap-3 md:grid-cols-2'>
                    <Input
                      value={route.title}
                      onChange={(event) =>
                        handleUpdateProgrammableCaptureRoute(route.id, {
                          title: event.target.value,
                        })
                      }
                      placeholder='Route title'
                      aria-label={`Programmable route ${index + 1} title`}
                    />
                    <Input
                      value={route.path}
                      onChange={(event) =>
                        handleUpdateProgrammableCaptureRoute(route.id, {
                          path: event.target.value,
                        })
                      }
                      placeholder='/pricing or https://example.com/pricing'
                      aria-label={`Programmable route ${index + 1} path`}
                    />
                    <Input
                      value={route.selector ?? ''}
                      onChange={(event) =>
                        handleUpdateProgrammableCaptureRoute(route.id, {
                          selector: event.target.value,
                        })
                      }
                      placeholder='Optional selector'
                      aria-label={`Programmable route ${index + 1} selector`}
                    />
                    <Input
                      value={route.description ?? ''}
                      onChange={(event) =>
                        handleUpdateProgrammableCaptureRoute(route.id, {
                          description: event.target.value,
                        })
                      }
                      placeholder='Optional description'
                      aria-label={`Programmable route ${index + 1} description`}
                    />
                    <Input
                      type='number'
                      min='0'
                      step='100'
                      value={route.waitForMs ?? 0}
                      onChange={(event) =>
                        handleUpdateProgrammableCaptureRoute(route.id, {
                          waitForMs: Number.isFinite(Number(event.target.value))
                            ? Math.max(0, Number(event.target.value))
                            : 0,
                        })
                      }
                      placeholder='Wait before capture (ms)'
                      aria-label={`Programmable route ${index + 1} wait before capture`}
                    />
                    <Input
                      type='number'
                      min='0'
                      step='100'
                      value={route.waitForSelectorMs ?? 10000}
                      onChange={(event) =>
                        handleUpdateProgrammableCaptureRoute(route.id, {
                          waitForSelectorMs: Number.isFinite(Number(event.target.value))
                            ? Math.max(0, Number(event.target.value))
                            : 10000,
                        })
                      }
                      placeholder='Wait for selector (ms)'
                      aria-label={`Programmable route ${index + 1} wait for selector`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <FormField
          label='Playwright script'
          description='This script is fully editable and runs in the existing Playwright node runtime.'
        >
          <Textarea
            value={programmableCaptureScript}
            onChange={(event) => setProgrammableCaptureScript(event.target.value)}
            rows={18}
            className='font-mono text-xs'
            aria-label='Programmable Playwright capture script'
          />
        </FormField>

        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={() => {
              void handleRunProgrammablePlaywrightCaptureAndPipeline();
            }}
            disabled={!canCaptureAndRunPipeline}
            title={captureAndRunPipelineTitle}
          >
            Capture + run pipeline
          </Button>
        </div>

        {programmableCapturePending ? (
          <LoadingState
            message='Running programmable Playwright capture...'
            size='sm'
            className='rounded-xl border border-border/60 bg-background/40 py-4'
          />
        ) : null}

        {programmableCaptureMessage ? (
          <div className='rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200'>
            {programmableCaptureMessage}
          </div>
        ) : null}

        {programmableCaptureErrorMessage ? (
          <div className='rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
            {programmableCaptureErrorMessage}
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
