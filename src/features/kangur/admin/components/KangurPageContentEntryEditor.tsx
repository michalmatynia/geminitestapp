import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorSurface,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  kangurPageContentPageKeySchema,
  type KangurPageContentEntry,
  type KangurPageContentFragment,
  type KangurPageContentPageKey,
} from '@/features/kangur/shared/contracts/kangur-page-content';
import { Badge, Button, Card, FormField, Input, SelectSimple, Switch, Textarea } from '@/features/kangur/shared/ui';

import {
  KangurPageContentFragmentEditor,
  KangurPageContentFragmentEditorProvider,
} from './KangurPageContentFragmentEditor';

interface KangurPageContentEntryEditorProps {
  entry: KangurPageContentEntry;
  onUpdateEntry: (updater: (entry: KangurPageContentEntry) => KangurPageContentEntry) => void;
  onDuplicateEntry: () => void;
  onDeleteEntry: () => void;
  onMoveEntry: (direction: -1 | 1) => void;
  isSaving: boolean;
  canDelete: boolean;
  selectedFragmentId: string | null;
  onSelectFragment: (id: string) => void;
  onUpdateFragment: (updater: (fragment: KangurPageContentFragment) => KangurPageContentFragment) => void;
  onAddFragment: () => void;
  onDuplicateFragment: () => void;
  onDeleteFragment: () => void;
  onMoveFragment: (direction: -1 | 1) => void;
  className?: string;
  insetCardClassName?: string;
}

const PAGE_KEY_OPTIONS: Array<LabeledOptionWithDescriptionDto<KangurPageContentPageKey>> =
  kangurPageContentPageKeySchema.options.map((value) => ({
  value,
  label: value,
  description: `Canonical Kangur page key: ${value}.`,
  }));

