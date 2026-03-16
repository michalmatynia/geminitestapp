'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { UserPreferences } from '@/shared/contracts/auth';
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from '@/shared/hooks/useUserPreferences';
import {
  AdminCaseResolverPageLayout,
  Button,
  FormField,
  FormSection,
  SelectSimple,
  useToast,
  LoadingState,
  FormActions,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
type CaseResolverCaseListFiltersVisibility = 'hidden' | 'shown';

type CaseResolverCaseListPreferences = {
  caseResolverCaseListViewMode: CaseResolverCaseListViewMode;
  caseResolverCaseListSortBy: CaseResolverCaseListSortBy;
  caseResolverCaseListSortOrder: CaseResolverCaseListSortOrder;
  caseResolverCaseListSearchScope: CaseResolverCaseListSearchScope;
  caseResolverCaseListFiltersCollapsedByDefault: boolean;
  caseResolverCaseListShowNestedContent: boolean;
};

const CASE_LIST_VIEW_MODE_OPTIONS: Array<LabeledOptionDto<CaseResolverCaseListViewMode>> = [
  { value: 'hierarchy', label: 'Hierarchy' },
  { value: 'list', label: 'List' },
];

const CASE_LIST_SORT_BY_OPTIONS: Array<LabeledOptionDto<CaseResolverCaseListSortBy>> = [
  { value: 'updated', label: 'Date modified' },
  { value: 'created', label: 'Date created' },
  { value: 'happeningDate', label: 'Happening date' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'signature', label: 'Signature' },
  { value: 'locked', label: 'Lock state' },
  { value: 'sent', label: 'Sent state' },
];

const CASE_LIST_SORT_ORDER_OPTIONS: Array<LabeledOptionDto<CaseResolverCaseListSortOrder>> = [
  { value: 'desc', label: 'Descending' },
  { value: 'asc', label: 'Ascending' },
];

const CASE_LIST_SEARCH_SCOPE_OPTIONS: Array<LabeledOptionDto<CaseResolverCaseListSearchScope>> = [
  { value: 'all', label: 'Name + Folder + Content' },
  { value: 'name', label: 'Name only' },
  { value: 'folder', label: 'Folder only' },
  { value: 'content', label: 'Content only' },
];

const CASE_LIST_FILTERS_VISIBILITY_OPTIONS: Array<
  LabeledOptionDto<CaseResolverCaseListFiltersVisibility>
> = [
  { value: 'hidden', label: 'Hide Filters' },
  { value: 'shown', label: 'Show Filters' },
];

const CASE_LIST_NESTED_CONTENT_OPTIONS: Array<
  LabeledOptionDto<CaseResolverCaseListFiltersVisibility>
> = [
  { value: 'shown', label: 'Show nested content' },
  { value: 'hidden', label: 'Hide nested content' },
];

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
  const updatePreferencesMutation = useUpdateUserPreferences();

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
      logClientError(error);
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
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to reset Case Resolver preferences.', {
        variant: 'error',
      });
    }
  };

  if (preferencesQuery.isLoading && !preferencesQuery.data) {
    return (
      <AdminCaseResolverPageLayout
        title='Case Resolver Preferences'
        current='Preferences'
        description='Configure default view, sorting, and search behavior for Case Resolver cases.'
        headerActions={
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
        containerClassName='page-section max-w-5xl'
      >
        <div className='flex min-h-[400px] items-center justify-center'>
          <LoadingState message='Loading preferences...' />
        </div>
      </AdminCaseResolverPageLayout>
    );
  }

  return (
    <AdminCaseResolverPageLayout
      title='Case Resolver Preferences'
      current='Preferences'
      description='Configure default view, sorting, and search behavior for Case Resolver cases.'
      headerActions={
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
      containerClassName='page-section max-w-5xl'
    >

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
              options={CASE_LIST_VIEW_MODE_OPTIONS}
             ariaLabel='Default View' title='Default View'/>
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
              options={CASE_LIST_SORT_BY_OPTIONS}
             ariaLabel='Default Sort By' title='Default Sort By'/>
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
              options={CASE_LIST_SORT_ORDER_OPTIONS}
             ariaLabel='Default Sort Order' title='Default Sort Order'/>
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
              options={CASE_LIST_SEARCH_SCOPE_OPTIONS}
             ariaLabel='Default Search Scope' title='Default Search Scope'/>
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
              options={CASE_LIST_FILTERS_VISIBILITY_OPTIONS}
             ariaLabel='Filters Button Default' title='Filters Button Default'/>
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
              options={CASE_LIST_NESTED_CONTENT_OPTIONS}
             ariaLabel='Default Nested Content' title='Default Nested Content'/>
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
    </AdminCaseResolverPageLayout>
  );
}
