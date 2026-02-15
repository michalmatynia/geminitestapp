'use client';

import { Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useCreateNoteTheme, useDeleteNoteTheme, useUpdateNoteTheme } from '@/features/notesapp/api/useNoteMutations';
import { useNotebooks, useNoteThemes } from '@/features/notesapp/api/useNoteQueries';
import { useNoteSettings } from '@/features/notesapp/hooks/NoteSettingsContext';
import { logClientError } from '@/features/observability';
import type { ThemeRecord } from '@/shared/types/domain/notes';
import { Button, useToast, Input, SectionHeader, FormSection, FormField, RefreshButton } from '@/shared/ui';




const defaultTheme: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  notebookId: null,
  textColor: '#e5e7eb',           // gray-200 - matches page text
  backgroundColor: '#111827',      // gray-900 - matches card backgrounds
  markdownHeadingColor: '#ffffff', // white - matches headings
  markdownLinkColor: '#60a5fa',    // blue-400 - visible links
  markdownCodeBackground: '#1f2937', // gray-800 - matches input backgrounds
  markdownCodeText: '#e5e7eb',     // gray-200 - matches page text
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: '#374151', // gray-700 - matches borders
  relatedNoteBackgroundColor: '#1f2937', // gray-800
  relatedNoteTextColor: '#e5e7eb', // gray-200
};

