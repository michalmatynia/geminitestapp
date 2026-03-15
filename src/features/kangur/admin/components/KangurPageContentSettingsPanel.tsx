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
  type KangurPageContentFragment,
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
  Textarea,
} from '@/shared/ui';
import { useKangurPageContentMutations } from '../hooks/useKangurPageContentMutations';
import { KangurPageContentEntryEditor } from './KangurPageContentEntryEditor';
import { KangurPageContentEntryList } from './KangurPageContentEntryList';
import { KangurPageContentManifestCoverage } from './KangurPageContentManifestCoverage';

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

const normalizeFragments = (
  fragments: KangurPageContentFragment[]
): KangurPageContentFragment[] =>
  fragments.map((fragment, index) => ({
    ...fragment,
    sortOrder: (index + 1) * 10,
  }));

const createEntryId = (): string =>
  `page-content-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createFragmentId = (): string =>
  `fragment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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
  summary: 'Krótki opis nowej sekcji Kangur.',
  body: 'Pełny opis nowej sekcji Kangur do uzupełnienia przez administratora.',
  anchorIdPrefix: null,
  focusKind: 'screen',
  contentIdPrefixes: [],
  nativeGuideIds: [],
  triggerPhrases: [],
  fragments: [],
  tags: ['page-content'],
  notes: undefined,
  enabled: true,
  sortOrder,
});

const createEmptyFragment = (sortOrder: number): KangurPageContentFragment => ({
  id: createFragmentId(),
  text: 'Nowy fragment',
  aliases: [],
  explanation: 'Wyjaśnienie wybranego fragmentu dla AI Tutora.',
  nativeGuideIds: [],
  triggerPhrases: [],
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

export function KangurPageContentSettingsPanel(): React.JSX.Element {
  const {
    editorValue,
    setEditorValue,
    isLoading,
    isSaving,
    selectedEntryId,
    setSelectedEntryId,
    selectedFragmentId,
    setSelectedFragmentId,
    isDirty,
    parsedState,
    selectedEntry,
    loadStore,
    handleSave,
    handleAddEntry,
    handleDuplicateSelectedEntry,
    handleDeleteSelectedEntry,
    handleMoveSelectedEntry,
    handleResetToDefaults,
    updateSelectedEntry,
    updateSelectedFragment,
    handleAddFragment,
    handleDuplicateSelectedFragment,
    handleDeleteSelectedFragment,
    handleMoveSelectedFragment,
  } = useKangurPageContentMutations();

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

        {parsedState.store ? (
          <KangurPageContentManifestCoverage store={parsedState.store} />
        ) : null}

        {parsedState.store ? (
          <div className='mt-4 grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
            <KangurPageContentEntryList
              entries={parsedState.store.entries}
              selectedEntryId={selectedEntryId}
              onSelect={setSelectedEntryId}
              className={SETTINGS_INSET_CARD_CLASS_NAME}
            />

            {selectedEntry ? (
              <KangurPageContentEntryEditor
                entry={selectedEntry}
                onUpdateEntry={updateSelectedEntry}
                onDuplicateEntry={handleDuplicateSelectedEntry}
                onDeleteEntry={handleDeleteSelectedEntry}
                onMoveEntry={handleMoveSelectedEntry}
                isSaving={isSaving}
                canDelete={parsedState.store.entries.length > 1}
                selectedFragmentId={selectedFragmentId}
                onSelectFragment={setSelectedFragmentId}
                onUpdateFragment={updateSelectedFragment}
                onAddFragment={handleAddFragment}
                onDuplicateFragment={handleDuplicateSelectedFragment}
                onDeleteFragment={handleDeleteSelectedFragment}
                onMoveFragment={handleMoveSelectedFragment}
                className={SETTINGS_INSET_CARD_CLASS_NAME}
                insetCardClassName={SETTINGS_INSET_CARD_CLASS_NAME}
              />
            ) : (
              <Card variant='subtle' padding='md' className={SETTINGS_INSET_CARD_CLASS_NAME}>
                <div className='rounded-2xl border border-dashed border-border/60 px-4 py-8 text-sm text-muted-foreground text-center'>
                  Select a page-content entry from the list to start editing.
                </div>
              </Card>
            )}
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
              title='Page content JSON'
            />
          </FormField>
          <div className='mt-2 text-xs text-muted-foreground text-center'>
            {isDirty ? 'Unsaved page-content changes' : 'Page content in sync'}
          </div>
        </Card>
      </Card>
    </FormSection>
  );
}
