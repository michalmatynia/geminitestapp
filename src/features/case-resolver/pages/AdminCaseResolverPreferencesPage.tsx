'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import {
  useUpdateUserPreferencesMutation,
  useUserPreferences,
} from '@/features/auth';
import type { UserPreferences } from '@/shared/contracts/auth';
import {
  Button,
  FormField,
  FormSection,
  SectionHeader,
  SelectSimple,
  useToast,
  LoadingState,
  Breadcrumbs,
  FormActions,
} from '@/shared/ui';

type CaseResolverCaseListViewMode = 'hierarchy' | 'list';
type CaseResolverCaseListSortBy =
  | 'updated'
  | 'created'
  | 'happeningDate'
  | 'name'
  | 'status'
  | 'signature'
  | 'locked'
  | 'sent';
type CaseResolverCaseListSortOrder = 'asc' | 'desc';
type CaseResolverCaseListSearchScope = 'all' | 'name' | 'folder' | 'content';

type CaseResolverCaseListPreferences = {
  caseResolverCaseListViewMode: CaseResolverCaseListViewMode;
  caseResolverCaseListSortBy: CaseResolverCaseListSortBy;
  caseResolverCaseListSortOrder: CaseResolverCaseListSortOrder;
  caseResolverCaseListSearchScope: CaseResolverCaseListSearchScope;
  caseResolverCaseListFiltersCollapsedByDefault: boolean;
  caseResolverCaseListShowNestedContent: boolean;
};

const DEFAULT_CASE_RESOLVER_CASE_LIST_PREFERENCES: CaseResolverCaseListPreferences = {
  caseResolverCaseListViewMode: 'hierarchy',
  caseResolverCaseListSortBy: 'updated',
  caseResolverCaseListSortOrder: 'desc',
  caseResolverCaseListSearchScope: 'all',
  caseResolverCaseListFiltersCollapsedByDefault: true,
  caseResolverCaseListShowNestedContent: true,
};

const normalizeCaseResolverCaseListPreferences = (
  preferences: UserPreferences | undefined
): CaseResolverCaseListPreferences => ({
  caseResolverCaseListViewMode:
    preferences?.caseResolverCaseListViewMode === 'list' ? 'list' : 'hierarchy',
  caseResolverCaseListSortBy:
    preferences?.caseResolverCaseListSortBy === 'created' ||
    preferences?.caseResolverCaseListSortBy === 'happeningDate' ||
    preferences?.caseResolverCaseListSortBy === 'name' ||
    preferences?.caseResolverCaseListSortBy === 'status' ||
    preferences?.caseResolverCaseListSortBy === 'signature' ||
    preferences?.caseResolverCaseListSortBy === 'locked' ||
    preferences?.caseResolverCaseListSortBy === 'sent'
      ? preferences.caseResolverCaseListSortBy
      : 'updated',
  caseResolverCaseListSortOrder:
    preferences?.caseResolverCaseListSortOrder === 'asc' ? 'asc' : 'desc',
  caseResolverCaseListSearchScope:
    preferences?.caseResolverCaseListSearchScope === 'name' ||
    preferences?.caseResolverCaseListSearchScope === 'folder' ||
    preferences?.caseResolverCaseListSearchScope === 'content'
      ? preferences.caseResolverCaseListSearchScope
      : 'all',
  caseResolverCaseListFiltersCollapsedByDefault:
    preferences?.caseResolverCaseListFiltersCollapsedByDefault ?? true,
  caseResolverCaseListShowNestedContent: preferences?.caseResolverCaseListShowNestedContent ?? true,
});

