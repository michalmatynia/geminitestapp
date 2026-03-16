'use client';

import { Plus } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import type { CaseResolverIdentifier } from '@/shared/contracts/case-resolver';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  AdminCaseResolverPageLayout,
  Button,
  FormSection,
  Skeleton,
  Tag as UiTag,
  useToast,
  SimpleSettingsList,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';

import { CaseResolverIdentifierModal } from '../components/modals/CaseResolverEntityModalVariants';
import { CASE_RESOLVER_IDENTIFIERS_KEY, parseCaseResolverIdentifiers } from '../settings';

type CaseIdentifierFormData = {
  name: string;
  color: string;
  parentId: string | null;
};

const createCaseIdentifierId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `case-identifier-${crypto.randomUUID()}`;
  }
  return `case-identifier-${Math.random().toString(36).slice(2, 10)}`;
};

type CaseIdentifierPathOption = {
  id: string;
  label: string;
  pathIds: string[];
};

const buildCaseIdentifierPathOptions = (
  identifiers: CaseResolverIdentifier[]
): CaseIdentifierPathOption[] => {
  const byId = new Map<string, CaseResolverIdentifier>(
    identifiers.map((identifier: CaseResolverIdentifier): [string, CaseResolverIdentifier] => [
      identifier.id,
      identifier,
    ])
  );
  const cache = new Map<string, { ids: string[]; names: string[] }>();

  const resolvePath = (
    caseIdentifierId: string,
    trail: Set<string>
  ): { ids: string[]; names: string[] } => {
    const cached = cache.get(caseIdentifierId);
    if (cached) return cached;
    const identifier = byId.get(caseIdentifierId);
    if (!identifier) return { ids: [], names: [] };
    if (trail.has(caseIdentifierId)) {
      const fallback = { ids: [identifier.id], names: [identifier.name ?? identifier.value] };
      cache.set(caseIdentifierId, fallback);
      return fallback;
    }

    if (!identifier.parentId || !byId.has(identifier.parentId)) {
      const rootPath = { ids: [identifier.id], names: [identifier.name ?? identifier.value] };
      cache.set(caseIdentifierId, rootPath);
      return rootPath;
    }

    const nextTrail = new Set(trail);
    nextTrail.add(caseIdentifierId);
    const parentPath = resolvePath(identifier.parentId, nextTrail);
    const fullPath = {
      ids: [...parentPath.ids, identifier.id],
      names: [...parentPath.names, identifier.name ?? identifier.value],
    };
    cache.set(caseIdentifierId, fullPath);
    return fullPath;
  };

  return identifiers
    .map((identifier: CaseResolverIdentifier): CaseIdentifierPathOption => {
      const path = resolvePath(identifier.id, new Set<string>());
      return {
        id: identifier.id,
        label: path.names.join(' / '),
        pathIds: path.ids,
      };
    })
    .sort((left: CaseIdentifierPathOption, right: CaseIdentifierPathOption) =>
      left.label.localeCompare(right.label)
    );
};

