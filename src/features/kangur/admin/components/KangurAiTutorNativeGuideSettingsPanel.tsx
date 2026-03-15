'use client';

import { useEffect, useMemo, useState } from 'react';

import { KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO } from '@/features/kangur/ai-tutor-page-coverage-manifest';
import {
  validateKangurAiTutorOnboardingStore,
} from '@/features/kangur/ai-tutor-onboarding-validation';
import type { KangurAiTutorFollowUpAction } from '@/shared/contracts/kangur-ai-tutor';
import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  parseKangurAiTutorNativeGuideStore,
  type KangurAiTutorNativeGuideEntry,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { PROMPT_ENGINE_SETTINGS_KEY } from '@/shared/contracts/prompt-engine';
import { VALIDATOR_PATTERN_LISTS_KEY, parseValidatorPatternLists } from '@/shared/contracts/validator';
import { api } from '@/shared/lib/api-client';
import { parsePromptEngineSettings } from '@/shared/lib/prompt-engine/settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button, Card, FormField, FormSection, Textarea, useToast } from '@/shared/ui';

import { KangurAiTutorNativeGuideEntryEditor } from './KangurAiTutorNativeGuideEntryEditor';
import { KangurAiTutorNativeGuideEntryList } from './KangurAiTutorNativeGuideEntryList';
import { KangurAiTutorNativeGuideValidationSummary } from './KangurAiTutorNativeGuideValidationSummary';

const AI_TUTOR_NATIVE_GUIDE_EDITOR_LOCALE = 'pl';
const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const SETTINGS_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-card/40 shadow-sm';
const SETTINGS_INSET_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-background/60 shadow-sm';

const ROUTE_PAGE_OPTIONS = ['Game', 'Lessons', 'ParentDashboard', 'LearnerProfile'] as const;

const stringifyNativeGuideStore = (store: KangurAiTutorNativeGuideStore): string =>
  `${JSON.stringify(store, null, 2)}\n`;

const stringifyFollowUpActions = (actions: KangurAiTutorFollowUpAction[]): string =>
  actions.length > 0 ? `${JSON.stringify(actions, null, 2)}\n` : '';

