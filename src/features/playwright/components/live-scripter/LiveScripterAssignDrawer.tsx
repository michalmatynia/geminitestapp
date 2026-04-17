'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Link2, Plus } from 'lucide-react';

import {
  useSaveSelectorRegistryEntryMutation,
  useSelectorRegistry,
} from '@/features/integrations/hooks/useSelectorRegistry';
import type {
  SelectorRegistryEntry,
  SelectorRegistryNamespace,
} from '@/shared/contracts/integrations/selector-registry';
import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';
import {
  PLAYWRIGHT_STEP_TYPE_LABELS,
  type PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';
import {
  formatSelectorRegistryNamespaceLabel,
  getSelectorRegistryAdminHref,
  SELECTOR_REGISTRY_DEFAULT_PROFILES,
} from '@/shared/lib/browser-execution/selector-registry-metadata';
import {
  Badge,
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/ui/primitives.public';

import { useLiveScripterStepAppender } from './useLiveScripterStepAppender';

const STEP_TYPES = Object.entries(PLAYWRIGHT_STEP_TYPE_LABELS) as [PlaywrightStepType, string][];
const WRITABLE_SELECTOR_NAMESPACES: SelectorRegistryNamespace[] = ['tradera', 'amazon', '1688'];

const SELECTOR_STEP_TYPES = new Set<PlaywrightStepType>([
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'hover',
  'wait_for_selector',
  'assert_text',
  'assert_visible',
  'scroll',
  'upload_file',
]);
const VALUE_STEP_TYPES = new Set<PlaywrightStepType>([
  'fill',
  'select',
  'upload_file',
  'assert_text',
]);

const escapeAttributeValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildRegistryOverrideValueJson = (
  entry: SelectorRegistryEntry,
  selector: string
): string | null => {
  if (entry.valueType === 'string') return JSON.stringify(selector, null, 2);
  if (entry.valueType === 'string_array') return JSON.stringify([selector], null, 2);
  if (entry.valueType === 'nested_string_array') return JSON.stringify([[selector]], null, 2);
  return null;
};

const buildSelectorCandidates = (
  pickedElement: LiveScripterPickedElement
): Array<{ key: string; label: string; value: string }> => {
  const candidates: Array<{ key: string; label: string; value: string }> = [];
  if (
    typeof pickedElement.candidates.css === 'string' &&
    pickedElement.candidates.css.length > 0
  ) {
    candidates.push({
      key: 'css',
      label: 'CSS selector',
      value: pickedElement.candidates.css,
    });
  }

  const dataTestId = pickedElement.attrs['data-testid'];
  if (typeof dataTestId === 'string' && dataTestId.trim().length > 0) {
    candidates.push({
      key: 'testId',
      label: 'Data test id',
      value: `[data-testid="${escapeAttributeValue(dataTestId.trim())}"]`,
    });
  }

  if (
    typeof pickedElement.candidates.text === 'string' &&
    pickedElement.candidates.text.length > 0
  ) {
    candidates.push({
      key: 'text',
      label: 'Text locator',
      value: `text=${pickedElement.candidates.text}`,
    });
  }

  if (
    typeof pickedElement.candidates.xpath === 'string' &&
    pickedElement.candidates.xpath.length > 0
  ) {
    candidates.push({
      key: 'xpath',
      label: 'XPath locator',
      value: `xpath=${pickedElement.candidates.xpath}`,
    });
  }

  return candidates;
};

const buildDefaultStepName = (
  type: PlaywrightStepType,
  pickedElement: LiveScripterPickedElement
): string => {
  const target =
    pickedElement.textPreview ??
    pickedElement.role ??
    pickedElement.id ??
    pickedElement.tag;
  return `${PLAYWRIGHT_STEP_TYPE_LABELS[type]} ${target}`.trim();
};

type Props = {
  pickedElement: LiveScripterPickedElement | null;
  websiteId: string | null;
  flowId: string | null;
  initialRegistryNamespace?: SelectorRegistryNamespace;
  onStepAppended: () => void;
};

export function LiveScripterAssignDrawer({
  pickedElement,
  websiteId,
  flowId,
  initialRegistryNamespace = 'tradera',
  onStepAppended,
}: Props): React.JSX.Element {
  const appendStep = useLiveScripterStepAppender();
  const saveRegistryMutation = useSaveSelectorRegistryEntryMutation();

  const [stepType, setStepType] = useState<PlaywrightStepType>('click');
  const [stepName, setStepName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSelectorKey, setSelectedSelectorKey] = useState('');
  const [selectorBindingMode, setSelectorBindingMode] = useState<'literal' | 'selectorRegistry'>(
    'literal'
  );
  const [registryNamespace, setRegistryNamespace] =
    useState<SelectorRegistryNamespace>(initialRegistryNamespace);
  const [registryProfile, setRegistryProfile] = useState(
    SELECTOR_REGISTRY_DEFAULT_PROFILES[initialRegistryNamespace]
  );
  const [registryEntryKey, setRegistryEntryKey] = useState('');
  const [saveToRegistry, setSaveToRegistry] = useState(false);
  const [value, setValue] = useState('');
  const [url, setUrl] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [timeoutValue, setTimeoutValue] = useState('');
  const [script, setScript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const registryQuery = useSelectorRegistry({
    namespace: registryNamespace,
    effective: true,
  });

  const selectorCandidates = useMemo(
    () => (pickedElement === null ? [] : buildSelectorCandidates(pickedElement)),
    [pickedElement]
  );
  const selectedSelector =
    selectorCandidates.find((candidate) => candidate.key === selectedSelectorKey)?.value ?? null;

  const selectorRegistryEntries = useMemo(
    () =>
      (registryQuery.data?.entries ?? []).filter(
        (entry) =>
          entry.namespace === registryNamespace &&
          (entry.kind === 'selector' || entry.kind === 'selectors')
      ),
    [registryNamespace, registryQuery.data?.entries]
  );

  const registryProfiles = useMemo(
    () => Array.from(new Set(selectorRegistryEntries.map((entry) => entry.profile))).sort(),
    [selectorRegistryEntries]
  );

  const effectiveRegistryProfile = useMemo(() => {
    if (registryProfiles.includes(registryProfile)) {
      return registryProfile;
    }
    return registryProfiles[0] ?? SELECTOR_REGISTRY_DEFAULT_PROFILES[registryNamespace];
  }, [registryProfile, registryProfiles, registryNamespace]);

  const entriesForProfile = useMemo(
    () =>
      selectorRegistryEntries.filter((entry) => entry.profile === effectiveRegistryProfile),
    [effectiveRegistryProfile, selectorRegistryEntries]
  );

  const selectedRegistryEntry =
    entriesForProfile.find((entry) => entry.key === registryEntryKey) ?? null;

  useEffect(() => {
    setRegistryProfile(SELECTOR_REGISTRY_DEFAULT_PROFILES[registryNamespace]);
  }, [registryNamespace]);

  useEffect(() => {
    setRegistryEntryKey((current) => {
      if (entriesForProfile.some((entry) => entry.key === current)) {
        return current;
      }
      return entriesForProfile[0]?.key ?? '';
    });
  }, [entriesForProfile]);

  useEffect(() => {
    if (selectorCandidates.length === 0) {
      setSelectedSelectorKey('');
      return;
    }
    setSelectedSelectorKey((current) => {
      if (selectorCandidates.some((candidate) => candidate.key === current)) {
        return current;
      }
      return selectorCandidates[0]?.key ?? '';
    });
  }, [selectorCandidates]);

  useEffect(() => {
    if (pickedElement === null) {
      return;
    }
    setStepType('click');
    setStepName(buildDefaultStepName('click', pickedElement));
    setDescription('');
    setSelectorBindingMode('literal');
    setSaveToRegistry(false);
    setValue('');
    setUrl('');
    setKeyValue('');
    setTimeoutValue('');
    setScript('');
    setErrorMessage(null);
  }, [pickedElement]);

  useEffect(() => {
    if (pickedElement === null) {
      return;
    }
    setStepName((current) => {
      const normalized = current.trim();
      if (normalized.length === 0) {
        return buildDefaultStepName(stepType, pickedElement);
      }
      return current;
    });
  }, [pickedElement, stepType]);

  const needsSelector = SELECTOR_STEP_TYPES.has(stepType);
  const needsValue = VALUE_STEP_TYPES.has(stepType);

  const handleAppend = async (): Promise<void> => {
    if (pickedElement === null) {
      return;
    }

    const normalizedName = stepName.trim();
    if (normalizedName.length === 0) {
      setErrorMessage('Step name is required.');
      return;
    }

    if (needsSelector && selectedSelector === null) {
      setErrorMessage('Pick a selector candidate before appending the step.');
      return;
    }

    if (selectorBindingMode === 'selectorRegistry' && selectedRegistryEntry === null) {
      setErrorMessage('Choose an existing selector registry entry.');
      return;
    }

    let selectorNamespace: SelectorRegistryNamespace | null = null;
    let selectorKey: string | null = null;
    let selectorProfile: string | null = null;

    if (selectorBindingMode === 'selectorRegistry' && selectedRegistryEntry !== null) {
      selectorNamespace = selectedRegistryEntry.namespace;
      selectorKey = selectedRegistryEntry.key;
      selectorProfile = effectiveRegistryProfile;

      if (saveToRegistry) {
        const valueJson =
          selectedSelector === null
            ? null
            : buildRegistryOverrideValueJson(selectedRegistryEntry, selectedSelector);
        if (valueJson === null) {
          setErrorMessage(
            'The selected registry entry cannot be overridden from a single selector.'
          );
          return;
        }

        const result = await saveRegistryMutation.mutateAsync({
          namespace: selectorNamespace,
          profile: selectorProfile,
          key: selectorKey,
          valueJson,
        });
        selectorNamespace = result.namespace;
        selectorKey = result.key;
        selectorProfile = result.profile;
      }
    }

    appendStep({
      name: normalizedName,
      description,
      type: stepType,
      selector: needsSelector ? selectedSelector : null,
      selectorBindingMode,
      selectorNamespace,
      selectorKey,
      selectorProfile,
      value: needsValue ? value : null,
      url: stepType === 'navigate' || stepType === 'assert_url' ? url : null,
      key: stepType === 'press_key' ? keyValue : null,
      timeout:
        stepType === 'wait_for_timeout' || stepType === 'wait_for_selector'
          ? (() => {
              const parsedTimeout = Number(timeoutValue);
              return Number.isFinite(parsedTimeout) && parsedTimeout > 0
                ? parsedTimeout
                : null;
            })()
          : null,
      script: stepType === 'custom_script' ? script : null,
      websiteId,
      flowId,
    });

    setErrorMessage(null);
    onStepAppended();
  };

  return (
    <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
      <div className='space-y-1'>
        <h2 className='text-sm font-semibold'>Assign Step</h2>
        <p className='text-xs text-muted-foreground'>
          Pick an element from the live preview and append a real sequencer step bound to that
          selector.
        </p>
      </div>

      {pickedElement === null ? (
        <div className='rounded-md border border-dashed border-white/10 p-4 text-sm text-muted-foreground'>
          Switch to Pick mode and click an element in the live preview.
        </div>
      ) : (
        <>
          <div className='rounded-md border border-white/10 bg-black/20 p-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline'>{pickedElement.tag}</Badge>
              {typeof pickedElement.role === 'string' && pickedElement.role.length > 0 ? (
                <Badge variant='outline'>{pickedElement.role}</Badge>
              ) : null}
              {typeof pickedElement.id === 'string' && pickedElement.id.length > 0 ? (
                <Badge variant='outline'>#{pickedElement.id}</Badge>
              ) : null}
            </div>
            {typeof pickedElement.textPreview === 'string' &&
            pickedElement.textPreview.length > 0 ? (
              <div className='mt-2 text-sm text-muted-foreground'>{pickedElement.textPreview}</div>
            ) : null}
          </div>

          <div className='space-y-2'>
            <Label htmlFor='live-scripter-step-name'>Step name</Label>
            <Input
              id='live-scripter-step-name'
              value={stepName}
              onChange={(event) => setStepName(event.target.value)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='live-scripter-step-type'>Step type</Label>
            <Select
              value={stepType}
              onValueChange={(nextValue) => setStepType(nextValue as PlaywrightStepType)}
            >
              <SelectTrigger id='live-scripter-step-type'>
                <SelectValue placeholder='Choose step type' />
              </SelectTrigger>
              <SelectContent>
                {STEP_TYPES.map(([stepTypeValue, label]) => (
                  <SelectItem key={stepTypeValue} value={stepTypeValue}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsSelector ? (
            <>
              <div className='space-y-2'>
                <Label htmlFor='live-scripter-selector-candidate'>Captured selector</Label>
                <Select
                  value={selectedSelectorKey}
                  onValueChange={setSelectedSelectorKey}
                  disabled={selectorCandidates.length === 0}
                >
                  <SelectTrigger id='live-scripter-selector-candidate'>
                    <SelectValue placeholder='Choose selector candidate' />
                  </SelectTrigger>
                  <SelectContent>
                    {selectorCandidates.map((candidate) => (
                      <SelectItem key={candidate.key} value={candidate.key}>
                        {candidate.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {typeof selectedSelector === 'string' && selectedSelector.length > 0 ? (
                  <div className='rounded-md border border-white/10 bg-black/20 p-2 text-xs text-muted-foreground'>
                    {selectedSelector}
                  </div>
                ) : null}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='live-scripter-binding-mode'>Selector binding</Label>
                <Select
                  value={selectorBindingMode}
                  onValueChange={(nextValue) =>
                    setSelectorBindingMode(nextValue as 'literal' | 'selectorRegistry')
                  }
                >
                  <SelectTrigger id='live-scripter-binding-mode'>
                    <SelectValue placeholder='Choose binding mode' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='literal'>Literal selector</SelectItem>
                    <SelectItem value='selectorRegistry'>Selector registry binding</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectorBindingMode === 'selectorRegistry' ? (
                <div className='space-y-3 rounded-md border border-white/10 bg-black/20 p-3'>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label htmlFor='live-scripter-registry-namespace'>Registry</Label>
                      <Select
                        value={registryNamespace}
                        onValueChange={(nextValue) =>
                          setRegistryNamespace(nextValue as SelectorRegistryNamespace)
                        }
                      >
                        <SelectTrigger id='live-scripter-registry-namespace'>
                          <SelectValue placeholder='Choose registry' />
                        </SelectTrigger>
                        <SelectContent>
                          {WRITABLE_SELECTOR_NAMESPACES.map((namespace) => (
                            <SelectItem key={namespace} value={namespace}>
                              {formatSelectorRegistryNamespaceLabel(namespace)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='live-scripter-registry-profile'>Profile</Label>
                      <Select value={effectiveRegistryProfile} onValueChange={setRegistryProfile}>
                        <SelectTrigger id='live-scripter-registry-profile'>
                          <SelectValue placeholder='Choose profile' />
                        </SelectTrigger>
                        <SelectContent>
                          {registryProfiles.length > 0 ? (
                            registryProfiles.map((profile) => (
                              <SelectItem key={profile} value={profile}>
                                {profile}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value={effectiveRegistryProfile}>
                              {effectiveRegistryProfile}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='live-scripter-registry-entry'>Registry entry</Label>
                    <Select
                      value={registryEntryKey}
                      onValueChange={setRegistryEntryKey}
                      disabled={entriesForProfile.length === 0}
                    >
                      <SelectTrigger id='live-scripter-registry-entry'>
                        <SelectValue placeholder='Choose existing selector entry' />
                      </SelectTrigger>
                      <SelectContent>
                        {entriesForProfile.map((entry) => (
                          <SelectItem key={entry.key} value={entry.key}>
                            {entry.key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='flex items-start gap-2 rounded-md border border-dashed border-white/10 p-3'>
                    <Checkbox
                      id='live-scripter-registry-save'
                      checked={saveToRegistry}
                      onCheckedChange={(checked) => setSaveToRegistry(checked === true)}
                      disabled={selectedRegistryEntry === null}
                    />
                    <div className='space-y-1'>
                      <Label htmlFor='live-scripter-registry-save'>Save selector override</Label>
                      <p className='text-xs text-muted-foreground'>
                        Reuse the selected registry key and save the captured selector into the
                        chosen profile.
                      </p>
                    </div>
                  </div>

                  <Button asChild type='button' size='sm' variant='outline'>
                    <Link href={getSelectorRegistryAdminHref(registryNamespace)}>
                      <Link2 className='mr-2 size-4' />
                      Open Registry
                    </Link>
                  </Button>
                </div>
              ) : null}
            </>
          ) : null}

          {needsValue ? (
            <div className='space-y-2'>
              <Label htmlFor='live-scripter-value'>Value</Label>
              <Input
                id='live-scripter-value'
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </div>
          ) : null}

          {stepType === 'navigate' || stepType === 'assert_url' ? (
            <div className='space-y-2'>
              <Label htmlFor='live-scripter-url'>URL</Label>
              <Input
                id='live-scripter-url'
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
          ) : null}

          {stepType === 'press_key' ? (
            <div className='space-y-2'>
              <Label htmlFor='live-scripter-key'>Key</Label>
              <Input
                id='live-scripter-key'
                value={keyValue}
                onChange={(event) => setKeyValue(event.target.value)}
                placeholder='Enter, Tab, Escape...'
              />
            </div>
          ) : null}

          {stepType === 'wait_for_timeout' || stepType === 'wait_for_selector' ? (
            <div className='space-y-2'>
              <Label htmlFor='live-scripter-timeout'>Timeout (ms)</Label>
              <Input
                id='live-scripter-timeout'
                type='number'
                value={timeoutValue}
                onChange={(event) => setTimeoutValue(event.target.value)}
              />
            </div>
          ) : null}

          {stepType === 'custom_script' ? (
            <div className='space-y-2'>
              <Label htmlFor='live-scripter-script'>Script</Label>
              <Textarea
                id='live-scripter-script'
                value={script}
                onChange={(event) => setScript(event.target.value)}
                className='min-h-[140px]'
              />
            </div>
          ) : null}

          <div className='space-y-2'>
            <Label htmlFor='live-scripter-description'>Description</Label>
            <Textarea
              id='live-scripter-description'
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className='min-h-[84px]'
            />
          </div>

          {typeof errorMessage === 'string' && errorMessage.length > 0 ? (
            <div className='text-sm text-red-400'>{errorMessage}</div>
          ) : null}

          <Button
            type='button'
            onClick={() => {
              handleAppend().catch(() => undefined);
            }}
            disabled={saveRegistryMutation.isPending}
          >
            <Plus className='mr-2 size-4' />
            Append Step
          </Button>
        </>
      )}
    </div>
  );
}
