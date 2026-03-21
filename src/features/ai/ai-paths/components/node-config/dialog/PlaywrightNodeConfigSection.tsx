'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { playwrightSettingsSchema } from '@/shared/contracts/playwright';
import { usePlaywrightPersonas } from '@/shared/hooks/usePlaywrightPersonas';
import type { PlaywrightConfig } from '@/shared/lib/ai-paths';
import {
  createDefaultPlaywrightConfig,
  normalizePlaywrightConfig,
} from '@/shared/lib/ai-paths/core/playwright/default-config';
import {
  CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE,
  findPlaywrightScriptTemplate,
  findPlaywrightTemplateByScript,
  PLAYWRIGHT_SCRIPT_TEMPLATES,
} from '@/shared/lib/ai-paths/core/playwright/script-templates';
import {
  Button,
  Input,
  LoadingState,
  SelectSimple,
  Textarea,
  FormField,
  insetPanelVariants,
} from '@/shared/ui';

import { useAiPathOrchestrator, useAiPathSelection } from '../../AiPathConfigContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const RUNTIME_PERSONA_VALUE = '__runtime__';

const BROWSER_ENGINE_OPTIONS = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'webkit', label: 'WebKit' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

type CaptureToggleKey = keyof NonNullable<PlaywrightConfig['capture']>;

const CAPTURE_OPTIONS: Array<{
  key: CaptureToggleKey;
  label: string;
  description: string;
}> = [
  { key: 'screenshot', label: 'Screenshot', description: 'Capture final page image.' },
  { key: 'html', label: 'HTML', description: 'Capture final page markup.' },
  { key: 'video', label: 'Video', description: 'Record browser session video.' },
  { key: 'trace', label: 'Trace', description: 'Capture Playwright trace ZIP.' },
];

const parseJsonError = (value: string | undefined): string | null => {
  const text = (value ?? '').trim();
  if (!text) return null;
  try {
    JSON.parse(text);
    return null;
  } catch (error) {
    logClientError(error);
    return 'Invalid JSON';
  }
};

const stringifyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch (error) {
    logClientError(error);
    return '{}';
  }
};

