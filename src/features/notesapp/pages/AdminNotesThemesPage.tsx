'use client';

import { Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useCreateNoteTheme, useDeleteNoteTheme, useUpdateNoteTheme } from '@/features/notesapp/api/useNoteMutations';
import { useNotebooks, useNoteThemes } from '@/features/notesapp/api/useNoteQueries';
import { useNoteSettings } from '@/features/notesapp/hooks/NoteSettingsContext';
import { logClientError } from '@/features/observability';
import type { ThemeRecord } from '@/shared/types/notes';
import { Button, useToast, Input, Label, SectionHeader, SectionPanel } from '@/shared/ui';




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
        colors: {
          textColor: form.textColor,
          backgroundColor: form.backgroundColor,
          markdownHeadingColor: form.markdownHeadingColor,
          markdownLinkColor: form.markdownLinkColor,
          markdownCodeBackground: form.markdownCodeBackground,
          markdownCodeText: form.markdownCodeText,
          relatedNoteBorderWidth: String(form.relatedNoteBorderWidth ?? 1),
          relatedNoteBorderColor: form.relatedNoteBorderColor,
          relatedNoteBackgroundColor: form.relatedNoteBackgroundColor,
          relatedNoteTextColor: form.relatedNoteTextColor,
        },
      });
      setForm(defaultTheme);
      toast('Theme created', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'AdminNotesThemesPage', action: 'createTheme', name: form.name, notebookId: selectedNotebookId } });
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
      notebookId: theme.notebookId ?? null,
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
    if (!editingForm.name.trim()) {
      toast('Theme name is required', { variant: 'error' });
      return;
    }
    try {
      await updateTheme.mutateAsync({
        id: themeId,
        data: { ...editingForm, name: editingForm.name.trim() },
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
        <SectionPanel className='p-6'>
          <SectionHeader title='Create Theme' size='sm' className='mb-4' />
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <div className='sm:col-span-2'>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Theme Name
              </Label>
              <Input
                type='text'
                value={form.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, name: event.target.value }))}
                className='w-full rounded-lg border bg-gray-800 px-4 py-2 text-white'
                placeholder='Enter theme name'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Text Color
              </Label>
              <Input
                type='color'
                value={form.textColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, textColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Background Color
              </Label>
              <Input
                type='color'
                value={form.backgroundColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, backgroundColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Markdown Heading
              </Label>
              <Input
                type='color'
                value={form.markdownHeadingColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownHeadingColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Markdown Link
              </Label>
              <Input
                type='color'
                value={form.markdownLinkColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownLinkColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Code Background
              </Label>
              <Input
                type='color'
                value={form.markdownCodeBackground}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownCodeBackground: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Code Text
              </Label>
              <Input
                type='color'
                value={form.markdownCodeText}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, markdownCodeText: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Related Border Width
              </Label>
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
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Related Border Color
              </Label>
              <Input
                type='color'
                value={form.relatedNoteBorderColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, relatedNoteBorderColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Related Background
              </Label>
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
            </div>
            <div>
              <Label className='mb-2 block text-sm font-medium text-gray-200'>
                Related Text Color
              </Label>
              <Input
                type='color'
                value={form.relatedNoteTextColor}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                  setForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, relatedNoteTextColor: event.target.value }))
                }
                className='h-10 w-full rounded border bg-gray-800'
              />
            </div>
          </div>
          <div className='mt-4'>
            <Button onClick={(): void => { void handleCreate(); }} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Create'}
            </Button>
          </div>
        </SectionPanel>

        <SectionPanel className='p-6'>
          <SectionHeader
            title='Existing Themes'
            size='sm'
            className='mb-4'
            actions={(
              <Button variant='outline' onClick={(): void => { void themesQuery.refetch(); }}>
                Refresh
              </Button>
            )}
          />
          {loading ? (
            <p className='text-sm text-gray-400'>Loading themes...</p>
          ) : themes.length === 0 ? (
            <p className='text-sm text-gray-400'>No themes created yet.</p>
          ) : (
            <div className='space-y-4'>
              {themes.map((theme: ThemeRecord): React.JSX.Element => {
                const isEditing: boolean = editingId === theme.id;
                const values: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> = isEditing ? editingForm : theme;
                return (
                  <div
                    key={theme.id}
                    className='rounded-lg border border-border bg-card/60 p-4'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='flex items-center gap-2'>
                        <div className='text-sm font-semibold text-white'>{theme.name}</div>
                        <div className='text-xs text-gray-500'>
                          Updated {new Date(theme.updatedAt).toLocaleString()}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {isEditing ? (
                          <>
                            <Button
                              onClick={(): void => { void handleUpdate(theme.id); }}
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
                          onClick={(): void => { void handleDelete(theme.id); }}
                          variant='outline'
                          size='sm'
                          className='border-red-500/40 text-red-300 hover:text-red-200'
                        >
                          <Trash2 className='size-4' />
                        </Button>
                      </div>
                    </div>
                    <div className='mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>Theme Name</Label>
                        <Input
                          type='text'
                          value={values.name}
                          disabled={!isEditing}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, name: event.target.value }));
                          }}
                          className='w-full rounded-md border bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-60'
                        />
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>Text</Label>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.textColor}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                            if (isEditing) setEditingForm((prev: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>): Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> => ({ ...prev, textColor: event.target.value }));
                          }}
                          className='h-9 w-full rounded border bg-gray-800 disabled:opacity-60'
                        />
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>Background</Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>Heading</Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>Link</Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>Code Bg</Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>Code Text</Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>
                          Related Border Width
                        </Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>
                          Related Border Color
                        </Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>
                          Related Background
                        </Label>
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
                      </div>
                      <div>
                        <Label className='mb-2 block text-xs text-gray-400'>
                          Related Text Color
                        </Label>
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}