const createEntryId = (): string => `guide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyEntry = (sortOrder: number): KangurAiTutorNativeGuideEntry => ({
  id: createEntryId(),
  surface: null,
  focusKind: null,
  focusIdPrefixes: [],
  contentIdPrefixes: [],
  title: 'Nowy wpis',
  shortDescription: 'Krótki opis nowej sekcji Kangur.',
  fullDescription: 'Pełny opis nowej sekcji Kangur do uzupełnienia przez administratora.',
  hints: [],
  relatedGames: [],
  relatedTests: [],
  followUpActions: [],
  triggerPhrases: [],
  enabled: true,
  sortOrder,
});

const normalizeEntries = (
  entries: KangurAiTutorNativeGuideEntry[]
): KangurAiTutorNativeGuideEntry[] =>
  entries.map((entry, index) => ({
    ...entry,
    sortOrder: (index + 1) * 10,
  }));

type ParsedEditorState = {
  store: KangurAiTutorNativeGuideStore | null;
  error: string | null;
};

type NativeGuideManifestCoverageRow = {
  id: string;
  pageKey: string;
  title: string;
  missingGuideIds: string[];
  disabledGuideIds: string[];
};

export function KangurAiTutorNativeGuideSettingsPanel(): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const [editorValue, setEditorValue] = useState<string>(() =>
    stringifyNativeGuideStore(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE)
  );
  const [persistedEditorValue, setPersistedEditorValue] = useState<string>(() =>
    stringifyNativeGuideStore(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [followUpActionsEditorValue, setFollowUpActionsEditorValue] = useState('');
  const validatorPatternListsRaw = settingsStore.get(VALIDATOR_PATTERN_LISTS_KEY);
  const promptEngineSettingsRaw = settingsStore.get(PROMPT_ENGINE_SETTINGS_KEY);

  const isDirty = editorValue !== persistedEditorValue;

  const parsedState = useMemo<ParsedEditorState>(() => {
    try {
      return {
        store: parseKangurAiTutorNativeGuideStore(JSON.parse(editorValue)),
        error: null,
      };
    } catch (error) {
      return {
        store: null,
        error: error instanceof Error ? error.message : 'Invalid native guide JSON.',
      };
    }
  }, [editorValue]);

  useEffect(() => {
    const firstEntryId = parsedState.store?.entries[0]?.id ?? null;
    if (!parsedState.store || parsedState.store.entries.length === 0) {
      if (selectedEntryId !== null) {
        setSelectedEntryId(null);
      }
      return;
    }

    if (!selectedEntryId) {
      setSelectedEntryId(firstEntryId);
      return;
    }

    const stillExists = parsedState.store.entries.some((entry) => entry.id === selectedEntryId);
    if (!stillExists) {
      setSelectedEntryId(firstEntryId);
    }
  }, [parsedState.store, selectedEntryId]);

  const selectedEntry = useMemo(
    () => parsedState.store?.entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [parsedState.store, selectedEntryId]
  );
  const validationResult = useMemo(
    () =>
      parsedState.store
        ? validateKangurAiTutorOnboardingStore({
          store: parsedState.store,
          patternLists: parseValidatorPatternLists(validatorPatternListsRaw),
          promptEngineSettings: parsePromptEngineSettings(promptEngineSettingsRaw),
        })
        : null,
    [parsedState.store, promptEngineSettingsRaw, validatorPatternListsRaw]
  );
  const validationIssues = validationResult?.issues ?? [];
  const blockingValidationIssues = validationResult?.blockingIssues ?? [];
  const hasBlockingValidationIssues = blockingValidationIssues.length > 0;
  const collectionValidationIssues = useMemo(
    () => validationIssues.filter((issue) => issue.entryId === null),
    [validationIssues]
  );
  const selectedEntryValidationIssues = useMemo(
    () => validationIssues.filter((issue) => issue.entryId === selectedEntryId),
    [selectedEntryId, validationIssues]
  );
  const entryValidationCounts = useMemo(() => {
    const counts = new Map<string, { total: number; blocking: number }>();
    for (const issue of validationIssues) {
      if (!issue.entryId) continue;
      const current = counts.get(issue.entryId) ?? { total: 0, blocking: 0 };
      counts.set(issue.entryId, {
        total: current.total + 1,
        blocking: current.blocking + (issue.blocking ? 1 : 0),
      });
    }
    return counts;
  }, [validationIssues]);
  const manifestCoverage = useMemo(() => {
    if (!parsedState.store) {
      return null;
    }

    const entriesById = new Map(parsedState.store.entries.map((entry) => [entry.id, entry]));
    const rows: NativeGuideManifestCoverageRow[] = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map(
      (section) => {
        const missingGuideIds = section.currentKnowledgeEntryIds.filter((entryId) => !entriesById.has(entryId));
        const disabledGuideIds = section.currentKnowledgeEntryIds.filter(
          (entryId) => entriesById.get(entryId)?.enabled === false
        );

        return {
          id: section.id,
          pageKey: section.pageKey,
          title: section.title,
          missingGuideIds,
          disabledGuideIds,
        };
      }
    );
    const attentionRows = rows.filter(
      (row) => row.missingGuideIds.length > 0 || row.disabledGuideIds.length > 0
    );

    return {
      totalSections: rows.length,
      coveredSections: rows.length - attentionRows.length,
      attentionRows,
    };
  }, [parsedState.store]);

  useEffect(() => {
    setFollowUpActionsEditorValue(
      selectedEntry ? stringifyFollowUpActions(selectedEntry.followUpActions) : ''
    );
  }, [selectedEntry]);

  const loadStore = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const store = await api.get<KangurAiTutorNativeGuideStore>(
        `/api/kangur/ai-tutor/native-guide?locale=${encodeURIComponent(
          AI_TUTOR_NATIVE_GUIDE_EDITOR_LOCALE
        )}`,
        {
          cache: 'no-store',
        }
      );
      const parsed = parseKangurAiTutorNativeGuideStore(store);
      const serialized = stringifyNativeGuideStore(parsed);
      setEditorValue(serialized);
      setPersistedEditorValue(serialized);
      setSelectedEntryId(parsed.entries[0]?.id ?? null);
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to load Kangur AI Tutor native guides.',
        {
          variant: 'error',
        }
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStore();
  }, []);

  const applyStore = (nextStore: KangurAiTutorNativeGuideStore): void => {
    const normalized = parseKangurAiTutorNativeGuideStore(nextStore);
    setEditorValue(stringifyNativeGuideStore(normalized));
  };

  const updateSelectedEntry = (
    updater: (entry: KangurAiTutorNativeGuideEntry) => KangurAiTutorNativeGuideEntry
  ): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    applyStore({
      ...parsedState.store,
      entries: parsedState.store.entries.map((entry) =>
        entry.id === selectedEntry.id ? updater(entry) : entry
      ),
    });
  };

  const handleAddEntry = (): void => {
    const baseStore =
      parsedState.store ??
      parseKangurAiTutorNativeGuideStore(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE);
    const nextEntries = normalizeEntries([
      ...baseStore.entries,
      createEmptyEntry((baseStore.entries.length + 1) * 10),
    ]);
    const nextEntry = nextEntries[nextEntries.length - 1] ?? null;
    applyStore({
      ...baseStore,
      entries: nextEntries,
    });
    setSelectedEntryId(nextEntry?.id ?? null);
  };

  const handleDeleteSelectedEntry = (): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const nextEntries = normalizeEntries(
      parsedState.store.entries.filter((entry) => entry.id !== selectedEntry.id)
    );
    applyStore({
      ...parsedState.store,
      entries: nextEntries,
    });
    setSelectedEntryId(nextEntries[0]?.id ?? null);
  };

  const handleDuplicateSelectedEntry = (): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const duplicate: KangurAiTutorNativeGuideEntry = {
      ...selectedEntry,
      id: createEntryId(),
      title: `${selectedEntry.title} kopia`,
    };
    const currentIndex = parsedState.store.entries.findIndex((entry) => entry.id === selectedEntry.id);
    const nextEntries = [...parsedState.store.entries];
    nextEntries.splice(currentIndex + 1, 0, duplicate);
    const normalizedEntries = normalizeEntries(nextEntries);
    applyStore({
      ...parsedState.store,
      entries: normalizedEntries,
    });
    setSelectedEntryId(duplicate.id);
  };

  const handleMoveSelectedEntry = (direction: -1 | 1): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const currentIndex = parsedState.store.entries.findIndex((entry) => entry.id === selectedEntry.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= parsedState.store.entries.length) {
      return;
    }

    const nextEntries = [...parsedState.store.entries];
    const [removed] = nextEntries.splice(currentIndex, 1);
    const removedEntry = removed;
    if (!removedEntry) {
      return;
    }
    nextEntries.splice(nextIndex, 0, removedEntry);
    applyStore({
      ...parsedState.store,
      entries: normalizeEntries(nextEntries),
    });
  };

  const handleResetToDefaults = (): void => {
    const serialized = stringifyNativeGuideStore(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE);
    setEditorValue(serialized);
    setSelectedEntryId(DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.entries[0]?.id ?? null);
  };

  const handleSave = async (): Promise<void> => {
    if (hasBlockingValidationIssues) {
      toast('Resolve blocking AI Tutor onboarding validation issues before saving.', {
        variant: 'error',
      });
      return;
    }
    setIsSaving(true);
    try {
      const parsed = parseKangurAiTutorNativeGuideStore(JSON.parse(editorValue));
      const saved = await api.post<KangurAiTutorNativeGuideStore>(
        '/api/kangur/ai-tutor/native-guide',
        parsed
      );
      const normalized = stringifyNativeGuideStore(parseKangurAiTutorNativeGuideStore(saved));
      setEditorValue(normalized);
      setPersistedEditorValue(normalized);
      toast('Kangur AI Tutor native guides saved.', {
        variant: 'success',
      });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to save Kangur AI Tutor native guides.',
        {
          variant: 'error',
        }
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyFollowUpActions = (): void => {
    if (!selectedEntry) {
      return;
    }

    try {
      const nextValue = followUpActionsEditorValue.trim();
      const parsedActions = nextValue.length > 0
        ? (JSON.parse(nextValue) as KangurAiTutorFollowUpAction[])
        : [];

      const invalidPage = parsedActions.find(
        (action) =>
          typeof action?.page !== 'string' ||
          !ROUTE_PAGE_OPTIONS.some((page) => page === action.page)
      );
      if (invalidPage) {
        throw new Error('Each follow-up action must use a supported Kangur page.');
      }

      updateSelectedEntry((entry) => ({
        ...entry,
        followUpActions: parsedActions,
      }));
      toast('Follow-up actions updated for this native guide entry.', {
        variant: 'success',
      });
    } catch (error) {
      toast(
        error instanceof Error
          ? error.message
          : 'Failed to parse follow-up actions JSON.',
        {
          variant: 'error',
        }
      );
    }
  };

  return (
    <FormSection
      title='AI Tutor Native Guides'
      description='Edit the database-backed Kangur page, section, game, and test descriptions used by AI Tutor before any model call.'
      className={SETTINGS_SECTION_CLASS_NAME}
    >
      <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='text-sm font-semibold text-foreground'>Native guide knowledge base</div>
              <Badge variant='secondary'>Locale {AI_TUTOR_NATIVE_GUIDE_EDITOR_LOCALE}</Badge>
              {parsedState.store ? (
                <Badge variant='outline'>{parsedState.store.entries.length} entries</Badge>
              ) : (
                <Badge variant='warning'>Invalid JSON</Badge>
              )}
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              This store powers deterministic tutor answers for Kangur page guidance, section
              explanations, and non-spoiler game/test hints. Use the structured editor for daily
              editing and raw JSON only for advanced bulk changes.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void loadStore();
              }}
              disabled={isLoading || isSaving}
            >
              {isLoading ? 'Loading...' : 'Reload native guides'}
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={handleAddEntry}
              disabled={isSaving}
            >
              Add entry
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResetToDefaults}
              disabled={isSaving}
            >
              Reset to defaults
            </Button>
            <Button
              size='sm'
              onClick={() => {
                void handleSave();
              }}
              disabled={isLoading || isSaving || !isDirty || hasBlockingValidationIssues}
            >
              {isSaving ? 'Saving native guides...' : 'Save native guides'}
            </Button>
          </div>
        </div>

        {validationResult ? (
          <KangurAiTutorNativeGuideValidationSummary
            listName={validationResult.listName}
            ruleCount={validationResult.ruleIds.length}
            totalIssues={validationIssues.length}
            blockingIssueCount={blockingValidationIssues.length}
            collectionIssues={collectionValidationIssues}
          />
        ) : null}

        {manifestCoverage ? (
          <Card variant='subtle' padding='md' className='mt-4 rounded-2xl border-border/60 bg-background/60 shadow-sm'>
            <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
              <div>
                <div className='text-sm font-semibold text-foreground'>Manifest coverage</div>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Compares the current Mongo native-guide store against every tracked Kangur page
                  section in the coverage manifest.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Badge
                  variant={
                    manifestCoverage.attentionRows.length === 0 ? 'secondary' : 'warning'
                  }
                >
                  {manifestCoverage.coveredSections} / {manifestCoverage.totalSections} tracked
                  sections covered
                </Badge>
                <Badge
                  variant={
                    manifestCoverage.attentionRows.length === 0 ? 'outline' : 'warning'
                  }
                >
                  {manifestCoverage.attentionRows.length === 0
                    ? 'No manifest gaps'
                    : manifestCoverage.attentionRows.length === 1
                      ? '1 section needs attention'
                      : `${manifestCoverage.attentionRows.length} sections need attention`}
                </Badge>
              </div>
            </div>

            {manifestCoverage.attentionRows.length > 0 ? (
              <div className='mt-3 space-y-2'>
                {manifestCoverage.attentionRows.slice(0, 8).map((row) => (
                  <div
                    key={row.id}
                    className='rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-950'
                  >
                    <div className='font-semibold'>
                      {row.pageKey}: {row.title}
                    </div>
                    {row.missingGuideIds.length > 0 ? (
                      <div className='mt-1'>
                        Missing guide ids: {row.missingGuideIds.join(', ')}
                      </div>
                    ) : null}
                    {row.disabledGuideIds.length > 0 ? (
                      <div className='mt-1'>
                        Disabled guide ids: {row.disabledGuideIds.join(', ')}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className='mt-3 text-sm text-muted-foreground'>
                Every tracked Kangur section is backed by an enabled Mongo native-guide entry.
              </p>
            )}
          </Card>
        ) : null}

        {parsedState.store ? (
          <div className='mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]'>
            <KangurAiTutorNativeGuideEntryList
              entries={parsedState.store.entries}
              selectedEntryId={selectedEntryId}
              onSelect={setSelectedEntryId}
              entryValidationCounts={entryValidationCounts}
              className={SETTINGS_INSET_CARD_CLASS_NAME}
            />

            <KangurAiTutorNativeGuideEntryEditor
              selectedEntry={selectedEntry}
              totalEntries={parsedState.store.entries.length}
              isSaving={isSaving}
              selectedEntryValidationIssues={selectedEntryValidationIssues}
              followUpActionsEditorValue={followUpActionsEditorValue}
              onFollowUpActionsEditorValueChange={setFollowUpActionsEditorValue}
              updateSelectedEntry={updateSelectedEntry}
              onDuplicate={handleDuplicateSelectedEntry}
              onMove={handleMoveSelectedEntry}
              onDelete={handleDeleteSelectedEntry}
              onApplyFollowUpActions={handleApplyFollowUpActions}
              className={SETTINGS_INSET_CARD_CLASS_NAME}
            />
          </div>
        ) : (
          <Card variant='subtle' padding='md' className='mt-4 rounded-2xl border-border/60 bg-amber-50/60 text-sm text-amber-900 shadow-sm'>
            Structured editing is temporarily disabled because the raw guide JSON is invalid.
            Fix the JSON below or reload the store from Mongo first.
          </Card>
        )}

        <FormField
          label='Advanced JSON editor'
          description='Raw mirror of the full native guide document. Use this for bulk edits or direct structural changes.'
          className='mt-4'
        >
          <Textarea
            value={editorValue}
            onChange={(event) => setEditorValue(event.target.value)}
            rows={22}
            spellCheck={false}
            aria-label='Native guide JSON'
            className='font-mono text-xs leading-6'
           title='Advanced JSON editor'/>
        </FormField>

        <div className='mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
          <Badge variant={isDirty ? 'warning' : 'outline'}>
            {isDirty ? 'Unsaved native guide changes' : 'Native guide in sync'}
          </Badge>
          {validationResult ? (
            <Badge variant={hasBlockingValidationIssues ? 'warning' : 'outline'}>
              {hasBlockingValidationIssues
                ? `${blockingValidationIssues.length} blocking onboarding issues`
                : 'Onboarding validation clean'}
            </Badge>
          ) : null}
          {parsedState.error ? <span>Validation: {parsedState.error}</span> : null}
          <span>Endpoint: /api/kangur/ai-tutor/native-guide</span>
        </div>
      </Card>
    </FormSection>
  );
}
