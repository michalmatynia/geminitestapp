'use client';

import { useEffect, useMemo, useState } from 'react';

import { KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO } from '@/features/kangur/ai-tutor-page-coverage-manifest';
import { DEFAULT_KANGUR_PAGE_CONTENT_STORE } from '@/features/kangur/page-content-catalog';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorSurface,
} from '@/shared/contracts/kangur-ai-tutor';
import {
  kangurPageContentPageKeySchema,
  parseKangurPageContentStore,
  type KangurPageContentEntry,
  type KangurPageContentPageKey,
  type KangurPageContentStore,
} from '@/shared/contracts/kangur-page-content';
import { api } from '@/shared/lib/api-client';
import {
  Alert,
  Badge,
  Button,
  Card,
  FormField,
  FormSection,
  Input,
  SelectSimple,
  Switch,
  Textarea,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

const AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE = 'pl';
const SETTINGS_SECTION_CLASS_NAME = 'border-border/60 bg-card/35 shadow-sm';
const SETTINGS_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-card/40 shadow-sm';
const SETTINGS_INSET_CARD_CLASS_NAME = 'rounded-2xl border-border/60 bg-background/60 shadow-sm';

const PAGE_KEY_OPTIONS = kangurPageContentPageKeySchema.options.map((value) => ({
  value,
  label: value,
  description: `Canonical Kangur page key: ${value}.`,
}));

const SURFACE_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: '__none__', label: 'None', description: 'No tutor surface override.' },
  { value: 'lesson', label: 'Lesson', description: 'Lesson surface context.' },
  { value: 'test', label: 'Test', description: 'Test surface context.' },
  { value: 'game', label: 'Game', description: 'Game surface context.' },
  { value: 'profile', label: 'Profile', description: 'Learner profile surface context.' },
  {
    value: 'parent_dashboard',
    label: 'Parent dashboard',
    description: 'Parent dashboard surface context.',
  },
  { value: 'auth', label: 'Auth', description: 'Authentication surface context.' },
];

const FOCUS_KIND_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
}> = [
  { value: '__none__', label: 'None', description: 'No explicit tutor focus kind.' },
  { value: 'selection', label: 'Selection', description: 'Selected-text focus.' },
  { value: 'hero', label: 'Hero', description: 'Hero block or top-level intro.' },
  { value: 'screen', label: 'Screen', description: 'Whole-screen context.' },
  { value: 'library', label: 'Library', description: 'Lesson or content library view.' },
  { value: 'empty_state', label: 'Empty state', description: 'Empty-state explanation.' },
  { value: 'navigation', label: 'Navigation', description: 'Navigation or chrome section.' },
  { value: 'lesson_header', label: 'Lesson header', description: 'Lesson heading section.' },
  { value: 'assignment', label: 'Assignment', description: 'Assignment section.' },
  { value: 'document', label: 'Document', description: 'Lesson document body.' },
  { value: 'home_actions', label: 'Home actions', description: 'Game home action cluster.' },
  { value: 'home_quest', label: 'Home quest', description: 'Game home quest cluster.' },
  {
    value: 'priority_assignments',
    label: 'Priority assignments',
    description: 'Priority-assignment section.',
  },
  { value: 'leaderboard', label: 'Leaderboard', description: 'Leaderboard section.' },
  { value: 'progress', label: 'Progress', description: 'Progress section.' },
  { value: 'question', label: 'Question', description: 'Question section.' },
  { value: 'review', label: 'Review', description: 'Review or explanation section.' },
  { value: 'summary', label: 'Summary', description: 'Summary section.' },
  { value: 'login_action', label: 'Login action', description: 'Login CTA or navigation action.' },
  {
    value: 'create_account_action',
    label: 'Create account action',
    description: 'Create-account CTA or form flow.',
  },
  {
    value: 'login_identifier_field',
    label: 'Login identifier field',
    description: 'Identifier field inside auth form.',
  },
  { value: 'login_form', label: 'Login form', description: 'Authentication form surface.' },
];