export function AdminNotesThemesPage(): React.JSX.Element {
  const { toast } = useToast();
  const { settings, updateSettings } = useNoteSettings();
  const { selectedNotebookId } = settings;
  const [form, setForm] = useState<Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>>(defaultTheme);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>>(defaultTheme);
  const notebooksQuery: ReturnType<typeof useNotebooks> = useNotebooks();
  const themesQuery: ReturnType<typeof useNoteThemes> = useNoteThemes(selectedNotebookId ?? undefined);
  const createTheme: ReturnType<typeof useCreateNoteTheme> = useCreateNoteTheme();
  const updateTheme: ReturnType<typeof useUpdateNoteTheme> = useUpdateNoteTheme();
  const deleteTheme: ReturnType<typeof useDeleteNoteTheme> = useDeleteNoteTheme();

  const themes: ThemeRecord[] = themesQuery.data ?? [];
  const loading: boolean = themesQuery.isPending;
  const isSaving: boolean = createTheme.isPending;
  const isUpdating: boolean = updateTheme.isPending;

  // Query handles theme loading

  useEffect((): void => {
    if (selectedNotebookId) return;
    const firstId: string | undefined = notebooksQuery.data?.[0]?.id;
    if (firstId) {
      updateSettings({ selectedNotebookId: firstId });
    }
  }, [selectedNotebookId, updateSettings, notebooksQuery.data]);

  const handleCreate = async (): Promise<void> => {
    if (!form.name.trim()) {
      toast('Theme name is required', { variant: 'error' });
      return;
    }
    try {
      if (!selectedNotebookId) return;
      await createTheme.mutateAsync({
        name: form.name.trim(),
        notebookId: selectedNotebookId,
        textColor: form.textColor,
        backgroundColor: form.backgroundColor,
        markdownHeadingColor: form.markdownHeadingColor,
        markdownLinkColor: form.markdownLinkColor,
        markdownCodeBackground: form.markdownCodeBackground,
        markdownCodeText: form.markdownCodeText,
        relatedNoteBorderWidth: form.relatedNoteBorderWidth ?? 1,
        relatedNoteBorderColor: form.relatedNoteBorderColor,
        relatedNoteBackgroundColor: form.relatedNoteBackgroundColor,
        relatedNoteTextColor: form.relatedNoteTextColor,
      });
      setForm(defaultTheme);
      toast('Theme created', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesThemesPage', action: 'createTheme', name: form['name'], notebookId: selectedNotebookId } });
      toast('Failed to create theme', { variant: 'error' });
    }
  };

  const handleDelete = async (themeId: string): Promise<void> => {
    if (!confirm('Delete this theme?')) return;
    try {
      await deleteTheme.mutateAsync(themeId);
      toast('Theme deleted', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesThemesPage', action: 'deleteTheme', themeId } });
      toast('Failed to delete theme', { variant: 'error' });
    }
  };

  const handleEditStart = (theme: ThemeRecord): void => {
    setEditingId(theme.id);
    setEditingForm({
      name: theme.name,
      notebookId: (theme.notebookId) ?? null,
      textColor: theme.textColor,
      backgroundColor: theme.backgroundColor,
      markdownHeadingColor: theme.markdownHeadingColor,
      markdownLinkColor: theme.markdownLinkColor,
      markdownCodeBackground: theme.markdownCodeBackground,
      markdownCodeText: theme.markdownCodeText,
      relatedNoteBorderWidth: theme.relatedNoteBorderWidth,
      relatedNoteBorderColor: theme.relatedNoteBorderColor,
      relatedNoteBackgroundColor: theme.relatedNoteBackgroundColor,
      relatedNoteTextColor: theme.relatedNoteTextColor,
    });
  };

  const handleEditCancel = (): void => {
    setEditingId(null);
    setEditingForm(defaultTheme);
  };

  const handleUpdate = async (themeId: string): Promise<void> => {
    if (!editingForm['name'].trim()) {
      toast('Theme name is required', { variant: 'error' });
      return;
    }
    try {
      await updateTheme.mutateAsync({
        id: themeId,
        ...editingForm,
        name: editingForm['name'].trim(),
      });
      toast('Theme updated', { variant: 'success' });
      handleEditCancel();
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesThemesPage', action: 'updateTheme', themeId } });
      toast('Failed to update theme', { variant: 'error' });
    }
  };

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Note Themes'
        description='Create and manage themes for your notes.'
        className='mb-6'
      />

      <div className='space-y-6'>
        <FormSection title='Create Theme' className='p-6'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <FormField label='Theme Name' className='sm:col-span-2'>
              <Input
                type='text'
                value={form.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, name: event.target.value }))}
                className='w-full rounded-lg border bg-gray-800 px-4 py-2 text-white'
                placeholder='Enter theme name'
              />
            </FormField>
            <FormField label='Text Color'>
              <Input
                type='color'
                value={form.textColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, textColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Background Color'>
              <Input
                type='color'
                value={form.backgroundColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, backgroundColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Markdown Heading'>
              <Input
                type='color'
                value={form.markdownHeadingColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownHeadingColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Markdown Link'>
              <Input
                type='color'
                value={form.markdownLinkColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownLinkColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Code Background'>
              <Input
                type='color'
                value={form.markdownCodeBackground}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownCodeBackground: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Code Text'>
              <Input
                type='color'
                value={form.markdownCodeText}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownCodeText: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Related Border Width'>
              <Input
                type='number'
                min={0}
                max={8}
                value={form.relatedNoteBorderWidth}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                    ...prev,
                    relatedNoteBorderWidth: Number(event.target.value),
                  }))
                }
                className='h-10 w-full rounded border bg-gray-800 px-3 text-white'
              />
            </FormField>
            <FormField label='Related Border Color'>
              <Input
                type='color'
                value={form.relatedNoteBorderColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, relatedNoteBorderColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Related Background'>
              <Input
                type='color'
                value={form.relatedNoteBackgroundColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                    ...prev,
                    relatedNoteBackgroundColor: event.target.value,
                  }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
            <FormField label='Related Text Color'>
              <Input
                type='color'
                value={form.relatedNoteTextColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, relatedNoteTextColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </FormField>
          </div>
          <div className='mt-4'>
            <Button onClick={(): void => { void handleCreate(); }} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </FormSection>

        <FormSection
          title='Existing Themes'
          actions={(
            <RefreshButton
              onRefresh={(): void => { void themesQuery.refetch(); }}
              isRefreshing={loading}
            />
          )}
          className='p-6'
        >
          {loading ? (
            <p className='text-sm text-gray-400'>Loading themes...</p>
          ) : themes.length === 0 ? (
            <p className='text-sm text-gray-400'>No themes created yet.</p>
          ) : (
            <div className='space-y-4'>
              {themes.map((theme: ThemeRecord): React.JSX.Element => {
                const isEditing: boolean = editingId === theme['id'];
                const values: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> = isEditing ? editingForm : theme;
                return (
                  <div
                    key={theme['id']}
                    className='rounded-lg border border-border bg-card/60 p-4'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='flex items-center gap-2'>
                        <div className='text-sm font-semibold text-white'>{theme['name']}</div>
                        <div className='text-xs text-gray-500'>
                          Updated {theme['updatedAt'] ? new Date(theme['updatedAt']).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {isEditing ? (
                          <>
                            <Button
                              onClick={(): void => { void handleUpdate(theme['id']); }}
                              disabled={isUpdating}
                              size='sm'
                            >
                              {isUpdating ? 'Saving...' : 'Save'}
                            </Button>
                            <Button onClick={handleEditCancel} variant='outline' size='sm'>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button onClick={(): void => handleEditStart(theme)} variant='outline' size='sm'>
                            Edit
                          </Button>
                        )}
                        <Button
                          onClick={(): void => { void handleDelete(theme['id']); }}
                          variant='outline'
                          size='sm'
                          className='border-red-500/40 text-red-300 hover:text-red-200'
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    </div>
                    <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                      <FormField label='Theme Name'>
                        <Input
                          type='text'
                          value={values.name}
                          disabled={!isEditing}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, name: event.target.value }));
                          }}
                          className='w-full rounded-md border bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Text'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.textColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, textColor: event.target.value }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Background'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.backgroundColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              backgroundColor: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Heading'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownHeadingColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              markdownHeadingColor: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Link'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownLinkColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              markdownLinkColor: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Code Bg'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownCodeBackground}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              markdownCodeBackground: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Code Text'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownCodeText}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              markdownCodeText: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Related Border Width'>
                        <Input
                          type='number'
                          min={0}
                          max={8}
                          disabled={!isEditing}
                          value={values.relatedNoteBorderWidth}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              relatedNoteBorderWidth: Number(event.target.value),
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 px-3 text-sm text-white disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Related Border Color'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.relatedNoteBorderColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              relatedNoteBorderColor: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Related Background'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.relatedNoteBackgroundColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              relatedNoteBackgroundColor: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                      <FormField label='Related Text Color'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.relatedNoteTextColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({
                              ...prev,
                              relatedNoteTextColor: event.target.value,
                            }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </FormField>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FormSection>
      </div>
    </div>
  );
}
