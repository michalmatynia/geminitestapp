import type { KangurAiTutorOnboardingValidationField, KangurAiTutorOnboardingValidationIssue } from '@/features/kangur/ai-tutor-onboarding-validation';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';
import { Badge, Button, Card, FormField, Input, Textarea } from '@/shared/ui';

const SURFACE_OPTIONS: Array<{
  value: '' | 'lesson' | 'test' | 'game' | 'profile' | 'parent_dashboard';
  label: string;
}> = [
  { value: '', label: 'All surfaces' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'test', label: 'Test' },
  { value: 'game', label: 'Game' },
  { value: 'profile', label: 'Profile' },
  { value: 'parent_dashboard', label: 'Parent dashboard' },
];

const FOCUS_KIND_OPTIONS = [
  { value: '', label: 'Whole surface' },
  { value: 'selection', label: 'Selection' },
  { value: 'hero', label: 'Hero' },
  { value: 'screen', label: 'Screen' },
  { value: 'library', label: 'Library' },
  { value: 'empty_state', label: 'Empty state' },
  { value: 'navigation', label: 'Navigation' },
  { value: 'lesson_header', label: 'Lesson header' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'document', label: 'Document' },
  { value: 'home_actions', label: 'Home actions' },
  { value: 'home_quest', label: 'Home quest' },
  { value: 'priority_assignments', label: 'Priority assignments' },
  { value: 'leaderboard', label: 'Leaderboard' },
  { value: 'progress', label: 'Progress' },
  { value: 'question', label: 'Question' },
  { value: 'review', label: 'Review' },
  { value: 'summary', label: 'Summary' },
] as const;

const stringifyLineList = (items: string[]): string => items.join('\n');
const parseLineList = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

type Props = {
  selectedEntry: KangurAiTutorNativeGuideEntry | null;
  totalEntries: number;
  isSaving: boolean;
  selectedEntryValidationIssues: KangurAiTutorOnboardingValidationIssue[];
  followUpActionsEditorValue: string;
  onFollowUpActionsEditorValueChange: (value: string) => void;
  updateSelectedEntry: (
    updater: (entry: KangurAiTutorNativeGuideEntry) => KangurAiTutorNativeGuideEntry
  ) => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onApplyFollowUpActions: () => void;
  className: string;
};

export function KangurAiTutorNativeGuideEntryEditor({
  selectedEntry,
  totalEntries,
  isSaving,
  selectedEntryValidationIssues,
  followUpActionsEditorValue,
  onFollowUpActionsEditorValueChange,
  updateSelectedEntry,
  onDuplicate,
  onMove,
  onDelete,
  onApplyFollowUpActions,
  className,
}: Props): React.JSX.Element {
  const renderValidationIssues = (
    issues: KangurAiTutorOnboardingValidationIssue[]
  ): React.JSX.Element | null => {
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
  };

  const getSelectedEntryFieldIssues = (
    field: KangurAiTutorOnboardingValidationField
  ): KangurAiTutorOnboardingValidationIssue[] =>
    selectedEntryValidationIssues.filter((issue) => issue.field === field);

  return (
    <Card variant='subtle' padding='md' className={className}>
      {selectedEntry ? (
        <div className='space-y-4'>
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

          {renderValidationIssues(
            selectedEntryValidationIssues.filter((issue) => issue.field === 'sequence')
          )}

          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Entry title'>
              <div className='space-y-2'>
                <Input
                  value={selectedEntry.title}
                  onChange={(event) =>
                    updateSelectedEntry((entry) => ({
                      ...entry,
                      title: event.target.value,
                    }))
                  }
                  aria-label='Native guide entry title'
                />
                {renderValidationIssues(getSelectedEntryFieldIssues('title'))}
              </div>
            </FormField>
            <FormField label='Entry id'>
              <div className='space-y-2'>
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
                />
                {renderValidationIssues(getSelectedEntryFieldIssues('id'))}
              </div>
            </FormField>
          </div>

          <div className='grid gap-4 md:grid-cols-4'>
            <FormField label='Surface'>
              <select
                value={selectedEntry.surface ?? ''}
                onChange={(event) =>
                  updateSelectedEntry((entry) => ({
                    ...entry,
                    surface: event.target.value
                      ? (event.target.value as 'lesson' | 'test' | 'game')
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
              />
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

          <FormField label='Short description'>
            <div className='space-y-2'>
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
              />
              {renderValidationIssues(getSelectedEntryFieldIssues('shortDescription'))}
            </div>
          </FormField>

          <FormField label='Full description'>
            <div className='space-y-2'>
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
              />
              {renderValidationIssues(getSelectedEntryFieldIssues('fullDescription'))}
            </div>
          </FormField>

          <div className='grid gap-4 lg:grid-cols-2'>
            <FormField label='Hints' description='One hint per line. Keep them non-spoiler.'>
              <div className='space-y-2'>
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
                />
                {renderValidationIssues(getSelectedEntryFieldIssues('hints'))}
              </div>
            </FormField>
            <FormField
              label='Trigger phrases'
              description='One phrase per line. These help the tutor match native answers to user questions.'
            >
              <div className='space-y-2'>
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
                />
                {renderValidationIssues(getSelectedEntryFieldIssues('triggerPhrases'))}
              </div>
            </FormField>
          </div>

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
              />
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
              />
            </FormField>
          </div>

          <div className='grid gap-4 lg:grid-cols-2'>
            <FormField label='Related games' description='One game hint or game label per line.'>
              <div className='space-y-2'>
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
                />
                {renderValidationIssues(getSelectedEntryFieldIssues('relatedGames'))}
              </div>
            </FormField>
            <FormField label='Related tests' description='One test hint or test label per line.'>
              <div className='space-y-2'>
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
                />
                {renderValidationIssues(getSelectedEntryFieldIssues('relatedTests'))}
              </div>
            </FormField>
          </div>

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
            />
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
              {renderValidationIssues(getSelectedEntryFieldIssues('followUpActions'))}
            </div>
          </FormField>
        </div>
      ) : (
        <div className='rounded-2xl border border-dashed border-border/70 bg-background/40 px-4 py-10 text-sm text-muted-foreground'>
          Select a guide entry to edit it.
        </div>
      )}
    </Card>
  );
}
