'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import type { PlaywrightConfig } from '@/features/ai/ai-paths/lib';
import {
  createDefaultPlaywrightConfig,
  normalizePlaywrightConfig,
} from '@/features/ai/ai-paths/lib/core/playwright/default-config';
import {
  CUSTOM_PLAYWRIGHT_SCRIPT_TEMPLATE,
  findPlaywrightScriptTemplate,
  findPlaywrightTemplateByScript,
  PLAYWRIGHT_SCRIPT_TEMPLATES,
} from '@/features/ai/ai-paths/lib/core/playwright/script-templates';
import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';
import { playwrightSettingsSchema } from '@/shared/contracts/playwright';
import { Button, Input, Label, LoadingState, SelectSimple, Textarea } from '@/shared/ui';

import { useAiPathConfig } from '../../AiPathConfigContext';

const RUNTIME_PERSONA_VALUE = '__runtime__';

const BROWSER_ENGINE_OPTIONS = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'webkit', label: 'WebKit' },
];

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
  } catch {
    return 'Invalid JSON';
  }
};

const stringifyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
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
  } catch {
    return null;
  }
};

export function PlaywrightNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();
  const personasQuery = usePlaywrightPersonas();
  const defaultPlaywrightConfig = useMemo(() => createDefaultPlaywrightConfig(), []);

  const playwrightConfig: PlaywrightConfig = useMemo(
    () =>
      normalizePlaywrightConfig(
        selectedNode?.type === 'playwright'
          ? selectedNode.config?.playwright
          : undefined
      ),
    [selectedNode?.config?.playwright, selectedNode?.type]
  );
  const selectedPersona =
    playwrightConfig.personaId
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
        issue?.path && issue.path.length > 0
          ? issue.path.join('.')
          : 'settingsOverrides';
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
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Playwright Persona</Label>
          <div className='text-[11px] text-gray-500'>
            Choose an existing persona to steer browser fidelity and behavior defaults.
          </div>
        </div>
        <Button
          asChild
          variant='outline'
          size='sm'
          className='border-border text-xs text-gray-200'
        >
          <Link href='/admin/settings/playwright'>Manage Personas</Link>
        </Button>
      </div>

      <SelectSimple
        size='sm'
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
      />

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
          <div className='text-[10px] uppercase tracking-wide text-sky-200'>Persona Fidelity</div>
          <div className='mt-1 flex flex-wrap gap-2 text-[11px] text-sky-100'>
            {selectedPersonaFidelity.map((entry) => (
              <span key={entry} className='rounded border border-sky-400/40 bg-sky-500/10 px-2 py-0.5'>
                {entry}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>Browser Engine</Label>
          <SelectSimple
            size='sm'
            value={playwrightConfig.browserEngine ?? 'chromium'}
            onValueChange={(value: string): void =>
              updateConfig({ browserEngine: value as PlaywrightConfig['browserEngine'] })
            }
            options={BROWSER_ENGINE_OPTIONS}
            className='mt-2'
          />
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Timeout (ms)</Label>
          <Input
            className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
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
          />
        </div>
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Start URL Template (optional)</Label>
        <Input
          className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={playwrightConfig.startUrlTemplate ?? ''}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
            updateConfig({ startUrlTemplate: event.target.value })
          }
          placeholder='https://example.com/{{entityId}}'
        />
      </div>

      <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
        <span>Wait for result</span>
        <Button
          type='button'
          className={`rounded border px-3 py-1 text-xs ${
            playwrightConfig.waitForResult !== false
              ? 'text-emerald-200 hover:bg-emerald-500/10'
              : 'text-gray-300 hover:bg-muted/50'
          }`}
          onClick={(): void =>
            updateConfig({ waitForResult: playwrightConfig.waitForResult === false })
          }
        >
          {playwrightConfig.waitForResult === false ? 'Disabled' : 'Enabled'}
        </Button>
      </div>

      <div>
        <div className='rounded-md border border-border/70 bg-card/40 px-3 py-3'>
          <div className='flex items-start justify-between gap-2'>
            <div>
              <Label className='text-xs text-gray-300'>Script Template</Label>
              <p className='mt-1 text-[11px] text-gray-500'>
                Start from a tested automation pattern and customize it.
              </p>
            </div>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='border-border text-[11px] text-gray-200'
              onClick={applyScriptTemplate}
              disabled={!selectedTemplate}
              data-doc-id='playwright_script_template_apply'
            >
              Apply Script Template
            </Button>
          </div>
          <SelectSimple
            className='mt-2'
            size='sm'
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
            options={scriptTemplateOptions}
            placeholder='Select script template'
            dataDocId='playwright_script_template_select'
            ariaLabel='Playwright script template'
          />
          {selectedTemplate ? (
            <p
              className='mt-2 text-[11px] text-gray-400'
              data-testid='playwright-script-template-description'
            >
              {selectedTemplate.description}
            </p>
          ) : (
            <p className='mt-2 text-[11px] text-gray-500'>
              Current script does not match a built-in template.
            </p>
          )}
        </div>
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Script</Label>
        <Textarea
          data-testid='playwright-script-editor'
          className='mt-2 min-h-[220px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
          value={playwrightConfig.script}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            updateConfig({ script: event.target.value })
          }
          placeholder='export default async function run({ page, input, emit, artifacts, log }) { ... }'
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Script must export a default async function. Use `emit("result", value)` to publish outputs.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>Launch Options (JSON)</Label>
          <Textarea
            className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
            value={playwrightConfig.launchOptionsJson ?? '{}'}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateConfig({ launchOptionsJson: event.target.value })
            }
          />
          {launchJsonError ? (
            <p className='mt-1 text-[11px] text-rose-300'>{launchJsonError}</p>
          ) : null}
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Context Options (JSON)</Label>
          <Textarea
            className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
            value={playwrightConfig.contextOptionsJson ?? '{}'}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateConfig({ contextOptionsJson: event.target.value })
            }
          />
          {contextJsonError ? (
            <p className='mt-1 text-[11px] text-rose-300'>{contextJsonError}</p>
          ) : null}
        </div>
      </div>

      <div>
        <div className='flex items-center justify-between gap-2'>
          <Label className='text-xs text-gray-400'>Settings Overrides (JSON)</Label>
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='border-border text-[11px] text-gray-200'
            onClick={applySettingsOverrides}
            disabled={Boolean(parsedSettingsOverrides.error)}
          >
            Apply overrides
          </Button>
        </div>
        <Textarea
          data-testid='playwright-settings-overrides-editor'
          className='mt-2 min-h-[120px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
          value={settingsOverridesDraft}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            setSettingsOverridesDraft(event.target.value)
          }
          onBlur={applySettingsOverrides}
        />
        <p className='mt-1 text-[11px] text-gray-500'>
          Merges into selected persona settings at runtime.
        </p>
        {parsedSettingsOverrides.error ? (
          <p className='mt-1 text-[11px] text-rose-300'>{parsedSettingsOverrides.error}</p>
        ) : null}
      </div>

      <div>
        <Label className='text-xs text-gray-400'>Capture Artifacts</Label>
        <div className='mt-2 grid gap-2 sm:grid-cols-2'>
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
                <span className='text-[10px] uppercase tracking-wide'>
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
