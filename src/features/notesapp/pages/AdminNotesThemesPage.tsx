'use client';

import { Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useNotebookResource } from '@/features/notesapp/api/useNotebookResource';
import {
  useCreateNoteTheme,
  useDeleteNoteTheme,
  useUpdateNoteTheme,
} from '@/features/notesapp/api/useNoteMutations';
import { useNoteThemes } from '@/features/notesapp/api/useNoteQueries';
import {
  useNoteSettingsActions,
  useNoteSettingsState,
} from '@/features/notesapp/hooks/NoteSettingsContext';
import type { ThemeRecord } from '@/shared/contracts/notes';
import {
  Button,
  useToast,
  Input,
  PageLayout,
  FormSection,
  FormField,
  ListPanel,
  FormActions,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const defaultTheme: Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  isDefault: false,
  notebookId: null,
  textColor: '#e5e7eb',
  backgroundColor: '#111827',
  markdownHeadingColor: '#ffffff',
  markdownLinkColor: '#60a5fa',
  markdownCodeBackground: '#1f2937',
  markdownCodeText: '#e5e7eb',
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: '#374151',
  relatedNoteBackgroundColor: '#1f2937',
  relatedNoteTextColor: '#e5e7eb',
};

export function AdminNotesThemesPage(): React.JSX.Element {
  const { toast } = useToast();
  const { settings } = useNoteSettingsState();
  const { updateSettings } = useNoteSettingsActions();
  const { selectedNotebookId } = settings;
  const [form, setForm] =
    useState<Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>>(defaultTheme);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] =
    useState<Omit<ThemeRecord, 'id' | 'createdAt' | 'updatedAt'>>(defaultTheme);
  const { listQuery: notebooksQuery } = useNotebookResource();
  const themesQuery = useNoteThemes(selectedNotebookId ?? undefined);
  const createTheme = useCreateNoteTheme();
  const updateTheme = useUpdateNoteTheme();
  const deleteTheme = useDeleteNoteTheme();

  const [themeToDelete, setThemeToDelete] = useState<string | null>(null);

  const themes = themesQuery.data ?? [];
  const loading = themesQuery.isPending;
  const isSaving = createTheme.isPending;
  const isUpdating = updateTheme.isPending;

  useEffect((): void => {
    if (selectedNotebookId) return;
    const firstId = notebooksQuery.data?.[0]?.id;
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
        ...form,
        name: form.name.trim(),
        notebookId: selectedNotebookId,
      });
      setForm(defaultTheme);
      toast('Theme created', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'AdminNotesThemesPage',
          action: 'createTheme',
          name: form.name,
          notebookId: selectedNotebookId,
        },
      });
      toast('Failed to create theme', { variant: 'error' });
    }
  };

  const handleDelete = async (themeId: string): Promise<void> => {
    try {
      await deleteTheme.mutateAsync(themeId);
      toast('Theme deleted', { variant: 'success' });
      setThemeToDelete(null);
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'AdminNotesThemesPage',
          action: 'deleteTheme',
          themeId,
        },
      });
      toast('Failed to delete theme', { variant: 'error' });
    }
  };

  const handleEditStart = (theme: ThemeRecord): void => {
    setEditingId(theme.id);
    setEditingForm({ ...theme });
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
        ...editingForm,
        name: editingForm.name.trim(),
      });
      toast('Theme updated', { variant: 'success' });
      handleEditCancel();
    } catch (error: unknown) {
      logClientError(error, {
        context: {
          source: 'AdminNotesThemesPage',
          action: 'updateTheme',
          themeId,
        },
      });
      toast('Failed to update theme', { variant: 'error' });
    }
  };

  return (
    <PageLayout title='Note Themes' description='Create and manage themes for your notes.'>
      <div className='max-w-5xl space-y-8'>
        <FormSection title='Create Theme' className='p-6'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <FormField label='Theme Name' className='sm:col-span-2'>
              <Input
                type='text'
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder='Enter theme name'
              />
            </FormField>
            <FormField label='Text Color'>
              <Input
                type='color'
                value={form.textColor}
                onChange={(e) => setForm((prev) => ({ ...prev, textColor: e.target.value }))}
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Background Color'>
              <Input
                type='color'
                value={form.backgroundColor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    backgroundColor: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Markdown Heading'>
              <Input
                type='color'
                value={form.markdownHeadingColor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    markdownHeadingColor: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Markdown Link'>
              <Input
                type='color'
                value={form.markdownLinkColor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    markdownLinkColor: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Code Background'>
              <Input
                type='color'
                value={form.markdownCodeBackground}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    markdownCodeBackground: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Code Text'>
              <Input
                type='color'
                value={form.markdownCodeText}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    markdownCodeText: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Related Border Width'>
              <Input
                type='number'
                min={0}
                max={8}
                value={form.relatedNoteBorderWidth}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    relatedNoteBorderWidth: Number(e.target.value),
                  }))
                }
              />
            </FormField>
            <FormField label='Related Border Color'>
              <Input
                type='color'
                value={form.relatedNoteBorderColor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    relatedNoteBorderColor: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Related Background'>
              <Input
                type='color'
                value={form.relatedNoteBackgroundColor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    relatedNoteBackgroundColor: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
            <FormField label='Related Text Color'>
              <Input
                type='color'
                value={form.relatedNoteTextColor}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    relatedNoteTextColor: e.target.value,
                  }))
                }
                className='h-10 p-1'
              />
            </FormField>
          </div>
          <FormActions
            onSave={() => void handleCreate()}
            saveText='Create Theme'
            isSaving={isSaving}
            className='mt-6'
          />
        </FormSection>

        <ListPanel
          title='Existing Themes'
          refresh={{
            onRefresh: () => void themesQuery.refetch(),
            isRefreshing: loading,
          }}
          isLoading={loading}
        >
          <div className='space-y-4'>
            {themes.length === 0 ? (
              <p className='text-sm text-gray-400 italic py-4'>No themes created yet.</p>
            ) : (
              themes.map((theme) => {
                const isEditing = editingId === theme.id;
                const values = isEditing ? editingForm : theme;
                return (
                  <div
                    key={theme.id}
                    className='rounded-lg border border-border/60 bg-card/30 p-5 transition-colors hover:bg-card/40'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
                      <div className='flex items-center gap-3'>
                        <div className='text-lg font-semibold text-white'>{theme.name}</div>
                        <div className='text-xs text-gray-500'>
                          Updated{' '}
                          {theme.updatedAt ? new Date(theme.updatedAt).toLocaleString() : '—'}
                        </div>
                      </div>
                      <div className='flex items-center gap-2'>
                        {isEditing ? (
                          <FormActions
                            onSave={() => void handleUpdate(theme.id)}
                            onCancel={handleEditCancel}
                            saveText='Save'
                            isSaving={isUpdating}
                            saveVariant='default'
                            cancelVariant='ghost'
                            size='sm'
                          />
                        ) : (
                          <Button
                            onClick={() => handleEditStart(theme)}
                            variant='outline'
                            size='sm'
                          >
                            Edit
                          </Button>
                        )}
                        {!isEditing && (
                          <Button
                            onClick={() => setThemeToDelete(theme.id)}
                            variant='outline'
                            size='sm'
                            className='border-red-500/40 text-red-300 hover:text-red-200'
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                      <FormField label='Theme Name'>
                        <Input
                          type='text'
                          value={values.name}
                          disabled={!isEditing}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          className='h-8 text-sm'
                        />
                      </FormField>
                      <FormField label='Text'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.textColor}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              textColor: e.target.value,
                            }))
                          }
                          className='h-8 p-1'
                        />
                      </FormField>
                      <FormField label='Background'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.backgroundColor}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              backgroundColor: e.target.value,
                            }))
                          }
                          className='h-8 p-1'
                        />
                      </FormField>
                      <FormField label='Heading'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownHeadingColor}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownHeadingColor: e.target.value,
                            }))
                          }
                          className='h-8 p-1'
                        />
                      </FormField>
                      <FormField label='Link'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownLinkColor}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownLinkColor: e.target.value,
                            }))
                          }
                          className='h-8 p-1'
                        />
                      </FormField>
                      <FormField label='Code Bg'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownCodeBackground}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownCodeBackground: e.target.value,
                            }))
                          }
                          className='h-8 p-1'
                        />
                      </FormField>
                      <FormField label='Code Text'>
                        <Input
                          type='color'
                          disabled={!isEditing}
                          value={values.markdownCodeText}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              markdownCodeText: e.target.value,
                            }))
                          }
                          className='h-8 p-1'
                        />
                      </FormField>
                      <FormField label='Border Width'>
                        <Input
                          type='number'
                          min={0}
                          max={8}
                          disabled={!isEditing}
                          value={values.relatedNoteBorderWidth}
                          onChange={(e) =>
                            setEditingForm((prev) => ({
                              ...prev,
                              relatedNoteBorderWidth: Number(e.target.value),
                            }))
                          }
                          className='h-8'
                        />
                      </FormField>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ListPanel>
      </div>

      <ConfirmModal
        isOpen={Boolean(themeToDelete)}
        onClose={() => setThemeToDelete(null)}
        title='Delete Theme?'
        message='Are you sure you want to delete this theme? This action cannot be undone.'
        confirmText='Delete Theme'
        isDangerous={true}
        onConfirm={() => {
          if (themeToDelete) {
            void handleDelete(themeToDelete);
          }
        }}
      />
    </PageLayout>
  );
}