const stringifyPageContentStore = (store: KangurPageContentStore): string =>
  `${JSON.stringify(store, null, 2)}\n`;

const stringifyList = (values: readonly string[]): string => values.join('\n');

const parseList = (value: string): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const token of value.split(/\r?\n|,/g)) {
    const trimmed = token.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

const normalizeEntries = (entries: KangurPageContentEntry[]): KangurPageContentEntry[] =>
  entries.map((entry, index) => ({
    ...entry,
    sortOrder: (index + 1) * 10,
  }));

const createEntryId = (): string =>
  `page-content-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyEntry = (sortOrder: number): KangurPageContentEntry => ({
  id: createEntryId(),
  pageKey: 'Game',
  screenKey: 'custom',
  surface: 'game',
  route: '/game',
  componentId: 'custom-section',
  widget: 'CustomWidget',
  sourcePath: 'src/features/kangur/ui/pages/Game.tsx',
  title: 'Nowa sekcja',
  summary: 'Krotki opis nowej sekcji Kangur.',
  body: 'Pelny opis nowej sekcji Kangur do uzupelnienia przez administratora.',
  anchorIdPrefix: null,
  focusKind: 'screen',
  contentIdPrefixes: [],
  nativeGuideIds: [],
  triggerPhrases: [],
  tags: ['page-content'],
  notes: undefined,
  enabled: true,
  sortOrder,
});

const sanitizeRequiredInput = (value: string, fallback: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toNullableTrimmed = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toOptionalTrimmed = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

type ParsedEditorState = {
  store: KangurPageContentStore | null;
  error: string | null;
};

type ManifestCoverageRow = {
  id: string;
  pageKey: string;
  title: string;
  missingEntry: boolean;
  disabled: boolean;
  missingGuideLinks: string[];
};

export function KangurPageContentSettingsPanel(): React.JSX.Element {
  const { toast } = useToast();
  const [editorValue, setEditorValue] = useState(() =>
    stringifyPageContentStore(DEFAULT_KANGUR_PAGE_CONTENT_STORE)
  );
  const [persistedEditorValue, setPersistedEditorValue] = useState(() =>
    stringifyPageContentStore(DEFAULT_KANGUR_PAGE_CONTENT_STORE)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries[0]?.id ?? null
  );

  const isDirty = editorValue !== persistedEditorValue;

  const parsedState = useMemo<ParsedEditorState>(() => {
    try {
      return {
        store: parseKangurPageContentStore(JSON.parse(editorValue)),
        error: null,
      };
    } catch (error) {
      return {
        store: null,
        error: error instanceof Error ? error.message : 'Invalid page-content JSON.',
      };
    }
  }, [editorValue]);

  useEffect(() => {
    if (!parsedState.store || parsedState.store.entries.length === 0) {
      setSelectedEntryId(null);
      return;
    }

    if (!selectedEntryId) {
      setSelectedEntryId(parsedState.store.entries[0]?.id ?? null);
      return;
    }

    const stillExists = parsedState.store.entries.some((entry) => entry.id === selectedEntryId);
    if (!stillExists) {
      setSelectedEntryId(parsedState.store.entries[0]?.id ?? null);
    }
  }, [parsedState.store, selectedEntryId]);

  const selectedEntry = useMemo(
    () => parsedState.store?.entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [parsedState.store, selectedEntryId]
  );

  const manifestCoverage = useMemo(() => {
    if (!parsedState.store) {
      return null;
    }

    const entriesById = new Map(parsedState.store.entries.map((entry) => [entry.id, entry]));
    const rows: ManifestCoverageRow[] = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map(
      (section) => {
        const entry = entriesById.get(section.id);
        const missingGuideLinks = entry
          ? section.currentKnowledgeEntryIds.filter((guideId) => !entry.nativeGuideIds.includes(guideId))
          : [...section.currentKnowledgeEntryIds];

        return {
          id: section.id,
          pageKey: section.pageKey,
          title: section.title,
          missingEntry: !entry,
          disabled: entry?.enabled === false,
          missingGuideLinks,
        };
      }
    );
    const attentionRows = rows.filter(
      (row) => row.missingEntry || row.disabled || row.missingGuideLinks.length > 0
    );

    return {
      totalSections: rows.length,
      coveredSections: rows.length - attentionRows.length,
      attentionRows,
    };
  }, [parsedState.store]);

  const loadStore = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const store = await api.get<KangurPageContentStore>(
        `/api/kangur/ai-tutor/page-content?locale=${encodeURIComponent(
          AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE
        )}`,
        {
          cache: 'no-store',
        }
      );
      const parsed = parseKangurPageContentStore(store);
      const serialized = stringifyPageContentStore(parsed);
      setEditorValue(serialized);
      setPersistedEditorValue(serialized);
      setSelectedEntryId(parsed.entries[0]?.id ?? null);
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'Failed to load Kangur page content.',
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

  const applyStore = (nextStore: KangurPageContentStore): void => {
    setEditorValue(stringifyPageContentStore(parseKangurPageContentStore(nextStore)));
  };

  const updateSelectedEntry = (
    updater: (entry: KangurPageContentEntry) => KangurPageContentEntry
  ): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const nextEntry = updater(selectedEntry);
    applyStore({
      ...parsedState.store,
      entries: parsedState.store.entries.map((entry) =>
        entry.id === selectedEntry.id ? nextEntry : entry
      ),
    });
    setSelectedEntryId(nextEntry.id);
  };

  const handleAddEntry = (): void => {
    const baseStore = parsedState.store ?? DEFAULT_KANGUR_PAGE_CONTENT_STORE;
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

  const handleDuplicateSelectedEntry = (): void => {
    if (!parsedState.store || !selectedEntry) {
      return;
    }

    const duplicate: KangurPageContentEntry = {
      ...selectedEntry,
      id: createEntryId(),
      title: `${selectedEntry.title} kopia`,
      sortOrder: selectedEntry.sortOrder + 1,
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
    if (!removed) {
      return;
    }
    nextEntries.splice(nextIndex, 0, removed);
    applyStore({
      ...parsedState.store,
      entries: normalizeEntries(nextEntries),
    });
  };

  const handleResetToDefaults = (): void => {
    const serialized = stringifyPageContentStore(DEFAULT_KANGUR_PAGE_CONTENT_STORE);
    setEditorValue(serialized);
    setSelectedEntryId(DEFAULT_KANGUR_PAGE_CONTENT_STORE.entries[0]?.id ?? null);
  };

  const handleSave = async (): Promise<void> => {
    if (parsedState.error || !parsedState.store) {
      toast(parsedState.error ?? 'Page content JSON is invalid.', { variant: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await api.post<KangurPageContentStore>(
        '/api/kangur/ai-tutor/page-content',
        parsedState.store
      );
      const serialized = stringifyPageContentStore(parseKangurPageContentStore(saved));
      setEditorValue(serialized);
      setPersistedEditorValue(serialized);
      toast('Kangur page content saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save Kangur page content.', {
        variant: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FormSection
      title='AI Tutor Page Content'
      description='Edit the canonical Mongo section records that connect page anchors, content ids, and linked native-guide explanations.'
      className={SETTINGS_SECTION_CLASS_NAME}
    >
      <Card variant='subtle' padding='md' className={SETTINGS_CARD_CLASS_NAME}>
        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
          <div>
            <div className='flex items-center gap-2'>
              <div className='text-sm font-semibold text-foreground'>Canonical section layer</div>
              <Badge variant='secondary'>Locale {AI_TUTOR_PAGE_CONTENT_EDITOR_LOCALE}</Badge>
            </div>
            <p className='mt-1 text-sm text-muted-foreground'>
              Each record is a canonical Kangur page or section node. The tutor uses these ids for
              section targeting, while the knowledge graph links them to native guides.
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
              {isLoading ? 'Loading...' : 'Reload page content'}
            </Button>
            <Button variant='outline' size='sm' onClick={handleAddEntry} disabled={isSaving}>
              Add section
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
              disabled={isLoading || isSaving || !isDirty || Boolean(parsedState.error)}
            >
              {isSaving ? 'Saving page content...' : 'Save page content'}
            </Button>
          </div>
        </div>

        {parsedState.error ? (
          <Alert variant='error' title='Invalid page-content JSON' className='mt-4'>
            {parsedState.error}
          </Alert>
        ) : null}

        {manifestCoverage ? (
          <div className='mt-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-4 shadow-sm'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-sm font-semibold text-foreground'>Manifest coverage</div>
              <Badge
                variant={
                  manifestCoverage.attentionRows.length > 0 ? 'warning' : 'secondary'
                }
              >
                {manifestCoverage.coveredSections} / {manifestCoverage.totalSections} tracked
                sections covered
              </Badge>
              <Badge variant='outline'>
                {manifestCoverage.attentionRows.length > 0
                  ? `${manifestCoverage.attentionRows.length} need attention`
                  : 'No manifest gaps'}
              </Badge>
            </div>
            {manifestCoverage.attentionRows.length > 0 ? (
              <div className='mt-3 space-y-2'>
                {manifestCoverage.attentionRows.map((row) => (
                  <Alert
                    key={row.id}
                    variant={row.missingEntry || row.disabled ? 'warning' : 'default'}
                    title={`${row.pageKey}: ${row.title}`}
                    className='text-xs'
                  >
                    {row.missingEntry ? 'Missing page-content entry.' : null}
                    {!row.missingEntry && row.disabled ? 'Entry is disabled.' : null}
                    {row.missingGuideLinks.length > 0 ? (
                      <div>
                        Missing native guide links: {row.missingGuideLinks.join(', ')}
                      </div>
                    ) : null}
                  </Alert>
                ))}
              </div>
            ) : (
              <p className='mt-2 text-sm text-muted-foreground'>
                Every tracked Kangur section is backed by an enabled Mongo page-content entry with
                the expected native-guide links.
              </p>
            )}
          </div>
        ) : null}

        {parsedState.store ? (
          <div className='mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
            <Card variant='subtle' padding='md' className={SETTINGS_INSET_CARD_CLASS_NAME}>
              <div className='flex items-center justify-between gap-2'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>Section records</div>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    Select one canonical section id at a time.
                  </p>
                </div>
                <Badge variant='outline'>{parsedState.store.entries.length} entries</Badge>
              </div>

              <div className='mt-4 space-y-2'>
                {parsedState.store.entries.map((entry) => {
                  const isSelected = entry.id === selectedEntryId;
                  return (
                    <button
                      key={entry.id}
                      type='button'
                      onClick={() => setSelectedEntryId(entry.id)}
                      className={cn(
                        'w-full rounded-2xl border px-3 py-3 text-left transition-colors',
                        isSelected
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-border/60 bg-card/30 hover:bg-card/55'
                      )}
                    >
                      <div className='flex items-start justify-between gap-2'>
                        <div className='min-w-0'>
                          <div className='truncate text-sm font-medium text-foreground'>
                            {entry.title}
                          </div>
                          <div className='mt-1 truncate font-mono text-[11px] text-muted-foreground'>
                            {entry.id}
                          </div>
                        </div>
                        <div className='flex shrink-0 gap-1'>
                          <Badge variant='outline'>{entry.pageKey}</Badge>
                          {!entry.enabled ? <Badge variant='warning'>Disabled</Badge> : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card variant='subtle' padding='md' className={SETTINGS_INSET_CARD_CLASS_NAME}>
              {selectedEntry ? (
                <div className='space-y-4'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <div className='flex flex-wrap items-center gap-2'>
                        <div className='text-sm font-semibold text-foreground'>
                          Structured section editor
                        </div>
                        <Badge variant='secondary'>{selectedEntry.pageKey}</Badge>
                        <Badge variant='outline'>{selectedEntry.screenKey}</Badge>
                      </div>
                      <p className='mt-1 text-sm text-muted-foreground'>
                        This canonical id becomes the tutor section reference. Keep it stable once
                        the runtime starts using it.
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleMoveSelectedEntry(-1)}
                        disabled={isSaving}
                      >
                        Move up
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleMoveSelectedEntry(1)}
                        disabled={isSaving}
                      >
                        Move down
                      </Button>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleDuplicateSelectedEntry}
                        disabled={isSaving}
                      >
                        Duplicate
                      </Button>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={handleDeleteSelectedEntry}
                        disabled={isSaving || parsedState.store.entries.length <= 1}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className='grid gap-4 lg:grid-cols-2'>
                    <FormField
                      label='Canonical section id'
                      description='Stable record id used in knowledgeReference.sourceRecordId.'
                    >
                      <Input
                        aria-label='Canonical section id'
                        value={selectedEntry.id}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            id: sanitizeRequiredInput(event.target.value, entry.id),
                          }))
                        }
                      />
                    </FormField>

                    <FormField label='Title' description='Human-readable section label.'>
                      <Input
                        aria-label='Page content title'
                        value={selectedEntry.title}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            title: sanitizeRequiredInput(event.target.value, entry.title),
                          }))
                        }
                      />
                    </FormField>

                    <FormField label='Page key'>
                      <SelectSimple
                        value={selectedEntry.pageKey}
                        onValueChange={(value) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            pageKey: value as KangurPageContentPageKey,
                          }))
                        }
                        options={PAGE_KEY_OPTIONS}
                        ariaLabel='Page content page key'
                        variant='subtle'
                      />
                    </FormField>

                    <FormField label='Screen key'>
                      <Input
                        aria-label='Page content screen key'
                        value={selectedEntry.screenKey}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            screenKey: sanitizeRequiredInput(event.target.value, entry.screenKey),
                          }))
                        }
                      />
                    </FormField>

                    <FormField label='Surface'>
                      <SelectSimple
                        value={selectedEntry.surface ?? '__none__'}
                        onValueChange={(value) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            surface:
                              value === '__none__'
                                ? null
                                : (value as KangurAiTutorSurface),
                          }))
                        }
                        options={SURFACE_OPTIONS}
                        ariaLabel='Page content surface'
                        variant='subtle'
                      />
                    </FormField>

                    <FormField label='Focus kind'>
                      <SelectSimple
                        value={selectedEntry.focusKind ?? '__none__'}
                        onValueChange={(value) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            focusKind:
                              value === '__none__'
                                ? null
                                : (value as KangurAiTutorFocusKind),
                          }))
                        }
                        options={FOCUS_KIND_OPTIONS}
                        ariaLabel='Page content focus kind'
                        variant='subtle'
                      />
                    </FormField>

                    <FormField label='Route'>
                      <Input
                        aria-label='Page content route'
                        value={selectedEntry.route ?? ''}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            route: toNullableTrimmed(event.target.value),
                          }))
                        }
                        placeholder='/game'
                      />
                    </FormField>

                    <FormField label='Anchor id prefix'>
                      <Input
                        aria-label='Page content anchor id prefix'
                        value={selectedEntry.anchorIdPrefix ?? ''}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            anchorIdPrefix: toNullableTrimmed(event.target.value),
                          }))
                        }
                        placeholder='kangur-game-home-actions'
                      />
                    </FormField>

                    <FormField label='Component id'>
                      <Input
                        aria-label='Page content component id'
                        value={selectedEntry.componentId}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            componentId: sanitizeRequiredInput(
                              event.target.value,
                              entry.componentId
                            ),
                          }))
                        }
                      />
                    </FormField>

                    <FormField label='Widget'>
                      <Input
                        aria-label='Page content widget'
                        value={selectedEntry.widget}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            widget: sanitizeRequiredInput(event.target.value, entry.widget),
                          }))
                        }
                      />
                    </FormField>

                    <FormField label='Source path' className='lg:col-span-2'>
                      <Input
                        aria-label='Page content source path'
                        value={selectedEntry.sourcePath}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            sourcePath: sanitizeRequiredInput(
                              event.target.value,
                              entry.sourcePath
                            ),
                          }))
                        }
                      />
                    </FormField>

                    <FormField label='Summary' className='lg:col-span-2'>
                      <Textarea
                        aria-label='Page content summary'
                        value={selectedEntry.summary}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            summary: sanitizeRequiredInput(event.target.value, entry.summary),
                          }))
                        }
                        rows={3}
                      />
                    </FormField>

                    <FormField label='Body' className='lg:col-span-2'>
                      <Textarea
                        aria-label='Page content body'
                        value={selectedEntry.body}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            body: sanitizeRequiredInput(event.target.value, entry.body),
                          }))
                        }
                        rows={8}
                      />
                    </FormField>

                    <FormField label='Content id prefixes'>
                      <Textarea
                        aria-label='Page content content ids'
                        value={stringifyList(selectedEntry.contentIdPrefixes)}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            contentIdPrefixes: parseList(event.target.value),
                          }))
                        }
                        rows={4}
                      />
                    </FormField>

                    <FormField label='Linked native guide ids'>
                      <Textarea
                        aria-label='Page content native guide ids'
                        value={stringifyList(selectedEntry.nativeGuideIds)}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            nativeGuideIds: parseList(event.target.value),
                          }))
                        }
                        rows={4}
                      />
                    </FormField>

                    <FormField label='Trigger phrases'>
                      <Textarea
                        aria-label='Page content trigger phrases'
                        value={stringifyList(selectedEntry.triggerPhrases)}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            triggerPhrases: parseList(event.target.value),
                          }))
                        }
                        rows={4}
                      />
                    </FormField>

                    <FormField label='Tags'>
                      <Textarea
                        aria-label='Page content tags'
                        value={stringifyList(selectedEntry.tags)}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            tags: parseList(event.target.value),
                          }))
                        }
                        rows={4}
                      />
                    </FormField>

                    <FormField label='Notes' className='lg:col-span-2'>
                      <Textarea
                        aria-label='Page content notes'
                        value={selectedEntry.notes ?? ''}
                        onChange={(event) =>
                          updateSelectedEntry((entry) => ({
                            ...entry,
                            notes: toOptionalTrimmed(event.target.value),
                          }))
                        }
                        rows={4}
                      />
                    </FormField>
                  </div>

                  <div className='flex items-center justify-between rounded-2xl border border-border/60 bg-card/30 px-4 py-3'>
                    <div>
                      <div className='text-sm font-medium text-foreground'>Entry enabled</div>
                      <div className='text-xs text-muted-foreground'>
                        Disabled entries stay in Mongo but are ignored by runtime retrieval and
                        manifest coverage.
                      </div>
                    </div>
                    <Switch
                      checked={selectedEntry.enabled}
                      onCheckedChange={(checked: boolean) =>
                        updateSelectedEntry((entry) => ({
                          ...entry,
                          enabled: checked,
                        }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className='rounded-2xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground'>
                  Select a page-content entry to edit it.
                </div>
              )}
            </Card>
          </div>
        ) : null}

        <Card variant='subtle' padding='md' className={`${SETTINGS_INSET_CARD_CLASS_NAME} mt-4`}>
          <FormField
            label='Page content JSON'
            description='Raw mirror of the full canonical section document. Use this for bulk edits or direct structural changes.'
          >
            <Textarea
              value={editorValue}
              onChange={(event) => setEditorValue(event.target.value)}
              rows={20}
              aria-label='Page content JSON'
              spellCheck={false}
              className='font-mono text-xs'
            />
          </FormField>
          <div className='mt-2 text-xs text-muted-foreground'>
            {isDirty ? 'Unsaved page-content changes' : 'Page content in sync'}
          </div>
        </Card>
      </Card>
    </FormSection>
  );
}