const SURFACE_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<KangurAiTutorSurface | '__none__'>
> = [
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

const FOCUS_KIND_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<KangurAiTutorFocusKind | '__none__'>
> = [
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

export function KangurPageContentEntryEditor(
  props: KangurPageContentEntryEditorProps
): React.JSX.Element {
  const {
    entry,
    onUpdateEntry,
    onDuplicateEntry,
    onDeleteEntry,
    onMoveEntry,
    isSaving,
    canDelete,
    selectedFragmentId,
    onSelectFragment,
    onUpdateFragment,
    onAddFragment,
    onDuplicateFragment,
    onDeleteFragment,
    onMoveFragment,
    className,
    insetCardClassName,
  } = props;
  return (
    <Card variant='subtle' padding='md' className={className}>
      <div className='space-y-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-sm font-semibold text-foreground'>
                Structured section editor
              </div>
              <Badge variant='secondary'>{entry.pageKey}</Badge>
              <Badge variant='outline'>{entry.screenKey}</Badge>
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
              onClick={() => onMoveEntry(-1)}
              disabled={isSaving}
            >
              Move up
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onMoveEntry(1)}
              disabled={isSaving}
            >
              Move down
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={onDuplicateEntry}
              disabled={isSaving}
            >
              Duplicate
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={onDeleteEntry}
              disabled={isSaving || !canDelete}
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
              value={entry.id}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  id: sanitizeRequiredInput(event.target.value, e.id),
                }))
              }
              title='Canonical section id'
            />
          </FormField>

          <FormField label='Title' description='Human-readable section label.'>
            <Input
              aria-label='Page content title'
              value={entry.title}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  title: sanitizeRequiredInput(event.target.value, e.title),
                }))
              }
              title='Title'
            />
          </FormField>

          <FormField label='Page key'>
            <SelectSimple
              value={entry.pageKey}
              onValueChange={(value) =>
                onUpdateEntry((e) => ({
                  ...e,
                  pageKey: value as KangurPageContentPageKey,
                }))
              }
              options={PAGE_KEY_OPTIONS}
              ariaLabel='Page content page key'
              variant='subtle'
              title='Page key'
            />
          </FormField>

          <FormField label='Screen key'>
            <Input
              aria-label='Page content screen key'
              value={entry.screenKey}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  screenKey: sanitizeRequiredInput(event.target.value, e.screenKey),
                }))
              }
              title='Screen key'
            />
          </FormField>

          <FormField label='Surface'>
            <SelectSimple
              value={entry.surface ?? '__none__'}
              onValueChange={(value) =>
                onUpdateEntry((e) => ({
                  ...e,
                  surface:
                    value === '__none__'
                      ? null
                      : (value as KangurAiTutorSurface),
                }))
              }
              options={SURFACE_OPTIONS}
              ariaLabel='Page content surface'
              variant='subtle'
              title='Surface'
            />
          </FormField>

          <FormField label='Focus kind'>
            <SelectSimple
              value={entry.focusKind ?? '__none__'}
              onValueChange={(value) =>
                onUpdateEntry((e) => ({
                  ...e,
                  focusKind:
                    value === '__none__'
                      ? null
                      : (value as KangurAiTutorFocusKind),
                }))
              }
              options={FOCUS_KIND_OPTIONS}
              ariaLabel='Page content focus kind'
              variant='subtle'
              title='Focus kind'
            />
          </FormField>

          <FormField label='Route'>
            <Input
              aria-label='Page content route'
              value={entry.route ?? ''}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  route: toNullableTrimmed(event.target.value),
                }))
              }
              placeholder='/game'
              title='/game'
            />
          </FormField>

          <FormField label='Anchor id prefix'>
            <Input
              aria-label='Page content anchor id prefix'
              value={entry.anchorIdPrefix ?? ''}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  anchorIdPrefix: toNullableTrimmed(event.target.value),
                }))
              }
              placeholder='kangur-game-home-actions'
              title='kangur-game-home-actions'
            />
          </FormField>

          <FormField label='Component id'>
            <Input
              aria-label='Page content component id'
              value={entry.componentId}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  componentId: sanitizeRequiredInput(
                    event.target.value,
                    e.componentId
                  ),
                }))
              }
              title='Component id'
            />
          </FormField>

          <FormField label='Widget'>
            <Input
              aria-label='Page content widget'
              value={entry.widget}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  widget: sanitizeRequiredInput(event.target.value, e.widget),
                }))
              }
              title='Widget'
            />
          </FormField>

          <FormField label='Source path' className='lg:col-span-2'>
            <Input
              aria-label='Page content source path'
              value={entry.sourcePath}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  sourcePath: sanitizeRequiredInput(
                    event.target.value,
                    e.sourcePath
                  ),
                }))
              }
              title='Source path'
            />
          </FormField>

          <FormField label='Summary' className='lg:col-span-2'>
            <Textarea
              aria-label='Page content summary'
              value={entry.summary}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  summary: sanitizeRequiredInput(event.target.value, e.summary),
                }))
              }
              rows={3}
              title='Summary'
            />
          </FormField>

          <FormField label='Body' className='lg:col-span-2'>
            <Textarea
              aria-label='Page content body'
              value={entry.body}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  body: sanitizeRequiredInput(event.target.value, e.body),
                }))
              }
              rows={8}
              title='Body'
            />
          </FormField>

          <FormField label='Content id prefixes'>
            <Textarea
              aria-label='Page content content ids'
              value={stringifyList(entry.contentIdPrefixes)}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  contentIdPrefixes: parseList(event.target.value),
                }))
              }
              rows={4}
              title='Content id prefixes'
            />
          </FormField>

          <FormField label='Linked native guide ids'>
            <Textarea
              aria-label='Page content native guide ids'
              value={stringifyList(entry.nativeGuideIds)}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  nativeGuideIds: parseList(event.target.value),
                }))
              }
              rows={4}
              title='Linked native guide ids'
            />
          </FormField>

          <FormField label='Trigger phrases'>
            <Textarea
              aria-label='Page content trigger phrases'
              value={stringifyList(entry.triggerPhrases)}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  triggerPhrases: parseList(event.target.value),
                }))
              }
              rows={4}
              title='Trigger phrases'
            />
          </FormField>

          <FormField label='Tags'>
            <Textarea
              aria-label='Page content tags'
              value={stringifyList(entry.tags)}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  tags: parseList(event.target.value),
                }))
              }
              rows={4}
              title='Tags'
            />
          </FormField>

          <FormField label='Notes' className='lg:col-span-2'>
            <Textarea
              aria-label='Page content notes'
              value={entry.notes ?? ''}
              onChange={(event) =>
                onUpdateEntry((e) => ({
                  ...e,
                  notes: toOptionalTrimmed(event.target.value),
                }))
              }
              rows={4}
              title='Notes'
            />
          </FormField>
        </div>

        <KangurPageContentFragmentEditorProvider
          value={{
            fragments: entry.fragments,
            selectedFragmentId,
            onSelectFragment,
            onUpdateFragment,
            onAddFragment,
            onDuplicateFragment,
            onDeleteFragment,
            onMoveFragment,
            isSaving,
            insetCardClassName,
          }}
        >
          <KangurPageContentFragmentEditor />
        </KangurPageContentFragmentEditorProvider>

        <div className='flex items-center justify-between rounded-2xl border border-border/60 bg-card/30 px-4 py-3'>
          <div>
            <div className='text-sm font-medium text-foreground'>Entry enabled</div>
            <div className='text-xs text-muted-foreground'>
              Disabled entries stay in Mongo but are ignored by runtime retrieval and
              manifest coverage.
            </div>
          </div>
          <Switch
            aria-label='Entry enabled'
            checked={entry.enabled}
            onCheckedChange={(checked: boolean) =>
              onUpdateEntry((e) => ({
                ...e,
                enabled: checked,
              }))
            }
          />
        </div>
      </div>
    </Card>
  );
}
