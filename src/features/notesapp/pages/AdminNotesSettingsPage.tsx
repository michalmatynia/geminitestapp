'use client';

import { RotateCcw } from 'lucide-react';
import Link from 'next/link';

import {
  useNoteSettings,
  DEFAULT_NOTE_SETTINGS,
} from '@/features/notesapp/hooks/NoteSettingsContext';
import type { NoteSettings } from '@/shared/contracts/notes';
import {
  Button,
  SelectSimple,
  useToast,
  Label,
  RadioGroup,
  RadioGroupItem,
  SectionHeader,
  FormSection,
  FormField,
  ToggleRow,
  Card,
  FormActions,
} from '@/shared/ui';

const sortByOptions = [
  { value: 'created', label: 'Created Date' },
  { value: 'updated', label: 'Modified Date' },
  { value: 'name', label: 'Name' },
] as const;

const sortOrderOptions = [
  { value: 'desc', label: 'Descending (Newest/Z-A)' },
  { value: 'asc', label: 'Ascending (Oldest/A-Z)' },
] as const;

const searchScopeOptions = [
  { value: 'both', label: 'Title & Content' },
  { value: 'title', label: 'Title Only' },
  { value: 'content', label: 'Content Only' },
] as const;

const editorModeOptions = [
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Plain text with markdown syntax and live preview',
  },
  {
    value: 'wysiwyg',
    label: 'WYSIWYG',
    description: 'Rich text editor with visual formatting',
  },
  {
    value: 'code',
    label: 'Code Snippets',
    description: 'Optimized for code with syntax highlighting and copy button',
  },
] as const;

