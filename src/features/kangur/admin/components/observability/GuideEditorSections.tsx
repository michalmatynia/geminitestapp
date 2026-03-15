'use client';

import * as React from 'react';
import { Badge, Button, FormField, Input, Textarea } from '@/shared/ui';
import type { KangurAiTutorOnboardingValidationField, KangurAiTutorOnboardingValidationIssue } from '@/features/kangur/ai-tutor-onboarding-validation';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';

import { useKangurAiTutorNativeGuideEntryEditor } from './KangurAiTutorNativeGuideEntryEditorContext';
import { SURFACE_OPTIONS, FOCUS_KIND_OPTIONS, stringifyLineList, parseLineList } from './guide-editor-utils';

export function RenderValidationIssues({
  issues,
}: {
  issues: KangurAiTutorOnboardingValidationIssue[];
}): React.JSX.Element | null {
  if (issues.length === 0) {
    return null;
  }

  return (
    <div className='space-y-2'>
      {issues.map((issue, index) => (
        <div
          key={`${issue.ruleId ?? issue.title}-${issue.field}-${index}`}
          className={`rounded-xl border px-3 py-2 text-xs ${
            issue.blocking
              ? 'border-rose-500/30 bg-rose-500/10 text-rose-950'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-950'
          }`}
        >
          <div className='font-semibold'>{issue.title}</div>
          <div className='mt-0.5'>{issue.message}</div>
        </div>
      ))}
    </div>
  );
}

export function FieldValidationWrapper({
  field,
  children,
}: {
  field: KangurAiTutorOnboardingValidationField;
  children: React.ReactNode;
}): React.JSX.Element {
  const { selectedEntryValidationIssues } = useKangurAiTutorNativeGuideEntryEditor();
  const issues = selectedEntryValidationIssues.filter((issue) => issue.field === field);

  return (
    <div className='space-y-2'>
      {children}
      <RenderValidationIssues issues={issues} />
    </div>
  );
}

export function EntryHeader(): React.JSX.Element | null {
  const {
    selectedEntry,
    totalEntries,
    isSaving,
    onDuplicate,
    onMove,
    onDelete,
  } = useKangurAiTutorNativeGuideEntryEditor();

  if (!selectedEntry) return null;

  return (
    <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
      <div>
        <div className='flex items-center gap-2'>
          <div className='text-sm font-semibold text-foreground'>Structured entry editor</div>
          <Badge variant='secondary'>{selectedEntry.title}</Badge>
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>
          Edit one native guide record at a time. These records describe Kangur
          surfaces and sections without relying on AI model generation.
        </p>
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={onDuplicate} disabled={isSaving}>
          Duplicate
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => onMove(-1)} disabled={isSaving}>
          Move up
        </Button>
        <Button type='button' variant='outline' size='sm' onClick={() => onMove(1)} disabled={isSaving}>
          Move down
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onDelete}
          disabled={isSaving || totalEntries <= 1}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function IdentitySection(): React.JSX.Element | null {
  const { selectedEntry, updateSelectedEntry } = useKangurAiTutorNativeGuideEntryEditor();
  if (!selectedEntry) return null;

  return (
    <div className='grid gap-4 md:grid-cols-2'>
      <FormField label='Entry title'>
        <FieldValidationWrapper field='title'>
          <Input
            value={selectedEntry.title}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                title: event.target.value,
              }))
            }
            aria-label='Native guide entry title'
           title='Entry title'/>
        </FieldValidationWrapper>
      </FormField>
      <FormField label='Entry id'>
        <FieldValidationWrapper field='id'>
          <Input
            value={selectedEntry.id}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                id: event.target.value,
              }))
            }
            aria-label='Native guide entry id'
            className='font-mono text-xs'
           title='Entry id'/>
        </FieldValidationWrapper>
      </FormField>
    </div>
  );
}

export function SurfaceFocusSection(): React.JSX.Element | null {
  const { selectedEntry, updateSelectedEntry, isSaving } = useKangurAiTutorNativeGuideEntryEditor();
  if (!selectedEntry) return null;

  return (
    <div className='grid gap-4 md:grid-cols-4'>
      <FormField label='Surface'>
        <select
          value={selectedEntry.surface ?? ''}
          onChange={(event) =>
            updateSelectedEntry((entry) => ({
              ...entry,
              surface: event.target.value
                ? (event.target.value as
                    | 'lesson'
                    | 'test'
                    | 'game'
                    | 'profile'
                    | 'parent_dashboard'
                    | 'auth')
                : null,
            }))
          }
          aria-label='Native guide surface'
          className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
        >
          {SURFACE_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label='Focus area'>
        <select
          value={selectedEntry.focusKind ?? ''}
          onChange={(event) =>
            updateSelectedEntry((entry) => ({
              ...entry,
              focusKind: event.target.value
                ? (event.target.value as KangurAiTutorNativeGuideEntry['focusKind'])
                : null,
            }))
          }
          aria-label='Native guide focus area'
          className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
        >
          {FOCUS_KIND_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label='Sort order'>
        <Input
          type='number'
          value={String(selectedEntry.sortOrder)}
          onChange={(event) =>
            updateSelectedEntry((entry) => ({
              ...entry,
              sortOrder: Number.parseInt(event.target.value || '0', 10) || 0,
            }))
          }
          aria-label='Native guide sort order'
         title='Sort order'/>
      </FormField>
      <FormField label='Entry status'>
        <Button
          type='button'
          variant={selectedEntry.enabled ? 'secondary' : 'outline'}
          className='w-full'
          onClick={() =>
            updateSelectedEntry((entry) => ({
              ...entry,
              enabled: !entry.enabled,
            }))
          }
          disabled={isSaving}
        >
          {selectedEntry.enabled ? 'Enabled' : 'Disabled'}
        </Button>
      </FormField>
    </div>
  );
}

export function DescriptionSection(): React.JSX.Element | null {
  const { selectedEntry, updateSelectedEntry } = useKangurAiTutorNativeGuideEntryEditor();
  if (!selectedEntry) return null;

  return (
    <>
      <FormField label='Short description'>
        <FieldValidationWrapper field='shortDescription'>
          <Textarea
            value={selectedEntry.shortDescription}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                shortDescription: event.target.value,
              }))
            }
            rows={3}
            aria-label='Native guide short description'
           title='Short description'/>
        </FieldValidationWrapper>
      </FormField>

      <FormField label='Full description'>
        <FieldValidationWrapper field='fullDescription'>
          <Textarea
            value={selectedEntry.fullDescription}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                fullDescription: event.target.value,
              }))
            }
            rows={7}
            aria-label='Native guide full description'
           title='Full description'/>
        </FieldValidationWrapper>
      </FormField>
    </>
  );
}