const collectDescendantCaseIdentifierIds = (
  identifiers: CaseResolverIdentifier[],
  rootCaseIdentifierId: string
): Set<string> => {
  const descendants = new Set<string>([rootCaseIdentifierId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    identifiers.forEach((identifier: CaseResolverIdentifier): void => {
      if (!identifier.parentId || descendants.has(identifier.id)) return;
      if (!descendants.has(identifier.parentId)) return;
      descendants.add(identifier.id);
      expanded = true;
    });
  }
  return descendants;
};

export function AdminCaseResolverIdentifiersPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawCaseIdentifiers = settingsStore.get(CASE_RESOLVER_IDENTIFIERS_KEY);
  const caseIdentifiers = useMemo(
    (): CaseResolverIdentifier[] => parseCaseResolverIdentifiers(rawCaseIdentifiers),
    [rawCaseIdentifiers]
  );

  const [showModal, setShowModal] = useState(false);
  const [editingCaseIdentifier, setEditingCaseIdentifier] = useState<CaseResolverIdentifier | null>(
    null
  );
  const [caseIdentifierToDelete, setCaseIdentifierToDelete] =
    useState<CaseResolverIdentifier | null>(null);
  const [formData, setFormData] = useState<CaseIdentifierFormData>({
    name: '',
    color: '#f59e0b',
    parentId: null,
  });
  const caseIdentifierPathOptions = useMemo(
    (): CaseIdentifierPathOption[] => buildCaseIdentifierPathOptions(caseIdentifiers),
    [caseIdentifiers]
  );
  const caseIdentifierPathById = useMemo(() => {
    const map = new Map<string, string>();
    caseIdentifierPathOptions.forEach((option: CaseIdentifierPathOption): void => {
      map.set(option.id, option.label);
    });
    return map;
  }, [caseIdentifierPathOptions]);
  const blockedParentIds = useMemo(
    () =>
      editingCaseIdentifier
        ? collectDescendantCaseIdentifierIds(caseIdentifiers, editingCaseIdentifier.id)
        : new Set<string>(),
    [editingCaseIdentifier, caseIdentifiers]
  );
  const parentCaseIdentifierOptions = useMemo(
    () =>
      caseIdentifierPathOptions
        .filter((option: CaseIdentifierPathOption): boolean => !blockedParentIds.has(option.id))
        .map((option: CaseIdentifierPathOption) => ({
          value: option.id,
          label: option.label,
        })),
    [blockedParentIds, caseIdentifierPathOptions]
  );

  const openCreateModal = (): void => {
    setEditingCaseIdentifier(null);
    setFormData({ name: '', color: '#f59e0b', parentId: null });
    setShowModal(true);
  };

  const openEditModal = (caseIdentifier: CaseResolverIdentifier): void => {
    setEditingCaseIdentifier(caseIdentifier);
    setFormData({
      name: caseIdentifier.name ?? caseIdentifier.value,
      color: caseIdentifier.color ?? '',
      parentId: caseIdentifier.parentId ?? null,
    });
    setShowModal(true);
  };

  const handleSave = useCallback(async (): Promise<void> => {
    const normalizedName = formData.name.trim();
    if (!normalizedName) {
      toast('Case identifier name is required.', { variant: 'error' });
      return;
    }

    const now = new Date().toISOString();
    const normalizedParentId =
      formData.parentId && formData.parentId !== editingCaseIdentifier?.id
        ? formData.parentId
        : null;
    const nextCaseIdentifier: CaseResolverIdentifier = editingCaseIdentifier
      ? {
        ...editingCaseIdentifier,
        name: normalizedName,
        parentId: normalizedParentId,
        color: formData.color.trim() || '#f59e0b',
        updatedAt: now,
      }
      : {
        id: createCaseIdentifierId(),
        type: 'custom',
        value: normalizedName,
        name: normalizedName,
        parentId: normalizedParentId,
        color: formData.color.trim() || '#f59e0b',
        createdAt: now,
        updatedAt: now,
      };
    const nextCaseIdentifiers = editingCaseIdentifier
      ? caseIdentifiers.map((caseIdentifier: CaseResolverIdentifier) =>
        caseIdentifier.id === editingCaseIdentifier.id ? nextCaseIdentifier : caseIdentifier
      )
      : [...caseIdentifiers, nextCaseIdentifier];

    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_IDENTIFIERS_KEY,
        value: serializeSetting(nextCaseIdentifiers),
      });
      toast(editingCaseIdentifier ? 'Case identifier updated.' : 'Case identifier created.', {
        variant: 'success',
      });
      setShowModal(false);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'AdminCaseResolverIdentifiersPage',
          action: 'saveCaseIdentifier',
          caseIdentifierId: editingCaseIdentifier?.id,
        },
      });
      toast(error instanceof Error ? error.message : 'Failed to save case identifier.', {
        variant: 'error',
      });
    }
  }, [
    caseIdentifiers,
    editingCaseIdentifier,
    formData.color,
    formData.name,
    formData.parentId,
    toast,
    updateSetting,
  ]);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!caseIdentifierToDelete) return;
    const now = new Date().toISOString();
    const nextCaseIdentifiers = caseIdentifiers
      .filter(
        (caseIdentifier: CaseResolverIdentifier) => caseIdentifier.id !== caseIdentifierToDelete.id
      )
      .map(
        (caseIdentifier: CaseResolverIdentifier): CaseResolverIdentifier =>
          caseIdentifier.parentId === caseIdentifierToDelete.id
            ? {
              ...caseIdentifier,
              parentId: null,
              updatedAt: now,
            }
            : caseIdentifier
      );
    try {
      await updateSetting.mutateAsync({
        key: CASE_RESOLVER_IDENTIFIERS_KEY,
        value: serializeSetting(nextCaseIdentifiers),
      });
      toast('Case identifier deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: {
          source: 'AdminCaseResolverIdentifiersPage',
          action: 'deleteCaseIdentifier',
          caseIdentifierId: caseIdentifierToDelete.id,
        },
      });
      toast(error instanceof Error ? error.message : 'Failed to delete case identifier.', {
        variant: 'error',
      });
    } finally {
      setCaseIdentifierToDelete(null);
    }
  }, [caseIdentifierToDelete, caseIdentifiers, toast, updateSetting]);

  return (
    <AdminCaseResolverPageLayout
      title='Case Resolver Case Identifiers'
      current='Case Identifiers'
      headerActions={
        <Button
          onClick={openCreateModal}
          variant='outline'
          className='border-border/70 bg-transparent text-white hover:bg-muted/40'
        >
          <Plus className='mr-2 size-4' />
          Add Case Identifier
        </Button>
      }
      containerClassName='page-section-compact'
    >

      <FormSection title='Case Identifiers' className='p-4'>
        <div className='mt-4'>
          {settingsStore.isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : (
            <SimpleSettingsList
              items={caseIdentifiers.map((id: CaseResolverIdentifier) => ({
                id: id.id,
                title: (
                  <div className='flex items-center gap-2'>
                    <UiTag label={id.name ?? id.value} color={id.color || '#f59e0b'} dot />
                  </div>
                ),
                description: caseIdentifierPathById.get(id.id) ?? id.name,
                original: id,
              }))}
              isLoading={settingsStore.isLoading}
              onEdit={(item) => openEditModal(item.original)}
              onDelete={(item) => setCaseIdentifierToDelete(item.original)}
              emptyMessage='No case identifiers yet. Create case identifiers to classify Case Resolver documents.'
              columns={2}
            />
          )}
        </div>
      </FormSection>

      <ConfirmModal
        isOpen={Boolean(caseIdentifierToDelete)}
        onClose={() => setCaseIdentifierToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Case Identifier'
        message={`Delete case identifier "${caseIdentifierToDelete?.name ?? ''}"? This action cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />

      <CaseResolverIdentifierModal
        isOpen={showModal}
        onClose={(): void => setShowModal(false)}
        onSuccess={(): void => {}}
        item={editingCaseIdentifier}
        formData={formData}
        setFormData={setFormData}
        parentIdentifierOptions={parentCaseIdentifierOptions}
        isSaving={updateSetting.isPending}
        onSave={(): void => {
          void handleSave();
        }}
      />
    </AdminCaseResolverPageLayout>
  );
}