const parseJsonObject = (value: string): Record<string, unknown> | null => {
  const text = value.trim();
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export function PlaywrightNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode } = useAiPathSelection();
  const { updateSelectedNodeConfig } = useAiPathOrchestrator();
  const personasQuery = usePlaywrightPersonas();
  const defaultPlaywrightConfig = useMemo(() => createDefaultPlaywrightConfig(), []);

  const playwrightConfig: PlaywrightConfig = useMemo(
    () =>
      normalizePlaywrightConfig(
        selectedNode?.type === 'playwright' ? selectedNode.config?.playwright : undefined
      ),
    [selectedNode?.config?.playwright, selectedNode?.type]
  );
  const selectedPersona = playwrightConfig.personaId
    ? (personasQuery.data ?? []).find((persona) => persona.id === playwrightConfig.personaId)
    : null;
  const personaOptions = [
    { value: RUNTIME_PERSONA_VALUE, label: 'Default (runtime settings)' },
    ...(personasQuery.data ?? []).map((persona) => ({
      value: persona.id,
      label: persona.name,
    })),
  ];
  const launchJsonError = parseJsonError(playwrightConfig.launchOptionsJson);
  const contextJsonError = parseJsonError(playwrightConfig.contextOptionsJson);
  const scriptTemplateOptions = useMemo(
    () => [
      {
        value: CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE,
        label: 'Custom (keep current script)',
      },
      ...PLAYWRIGHT_SCRIPT_TEMPLATES.map((template) => ({
        value: template.id,
        label: template.name,
        description: template.description,
      })),
    ],
    []
  );
  const selectedPersonaFidelity = useMemo(
    () =>
      selectedPersona
        ? [
          `Headless: ${selectedPersona.settings.headless ? 'on' : 'off'}`,
          `SlowMo: ${selectedPersona.settings.slowMo}ms`,
          `Timeout: ${selectedPersona.settings.timeout}ms`,
          selectedPersona.settings.emulateDevice && selectedPersona.settings.deviceName
            ? `Device: ${selectedPersona.settings.deviceName}`
            : 'Device: none',
          selectedPersona.settings.humanizeMouse ? 'Humanized input: on' : 'Humanized input: off',
        ]
        : null,
    [selectedPersona]
  );
  const captureConfig = playwrightConfig.capture ?? defaultPlaywrightConfig.capture ?? {};
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const matchedTemplate = findPlaywrightTemplateByScript(playwrightConfig.script);
    return matchedTemplate?.id ?? CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE;
  });
  const [settingsOverridesDraft, setSettingsOverridesDraft] = useState<string>(() =>
    stringifyJson(playwrightConfig.settingsOverrides ?? {})
  );

  useEffect(() => {
    setSettingsOverridesDraft(stringifyJson(playwrightConfig.settingsOverrides ?? {}));
  }, [playwrightConfig.settingsOverrides, selectedNode?.id]);
  useEffect(() => {
    const matchedTemplate = findPlaywrightTemplateByScript(playwrightConfig.script);
    setSelectedTemplateId(matchedTemplate?.id ?? CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE);
  }, [playwrightConfig.script, selectedNode?.id]);

  const parsedSettingsOverrides = useMemo(() => {
    const jsonObject = parseJsonObject(settingsOverridesDraft);
    if (!jsonObject) {
      return {
        value: {},
        error: 'Overrides must be a JSON object.',
      };
    }
    const parsed = playwrightSettingsSchema.partial().safeParse(jsonObject);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const pathLabel =
        issue?.path && issue.path.length > 0 ? issue.path.join('.') : 'settingsOverrides';
      return {
        value: {},
        error: `Invalid override for "${pathLabel}".`,
      };
    }
    return {
      value: parsed.data,
      error: null,
    };
  }, [settingsOverridesDraft]);

  const updateConfig = (patch: Partial<PlaywrightConfig>): void => {
    if (selectedNode?.type !== 'playwright') return;
    updateSelectedNodeConfig({
      playwright: {
        ...playwrightConfig,
        ...patch,
      },
    });
  };

  const selectedTemplate = useMemo(
    () => findPlaywrightScriptTemplate(selectedTemplateId),
    [selectedTemplateId]
  );

  const applyScriptTemplate = (): void => {
    if (!selectedTemplate) return;
    updateConfig({
      script: selectedTemplate.script,
    });
  };

  const applySettingsOverrides = (): void => {
    if (parsedSettingsOverrides.error) return;
    updateConfig({ settingsOverrides: parsedSettingsOverrides.value });
  };

  const toggleCapture = (key: CaptureToggleKey): void => {
    const nextValue = captureConfig[key] !== true;
    updateConfig({
      capture: {
        ...captureConfig,
        [key]: nextValue,
      },
    });
  };

  if (selectedNode?.type !== 'playwright') return null;

  return (
    <div className='space-y-4' data-testid='playwright-node-config'>
      <FormField
        label='Playwright Persona'
        description='Choose an existing persona to steer browser fidelity and behavior defaults.'
        actions={
          <Button asChild variant='outline' size='xs' className='h-7'>
            <Link href='/admin/settings/playwright'>Manage Personas</Link>
          </Button>
        }
      >
        <SelectSimple
          size='sm'
          variant='subtle'
          value={playwrightConfig.personaId ? playwrightConfig.personaId : RUNTIME_PERSONA_VALUE}
          onValueChange={(value: string): void =>
            updateConfig({
              personaId: value === RUNTIME_PERSONA_VALUE ? '' : value,
            })
          }
          options={personaOptions}
          placeholder='Select persona'
          dataDocId='playwright_persona_select'
          ariaLabel='Playwright persona'
         title='Select persona'/>
      </FormField>

      {personasQuery.isLoading ? (
        <LoadingState message='Loading personas...' size='sm' className='py-2' />
      ) : null}
      {personasQuery.error ? (
        <div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
          Failed to load personas. Runtime defaults will be used.
        </div>
      ) : null}
      {selectedPersona?.description ? (
        <div className='rounded-md border border-border bg-card/60 px-3 py-2 text-[11px] text-gray-300'>
          {selectedPersona.description}
        </div>
      ) : null}
      {selectedPersonaFidelity ? (
        <div
          className='rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2'
          data-testid='playwright-persona-fidelity'
        >
          <div className='text-[10px] uppercase tracking-wide font-semibold text-sky-200'>
            Persona Fidelity
          </div>
          <div className='mt-1.5 flex flex-wrap gap-2 text-[11px] text-sky-100'>
            {selectedPersonaFidelity.map((entry) => (
              <span
                key={entry}
                className='rounded border border-sky-400/40 bg-sky-500/10 px-2 py-0.5'
              >
                {entry}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Browser Engine'>
          <SelectSimple
            size='sm'
            variant='subtle'
            value={playwrightConfig.browserEngine ?? 'chromium'}
            onValueChange={(value: string): void =>
              updateConfig({ browserEngine: value as PlaywrightConfig['browserEngine'] })
            }
            options={BROWSER_ENGINE_OPTIONS}
           ariaLabel='Browser Engine' title='Browser Engine'/>
        </FormField>
        <FormField label='Timeout (ms)'>
          <Input
            variant='subtle'
            size='sm'
            type='number'
            min={1000}
            step={1000}
            value={playwrightConfig.timeoutMs ?? 120000}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              const parsed = Number.parseInt(event.target.value, 10);
              updateConfig({
                timeoutMs:
                  Number.isFinite(parsed) && parsed > 0
                    ? parsed
                    : defaultPlaywrightConfig.timeoutMs,
              });
            }}
           aria-label='Timeout (ms)' title='Timeout (ms)'/>
        </FormField>
      </div>

      <FormField label='Start URL Template (optional)'>
        <Input
          variant='subtle'
          size='sm'
          value={playwrightConfig.startUrlTemplate ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateConfig({ startUrlTemplate: event.target.value })
          }
          placeholder='https://example.com/{{entityId}}'
         aria-label='https://example.com/{{entityId}}' title='https://example.com/{{entityId}}'/>
      </FormField>

      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Wait for result</span>
        <Button
          type='button'
          variant={playwrightConfig.waitForResult !== false ? 'success' : 'default'}
          size='xs'
          onClick={(): void =>
            updateConfig({ waitForResult: playwrightConfig.waitForResult === false })
          }
        >
          {playwrightConfig.waitForResult === false ? 'Disabled' : 'Enabled'}
        </Button>
      </div>

      <div
        className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border/70`}
      >
        <FormField
          label='Script Template'
          description='Start from a tested automation pattern and customize it.'
          actions={
            <Button
              type='button'
              size='xs'
              variant='outline'
              className='h-7'
              onClick={applyScriptTemplate}
              disabled={!selectedTemplate}
              data-doc-id='playwright_script_template_apply'
            >
              Apply Template
            </Button>
          }
        >
          <SelectSimple
            size='sm'
            variant='subtle'
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
            options={scriptTemplateOptions}
            placeholder='Select script template'
            dataDocId='playwright_script_template_select'
            ariaLabel='Playwright script template'
           title='Select script template'/>
        </FormField>
        {selectedTemplate ? (
          <p
            className='mt-2 text-[11px] text-gray-400 italic'
            data-testid='playwright-script-template-description'
          >
            {selectedTemplate.description}
          </p>
        ) : (
          <p className='mt-2 text-[11px] text-gray-500 italic'>
            Current script does not match a built-in template.
          </p>
        )}
      </div>

      <FormField
        label='Script'
        description='Script must export a default async function. Use emit("result", value) to publish outputs.'
      >
        <Textarea
          variant='subtle'
          size='sm'
          data-testid='playwright-script-editor'
          className='min-h-[220px] font-mono'
          value={playwrightConfig.script}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateConfig({ script: event.target.value })
          }
          placeholder='export default async function run({ page, input, emit, artifacts, log }) { ... }'
         aria-label='export default async function run({ page, input, emit, artifacts, log }) { ... }' title='export default async function run({ page, input, emit, artifacts, log }) { ... }'/>
      </FormField>

      <div className='grid gap-3 sm:grid-cols-2'>
        <FormField label='Launch Options (JSON)' error={launchJsonError ?? undefined}>
          <Textarea
            variant='subtle'
            size='xs'
            className='min-h-[120px] font-mono'
            value={playwrightConfig.launchOptionsJson ?? '{}'}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateConfig({ launchOptionsJson: event.target.value })
            }
           aria-label='Launch Options (JSON)' title='Launch Options (JSON)'/>
        </FormField>
        <FormField label='Context Options (JSON)' error={contextJsonError ?? undefined}>
          <Textarea
            variant='subtle'
            size='xs'
            className='min-h-[120px] font-mono'
            value={playwrightConfig.contextOptionsJson ?? '{}'}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateConfig({ contextOptionsJson: event.target.value })
            }
           aria-label='Context Options (JSON)' title='Context Options (JSON)'/>
        </FormField>
      </div>

      <FormField
        label='Settings Overrides (JSON)'
        description='Merges into selected persona settings at runtime.'
        error={parsedSettingsOverrides.error ?? undefined}
        actions={
          <Button
            type='button'
            size='xs'
            variant='outline'
            className='h-7'
            onClick={applySettingsOverrides}
            disabled={Boolean(parsedSettingsOverrides.error)}
          >
            Apply overrides
          </Button>
        }
      >
        <Textarea
          variant='subtle'
          size='xs'
          data-testid='playwright-settings-overrides-editor'
          className='min-h-[120px] font-mono'
          value={settingsOverridesDraft}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            setSettingsOverridesDraft(event.target.value)
          }
          onBlur={applySettingsOverrides}
         aria-label='Settings Overrides (JSON)' title='Settings Overrides (JSON)'/>
      </FormField>

      <div className='space-y-3 pt-2 border-t border-border/20'>
        <div className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>
          Capture Artifacts
        </div>
        <div className='grid gap-2 sm:grid-cols-2'>
          {CAPTURE_OPTIONS.map((option) => {
            const enabled = captureConfig[option.key] === true;
            return (
              <Button
                key={option.key}
                type='button'
                variant='outline'
                data-doc-id={`playwright_capture_${option.key}`}
                className={`flex h-auto items-start justify-between gap-3 border px-3 py-2 text-left text-xs ${
                  enabled
                    ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                    : 'border-border bg-card/50 text-gray-300 hover:bg-muted/40'
                }`}
                onClick={(): void => toggleCapture(option.key)}
              >
                <span>
                  <span className='block font-medium'>{option.label}</span>
                  <span className='block text-[10px] text-gray-400'>{option.description}</span>
                </span>
                <span className='text-[10px] uppercase font-bold tracking-wide'>
                  {enabled ? 'On' : 'Off'}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