export function KnowledgeSourceSection(): React.JSX.Element | null {
  const { selectedEntry, updateSelectedEntry } = useKangurAiTutorNativeGuideEntryEditor();
  if (!selectedEntry) return null;

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <FormField label='Hints' description='One hint per line. Keep them non-spoiler.'>
        <FieldValidationWrapper field='hints'>
          <Textarea
            value={stringifyLineList(selectedEntry.hints)}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                hints: parseLineList(event.target.value),
              }))
            }
            rows={6}
            aria-label='Native guide hints'
           title='Hints'/>
        </FieldValidationWrapper>
      </FormField>
      <FormField
        label='Trigger phrases'
        description='One phrase per line. These help the tutor match native answers to user questions.'
      >
        <FieldValidationWrapper field='triggerPhrases'>
          <Textarea
            value={stringifyLineList(selectedEntry.triggerPhrases)}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                triggerPhrases: parseLineList(event.target.value),
              }))
            }
            rows={6}
            aria-label='Native guide trigger phrases'
           title='Trigger phrases'/>
        </FieldValidationWrapper>
      </FormField>
    </div>
  );
}

export function MatchingSection(): React.JSX.Element | null {
  const { selectedEntry, updateSelectedEntry } = useKangurAiTutorNativeGuideEntryEditor();
  if (!selectedEntry) return null;

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <FormField
        label='Focus id prefixes'
        description='One focus anchor id prefix per line. Use these for exact section matching.'
      >
        <Textarea
          value={stringifyLineList(selectedEntry.focusIdPrefixes)}
          onChange={(event) =>
            updateSelectedEntry((entry) => ({
              ...entry,
              focusIdPrefixes: parseLineList(event.target.value),
            }))
          }
          rows={4}
          aria-label='Native guide focus id prefixes'
         title='Focus id prefixes'/>
      </FormField>
      <FormField
        label='Content id prefixes'
        description='One content id prefix per line. Use these for screen and activity matching.'
      >
        <Textarea
          value={stringifyLineList(selectedEntry.contentIdPrefixes)}
          onChange={(event) =>
            updateSelectedEntry((entry) => ({
              ...entry,
              contentIdPrefixes: parseLineList(event.target.value),
            }))
          }
          rows={4}
          aria-label='Native guide content id prefixes'
         title='Content id prefixes'/>
      </FormField>
    </div>
  );
}

export function RelatedContentSection(): React.JSX.Element | null {
  const { selectedEntry, updateSelectedEntry } = useKangurAiTutorNativeGuideEntryEditor();
  if (!selectedEntry) return null;

  return (
    <div className='grid gap-4 lg:grid-cols-2'>
      <FormField label='Related games' description='One game hint or game label per line.'>
        <FieldValidationWrapper field='relatedGames'>
          <Textarea
            value={stringifyLineList(selectedEntry.relatedGames)}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                relatedGames: parseLineList(event.target.value),
              }))
            }
            rows={4}
            aria-label='Native guide related games'
           title='Related games'/>
        </FieldValidationWrapper>
      </FormField>
      <FormField label='Related tests' description='One test hint or test label per line.'>
        <FieldValidationWrapper field='relatedTests'>
          <Textarea
            value={stringifyLineList(selectedEntry.relatedTests)}
            onChange={(event) =>
              updateSelectedEntry((entry) => ({
                ...entry,
                relatedTests: parseLineList(event.target.value),
              }))
            }
            rows={4}
            aria-label='Native guide related tests'
           title='Related tests'/>
        </FieldValidationWrapper>
      </FormField>
    </div>
  );
}

export function FollowUpActionsSection(): React.JSX.Element | null {
  const {
    selectedEntry,
    isSaving,
    followUpActionsEditorValue,
    onFollowUpActionsEditorValueChange,
    onApplyFollowUpActions,
  } = useKangurAiTutorNativeGuideEntryEditor();

  if (!selectedEntry) return null;

  return (
    <FormField
      label='Follow-up actions'
      description='Keep this as a small JSON array. Pages allowed today: Game, Lessons, ParentDashboard, LearnerProfile.'
    >
      <Textarea
        value={followUpActionsEditorValue}
        onChange={(event) => onFollowUpActionsEditorValueChange(event.target.value)}
        rows={8}
        aria-label='Native guide follow-up actions'
        className='font-mono text-xs leading-6'
       title='Follow-up actions'/>
      <div className='mt-2 flex justify-end'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onApplyFollowUpActions}
          disabled={isSaving}
        >
          Apply action JSON
        </Button>
      </div>
      <div className='mt-2'>
        <FieldValidationWrapper field='followUpActions'>
          {null /* Wrapper will render its own issues */}
        </FieldValidationWrapper>
      </div>
    </FormField>
  );
}