export function AdminCaseResolverPreferencesPage(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const preferencesQuery = useUserPreferences();
  const updatePreferencesMutation = useUpdateUserPreferencesMutation();

  const savedPreferences = useMemo(
    () => normalizeCaseResolverCaseListPreferences(preferencesQuery.data),
    [preferencesQuery.data]
  );
  const hydrationSignature = useMemo(() => JSON.stringify(savedPreferences), [savedPreferences]);

  const [draft, setDraft] = useState<CaseResolverCaseListPreferences>(
    DEFAULT_CASE_RESOLVER_CASE_LIST_PREFERENCES
  );
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  useEffect(() => {
    if (loadedFrom === hydrationSignature) return;
    setDraft(savedPreferences);
    setLoadedFrom(hydrationSignature);
  }, [hydrationSignature, loadedFrom, savedPreferences]);

  const handleSave = async (): Promise<void> => {
    try {
      await updatePreferencesMutation.mutateAsync({
        caseResolverCaseListViewMode: draft.caseResolverCaseListViewMode,
        caseResolverCaseListSortBy: draft.caseResolverCaseListSortBy,
        caseResolverCaseListSortOrder: draft.caseResolverCaseListSortOrder,
        caseResolverCaseListSearchScope: draft.caseResolverCaseListSearchScope,
        caseResolverCaseListFiltersCollapsedByDefault:
          draft.caseResolverCaseListFiltersCollapsedByDefault,
        caseResolverCaseListShowNestedContent: draft.caseResolverCaseListShowNestedContent,
      });
      toast('Case Resolver preferences saved.', { variant: 'success' });
      router.push('/admin/case-resolver/cases');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save Case Resolver preferences.', {
        variant: 'error',
      });
    }
  };

  const handleReset = async (): Promise<void> => {
    try {
      await updatePreferencesMutation.mutateAsync(DEFAULT_CASE_RESOLVER_CASE_LIST_PREFERENCES);
      setDraft(DEFAULT_CASE_RESOLVER_CASE_LIST_PREFERENCES);
      setLoadedFrom(JSON.stringify(DEFAULT_CASE_RESOLVER_CASE_LIST_PREFERENCES));
      toast('Case Resolver preferences reset to defaults.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to reset Case Resolver preferences.', {
        variant: 'error',
      });
    }
  };

  if (preferencesQuery.isLoading && !preferencesQuery.data) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <LoadingState message='Loading preferences...' />
      </div>
    );
  }

  return (
    <div className='container mx-auto max-w-5xl space-y-6 py-10'>
      <SectionHeader
        title='Case Resolver Preferences'
        description='Configure default view, sorting, and search behavior for Case Resolver cases.'
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Case Resolver', href: '/admin/case-resolver' },
              { label: 'Preferences' },
            ]}
            className='mb-2'
          />
        }
        actions={
          <Button
            type='button'
            variant='outline'
            onClick={(): void => {
              router.push('/admin/case-resolver/cases');
            }}
          >
            Back to Cases
          </Button>
        }
      />

      <FormSection title='Case List Defaults' className='p-6'>
        <div className='space-y-4'>
          <FormField
            label='Default View'
            description='Choose whether the Case list opens in hierarchy or list view.'
          >
            <SelectSimple
              size='sm'
              value={draft.caseResolverCaseListViewMode}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaseListPreferences) => ({
                  ...current,
                  caseResolverCaseListViewMode: value === 'list' ? 'list' : 'hierarchy',
                }));
              }}
              options={[
                { value: 'hierarchy', label: 'Hierarchy' },
                { value: 'list', label: 'List' },
              ]}
            />
          </FormField>

          <FormField label='Default Sort By' description='Choose the initial sort field for Cases.'>
            <SelectSimple
              size='sm'
              value={draft.caseResolverCaseListSortBy}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaseListPreferences) => ({
                  ...current,
                  caseResolverCaseListSortBy:
                    value === 'created' ||
                    value === 'happeningDate' ||
                    value === 'name' ||
                    value === 'status' ||
                    value === 'signature' ||
                    value === 'locked' ||
                    value === 'sent'
                      ? value
                      : 'updated',
                }));
              }}
              options={[
                { value: 'updated', label: 'Date modified' },
                { value: 'created', label: 'Date created' },
                { value: 'happeningDate', label: 'Happening date' },
                { value: 'name', label: 'Name' },
                { value: 'status', label: 'Status' },
                { value: 'signature', label: 'Signature' },
                { value: 'locked', label: 'Lock state' },
                { value: 'sent', label: 'Sent state' },
              ]}
            />
          </FormField>

          <FormField
            label='Default Sort Order'
            description='Choose whether Cases are shown in ascending or descending order.'
          >
            <SelectSimple
              size='sm'
              value={draft.caseResolverCaseListSortOrder}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaseListPreferences) => ({
                  ...current,
                  caseResolverCaseListSortOrder: value === 'asc' ? 'asc' : 'desc',
                }));
              }}
              options={[
                { value: 'desc', label: 'Descending' },
                { value: 'asc', label: 'Ascending' },
              ]}
            />
          </FormField>

          <FormField
            label='Default Search Scope'
            description='Set what fields are searched first when typing in Case search.'
          >
            <SelectSimple
              size='sm'
              value={draft.caseResolverCaseListSearchScope}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaseListPreferences) => ({
                  ...current,
                  caseResolverCaseListSearchScope:
                    value === 'name' || value === 'folder' || value === 'content' ? value : 'all',
                }));
              }}
              options={[
                { value: 'all', label: 'Name + Folder + Content' },
                { value: 'name', label: 'Name only' },
                { value: 'folder', label: 'Folder only' },
                { value: 'content', label: 'Content only' },
              ]}
            />
          </FormField>

          <FormField
            label='Filters Button Default'
            description='Set whether filters are hidden or shown when opening the Case list.'
          >
            <SelectSimple
              size='sm'
              value={draft.caseResolverCaseListFiltersCollapsedByDefault ? 'hidden' : 'shown'}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaseListPreferences) => ({
                  ...current,
                  caseResolverCaseListFiltersCollapsedByDefault: value === 'hidden',
                }));
              }}
              options={[
                { value: 'hidden', label: 'Hide Filters' },
                { value: 'shown', label: 'Show Filters' },
              ]}
            />
          </FormField>

          <FormField
            label='Default Nested Content'
            description='Choose whether nested folders and files are shown by default in Case List.'
          >
            <SelectSimple
              size='sm'
              value={draft.caseResolverCaseListShowNestedContent ? 'shown' : 'hidden'}
              onValueChange={(value: string): void => {
                setDraft((current: CaseResolverCaseListPreferences) => ({
                  ...current,
                  caseResolverCaseListShowNestedContent: value !== 'hidden',
                }));
              }}
              options={[
                { value: 'shown', label: 'Show nested content' },
                { value: 'hidden', label: 'Hide nested content' },
              ]}
            />
          </FormField>
        </div>
      </FormSection>

      <FormActions
        onCancel={() => {
          void handleReset();
        }}
        cancelText='Reset to Defaults'
        cancelVariant='outline'
        onSave={() => {
          void handleSave();
        }}
        saveText='Save Preferences'
        isSaving={updatePreferencesMutation.isPending}
        className='justify-start'
      />
    </div>
  );
}