export function AdminNotesSettingsPage(): React.JSX.Element {
  const { settings, updateSettings, resetToDefaults } = useNoteSettings();
  const { toast } = useToast();

  const handleResetToDefaults = (): void => {
    resetToDefaults();
    toast('Settings reset to defaults', { variant: 'success' });
  };

  const isDefault = (key: keyof NoteSettings): boolean => {
    return settings[key] === DEFAULT_NOTE_SETTINGS[key];
  };

  const allDefaults =
    settings.sortBy === DEFAULT_NOTE_SETTINGS.sortBy &&
    settings.sortOrder === DEFAULT_NOTE_SETTINGS.sortOrder &&
    settings.showTimestamps === DEFAULT_NOTE_SETTINGS.showTimestamps &&
    settings.showBreadcrumbs === DEFAULT_NOTE_SETTINGS.showBreadcrumbs &&
    settings.showRelatedNotes === DEFAULT_NOTE_SETTINGS.showRelatedNotes &&
    settings.searchScope === DEFAULT_NOTE_SETTINGS.searchScope &&
    settings.selectedFolderId === DEFAULT_NOTE_SETTINGS.selectedFolderId &&
    settings.selectedNotebookId === DEFAULT_NOTE_SETTINGS.selectedNotebookId &&
    settings.viewMode === DEFAULT_NOTE_SETTINGS.viewMode &&
    settings.gridDensity === DEFAULT_NOTE_SETTINGS.gridDensity &&
    settings.autoformatOnPaste === DEFAULT_NOTE_SETTINGS.autoformatOnPaste &&
    settings.editorMode === DEFAULT_NOTE_SETTINGS.editorMode;

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Note Settings'
        description='Configure default view preferences for the Notes app.'
        eyebrow={
          <Link href='/admin/notes' className='text-blue-300 hover:text-blue-200'>
            ← Back to notes
          </Link>
        }
        className='mb-6'
      />

      <div className='max-xl space-y-6'>
        {/* Sorting Settings */}
        <FormSection title='Sorting' className='p-6'>
          <FormField
            label='Sort By'
            description={!isDefault('sortBy') ? 'Modified from default' : undefined}
          >
            <SelectSimple
              size='sm'
              options={[...sortByOptions]}
              value={settings.sortBy}
              onValueChange={(value: string): void =>
                updateSettings({ sortBy: value as NoteSettings['sortBy'] })
              }
              placeholder='Select sort field'
            />
          </FormField>

          <FormField
            label='Sort Order'
            description={!isDefault('sortOrder') ? 'Modified from default' : undefined}
          >
            <SelectSimple
              size='sm'
              options={[...sortOrderOptions]}
              value={settings.sortOrder}
              onValueChange={(value: string): void =>
                updateSettings({
                  sortOrder: value as NoteSettings['sortOrder'],
                })
              }
              placeholder='Select sort order'
            />
          </FormField>
        </FormSection>

        {/* Visibility Settings */}
        <FormSection title='Card Visibility' className='p-6 space-y-4'>
          <ToggleRow
            label='Show Timestamps'
            description='Display created and modified dates on note cards'
            checked={settings.showTimestamps}
            onCheckedChange={(checked: boolean): void =>
              updateSettings({ showTimestamps: checked })
            }
            className={!isDefault('showTimestamps') ? 'border-blue-500/30' : ''}
          />

          <ToggleRow
            label='Show Breadcrumbs'
            description='Display folder path at the bottom of note cards'
            checked={settings.showBreadcrumbs}
            onCheckedChange={(checked: boolean): void =>
              updateSettings({ showBreadcrumbs: checked })
            }
            className={!isDefault('showBreadcrumbs') ? 'border-blue-500/30' : ''}
          />

          <ToggleRow
            label='Show Related Notes'
            description='Display linked notes as quick access cards'
            checked={settings.showRelatedNotes}
            onCheckedChange={(checked: boolean): void =>
              updateSettings({ showRelatedNotes: checked })
            }
            className={!isDefault('showRelatedNotes') ? 'border-blue-500/30' : ''}
          />
        </FormSection>

        {/* Search Settings */}
        <FormSection title='Search' className='p-6'>
          <FormField
            label='Default Search Scope'
            description={!isDefault('searchScope') ? 'Modified from default' : undefined}
          >
            <SelectSimple
              size='sm'
              options={[...searchScopeOptions]}
              value={settings.searchScope}
              onValueChange={(value: string): void =>
                updateSettings({
                  searchScope: value as NoteSettings['searchScope'],
                })
              }
              placeholder='Select search scope'
            />
          </FormField>
        </FormSection>

        {/* Editor Settings */}
        <FormSection title='Editor' className='p-6'>
          <FormField
            label='Default Editor Mode'
            description={!isDefault('editorMode') ? 'Modified from default' : undefined}
          >
            <RadioGroup
              value={settings.editorMode}
              onValueChange={(value: string): void =>
                updateSettings({
                  editorMode: value as NoteSettings['editorMode'],
                })
              }
              className='space-y-2'
            >
              {editorModeOptions.map(
                (option: { value: string; label: string; description: string }) => {
                  const id = `editor-mode-${option.value}`;
                  const isSelected = settings.editorMode === option.value;
                  return (
                    <div
                      key={option.value}
                      className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border hover:border-border/60'
                      }`}
                    >
                      <RadioGroupItem
                        id={id}
                        value={option.value}
                        className='mt-1 border-border/60 text-blue-600'
                      />
                      <Label htmlFor={id} className='flex-1 cursor-pointer'>
                        <span className='text-sm font-medium text-gray-200'>{option.label}</span>
                        <p className='text-xs text-gray-500'>{option.description}</p>
                      </Label>
                    </div>
                  );
                }
              )}
            </RadioGroup>
          </FormField>

          <div className='mt-4'>
            <ToggleRow
              label='Autoformat on Paste'
              description='Automatically format pasted markdown content (Markdown mode only)'
              checked={settings.autoformatOnPaste}
              onCheckedChange={(checked: boolean): void =>
                updateSettings({ autoformatOnPaste: checked })
              }
              className={!isDefault('autoformatOnPaste') ? 'border-blue-500/30' : ''}
            />
          </div>
        </FormSection>

        {/* Navigation State */}
        <FormSection title='Navigation' className='p-6'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-center justify-between border-border/60 bg-card/30'
          >
            <div className='flex-1 space-y-0.5'>
              <p className='text-sm font-medium text-gray-200'>Remember Selected Folder</p>
              <p className='text-[11px] text-gray-500'>
                Your selected folder is saved to the database and persists across sessions.
              </p>
            </div>
            {!isDefault('selectedFolderId') ? (
              <div className='flex items-center gap-2'>
                <span className='text-xs text-green-400 font-bold uppercase'>Saved</span>
                <Button
                  variant='outline'
                  size='xs'
                  onClick={(): void => updateSettings({ selectedFolderId: null })}
                  className='h-7 px-2 text-xs'
                >
                  Clear
                </Button>
              </div>
            ) : (
              <span className='text-xs text-gray-500'>Using default</span>
            )}
          </Card>
        </FormSection>

        {/* Reset Button */}
        <FormActions
          onSave={handleResetToDefaults}
          saveText='Reset to Defaults'
          saveVariant='outline'
          saveIcon={<RotateCcw className='size-4' />}
          isDisabled={allDefaults}
        />

        {/* Current Settings Summary */}
        <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
          <h3 className='mb-2 text-sm font-medium text-gray-400'>Current Settings Summary</h3>
          <div className='grid grid-cols-2 gap-2 text-xs text-gray-500'>
            <span>Sort:</span>
            <span className='text-gray-300'>
              {sortByOptions.find((o: { value: string }) => o.value === settings.sortBy)?.label} (
              {settings.sortOrder === 'desc' ? 'Descending' : 'Ascending'})
            </span>
            <span>Timestamps:</span>
            <span className='text-gray-300'>{settings.showTimestamps ? 'Visible' : 'Hidden'}</span>
            <span>Breadcrumbs:</span>
            <span className='text-gray-300'>{settings.showBreadcrumbs ? 'Visible' : 'Hidden'}</span>
            <span>Search Scope:</span>
            <span className='text-gray-300'>
              {
                searchScopeOptions.find((o: { value: string }) => o.value === settings.searchScope)
                  ?.label
              }
            </span>
            <span>Selected Folder:</span>
            <span className='text-gray-300'>
              {settings.selectedFolderId ? 'Saved' : 'All Notes (default)'}
            </span>
            <span>Autoformat on Paste:</span>
            <span className='text-gray-300'>
              {settings.autoformatOnPaste ? 'Enabled' : 'Disabled'}
            </span>
            <span>Editor Mode:</span>
            <span className='text-gray-300'>
              {
                editorModeOptions.find((o: { value: string }) => o.value === settings.editorMode)
                  ?.label
              }
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
