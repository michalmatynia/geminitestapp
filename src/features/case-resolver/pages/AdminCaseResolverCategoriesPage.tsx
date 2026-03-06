'use client';

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { CaseResolverCategory } from '@/shared/contracts/case-resolver';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  EmptyState,
  FormSection,
  SectionHeader,
  Skeleton,
  useToast,
  Breadcrumbs,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { serializeSetting } from '@/shared/utils/settings-json';

import { CaseResolverCategoryModal } from '../components/modals/CaseResolverEntityModalVariants';
import {
  CASE_RESOLVER_CATEGORIES_KEY,
  buildCaseResolverCategoryTree,
  normalizeCaseResolverCategories,
  parseCaseResolverCategories,
} from '../settings';

type CategoryFormData = {
  name: string;
  description: string;
  color: string;
  parentId: string | null;
};

const createCategoryId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `case-category-${crypto.randomUUID()}`;
  }
  return `case-category-${Math.random().toString(36).slice(2, 10)}`;
};

export function AdminCaseResolverCategoriesPage(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawCategories = settingsStore.get(CASE_RESOLVER_CATEGORIES_KEY);
  const categories = useMemo(
    (): CaseResolverCategory[] => parseCaseResolverCategories(rawCategories),
    [rawCategories]
  );
  const categoryTree = useMemo(() => buildCaseResolverCategoryTree(categories), [categories]);

  const [showModal, setShowModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CaseResolverCategory | null>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set<string>());
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    color: '#10b981',
    parentId: null,
  });

  const categoryById = useMemo(
    (): Map<string, CaseResolverCategory> =>
      new Map(
        categories.map((category: CaseResolverCategory): [string, CaseResolverCategory] => [
          category.id,
          category,
        ])
      ),
    [categories]
  );

  const collectDescendantIds = useCallback(
    (categoryId: string): string[] => {
      const children = categories.filter(
        (category: CaseResolverCategory) => category.parentId === categoryId
      );
      return children.flatMap((category: CaseResolverCategory) => [
        category.id,
        ...collectDescendantIds(category.id),
      ]);
    },
    [categories]
  );

  const persistCategories = useCallback(
    async (nextCategories: CaseResolverCategory[], successMessage: string): Promise<void> => {
      try {
        await updateSetting.mutateAsync({
          key: CASE_RESOLVER_CATEGORIES_KEY,
          value: serializeSetting(normalizeCaseResolverCategories(nextCategories)),
        });
        toast(successMessage, { variant: 'success' });
      } catch (error) {
        logClientError(error, {
          context: { source: 'AdminCaseResolverCategoriesPage', action: 'persistCategories' },
        });
        toast(error instanceof Error ? error.message : 'Failed to save categories.', {
          variant: 'error',
        });
      }
    },
    [toast, updateSetting]
  );

  const openCreateModal = useCallback((parentId: string | null): void => {
    setEditingCategoryId(null);
    setFormData({
      name: '',
      description: '',
      color: '#10b981',
      parentId,
    });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((category: CaseResolverCategory): void => {
    setEditingCategoryId(category.id);
    setFormData({
      name: category.name,
      description: category.description ?? '',
      color: category.color ?? '',
      parentId: category.parentId ?? null,
    });
    setShowModal(true);
  }, []);

  const editableCategory = editingCategoryId ? (categoryById.get(editingCategoryId) ?? null) : null;

  const parentOptions = useMemo(() => {
    const excluded = new Set<string>();
    if (editingCategoryId) {
      excluded.add(editingCategoryId);
      collectDescendantIds(editingCategoryId).forEach((id: string) => excluded.add(id));
    }

    const byId = new Map<string, CaseResolverCategory>(
      categories.map((category: CaseResolverCategory): [string, CaseResolverCategory] => [
        category.id,
        category,
      ])
    );
    const resolveDepth = (category: CaseResolverCategory): number => {
      let depth = 0;
      let parentId = category.parentId;
      while (parentId) {
        const parent = byId.get(parentId);
        if (!parent) break;
        depth += 1;
        parentId = parent.parentId;
      }
      return depth;
    };

    return categories
      .filter((category: CaseResolverCategory) => !excluded.has(category.id))
      .map((category: CaseResolverCategory) => ({
        value: category.id,
        label: `${' '.repeat(resolveDepth(category) * 2)}${category.name}`,
      }));
  }, [categories, collectDescendantIds, editingCategoryId]);

  const handleSaveCategory = useCallback(async (): Promise<void> => {
    const normalizedName = formData.name.trim();
    if (!normalizedName) {
      toast('Category name is required.', { variant: 'error' });
      return;
    }

    const now = new Date().toISOString();
    if (editableCategory) {
      const nextCategories = categories.map(
        (category: CaseResolverCategory): CaseResolverCategory =>
          category.id === editableCategory.id
            ? {
                ...category,
                name: normalizedName,
                description: formData.description,
                color: formData.color.trim() || '#10b981',
                parentId: formData.parentId,
                updatedAt: now,
              }
            : category
      );
      await persistCategories(nextCategories, 'Category updated.');
      setShowModal(false);
      return;
    }

    const siblingCount = categories.filter(
      (category: CaseResolverCategory) => category.parentId === formData.parentId
    ).length;
    const nextCategory: CaseResolverCategory = {
      id: createCategoryId(),
      name: normalizedName,
      parentId: formData.parentId,
      sortOrder: siblingCount,
      description: formData.description,
      color: formData.color.trim() || '#10b981',
      createdAt: now,
      updatedAt: now,
    };
    await persistCategories([...categories, nextCategory], 'Category created.');
    setShowModal(false);
  }, [
    categories,
    editableCategory,
    formData.color,
    formData.description,
    formData.name,
    formData.parentId,
    persistCategories,
    toast,
  ]);

  const handleDeleteCategory = useCallback(async (): Promise<void> => {
    if (!categoryToDelete) return;
    const removedIds = new Set<string>([
      categoryToDelete.id,
      ...collectDescendantIds(categoryToDelete.id),
    ]);
    const nextCategories = categories.filter(
      (category: CaseResolverCategory) => !removedIds.has(category.id)
    );
    await persistCategories(nextCategories, 'Category deleted.');
    setCategoryToDelete(null);
  }, [categories, categoryToDelete, collectDescendantIds, persistCategories]);

  const toggleCollapsed = useCallback((categoryId: string): void => {
    setCollapsedIds((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const handleMoveCategory = useCallback(
    async (categoryId: string, direction: -1 | 1): Promise<void> => {
      const target = categoryById.get(categoryId);
      if (!target) return;
      const siblings = categories
        .filter((category: CaseResolverCategory) => category.parentId === target.parentId)
        .sort(
          (left: CaseResolverCategory, right: CaseResolverCategory) =>
            left.sortOrder - right.sortOrder
        );
      const currentIndex = siblings.findIndex(
        (category: CaseResolverCategory) => category.id === categoryId
      );
      if (currentIndex < 0) return;
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= siblings.length) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, moved!);
      const sortOrderById = new Map<string, number>(
        reordered.map((category: CaseResolverCategory, index: number): [string, number] => [
          category.id,
          index,
        ])
      );
      const nextCategories = categories.map(
        (category: CaseResolverCategory): CaseResolverCategory =>
          sortOrderById.has(category.id)
            ? {
                ...category,
                sortOrder: sortOrderById.get(category.id)!,
                updatedAt: new Date().toISOString(),
              }
            : category
      );
      await persistCategories(nextCategories, 'Category order updated.');
    },
    [categories, categoryById, persistCategories]
  );

  const renderTree = (
    nodes: ReturnType<typeof buildCaseResolverCategoryTree>,
    depth: number
  ): React.JSX.Element => (
    <div className='space-y-0.5'>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isCollapsed = collapsedIds.has(node.id);
        const Icon = hasChildren && !isCollapsed ? FolderOpen : Folder;
        return (
          <div key={node.id} className='space-y-0.5'>
            <div
              className='group flex items-center gap-1 rounded px-2 py-1.5 text-sm text-gray-200 hover:bg-muted/40'
              style={{ paddingLeft: `${depth * 16 + 8}px` }}
              title={node.name}
            >
              {hasChildren ? (
                <button
                  type='button'
                  className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/50'
                  onClick={(): void => toggleCollapsed(node.id)}
                  aria-label={isCollapsed ? `Expand ${node.name}` : `Collapse ${node.name}`}
                >
                  {isCollapsed ? (
                    <ChevronRight className='size-3.5' />
                  ) : (
                    <ChevronDown className='size-3.5' />
                  )}
                </button>
              ) : (
                <span className='inline-flex size-4 items-center justify-center text-xs opacity-30'>
                  •
                </span>
              )}
              <Icon className='size-3.5 shrink-0 text-gray-400' />
              <span className='flex-1 truncate'>{node.name}</span>
              <div className='ml-auto hidden items-center gap-1 group-hover:flex'>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-6 px-1.5 text-[11px]'
                  onClick={(): void => {
                    openCreateModal(node.id);
                  }}
                  title='Add subcategory'
                >
                  Add
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-6 px-1.5 text-[11px]'
                  onClick={(): void => {
                    openEditModal(node);
                  }}
                  title='Edit category'
                >
                  Edit
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-6 px-1.5 text-[11px]'
                  onClick={(): void => {
                    void handleMoveCategory(node.id, -1);
                  }}
                  title='Move up'
                >
                  <ArrowUp className='size-3' />
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  className='h-6 px-1.5 text-[11px]'
                  onClick={(): void => {
                    void handleMoveCategory(node.id, 1);
                  }}
                  title='Move down'
                >
                  <ArrowDown className='size-3' />
                </Button>
                <Button
                  type='button'
                  size='xs'
                  className='h-6 bg-red-600/80 px-1.5 text-[11px] text-white hover:bg-red-600'
                  onClick={(): void => {
                    setCategoryToDelete(node);
                  }}
                  title='Delete category'
                >
                  <Trash2 className='size-3' />
                </Button>
              </div>
            </div>
            {hasChildren && !isCollapsed ? renderTree(node.children, depth + 1) : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className='container mx-auto space-y-6 py-8'>
      <SectionHeader
        title='Case Resolver Categories'
        subtitle={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Case Resolver', href: '/admin/case-resolver' },
              { label: 'Categories' },
            ]}
          />
        }
      />

      <div className='flex justify-start'>
        <Button
          onClick={(): void => {
            openCreateModal(null);
          }}
          variant='outline'
          className='border-border/70 bg-transparent text-white hover:bg-muted/40'
        >
          <Plus className='mr-2 size-4' />
          Add Category
        </Button>
      </div>

      <FormSection title='Category Tree' className='p-4'>
        <div className='mt-4'>
          {settingsStore.isLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : categoryTree.length === 0 ? (
            <EmptyState
              title='No categories yet'
              description='Create your first category to start organizing documents.'
              action={
                <Button onClick={(): void => openCreateModal(null)} variant='outline'>
                  <Plus className='mr-2 size-4' />
                  Create First Category
                </Button>
              }
            />
          ) : (
            <div className='rounded-md border border-border bg-gray-900 p-2'>
              {renderTree(categoryTree, 0)}
            </div>
          )}
        </div>
      </FormSection>

      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteCategory}
        title='Delete Category'
        message={
          categoryToDelete
            ? `Delete category "${categoryToDelete.name}" and all its subcategories?`
            : 'Delete category?'
        }
        confirmText='Delete'
        isDangerous={true}
      />

      <CaseResolverCategoryModal
        isOpen={showModal}
        onClose={(): void => setShowModal(false)}
        onSuccess={(): void => {}}
        item={editableCategory}
        formData={formData}
        setFormData={setFormData}
        parentOptions={parentOptions}
        isSaving={updateSetting.isPending}
        onSave={(): void => {
          void handleSaveCategory();
        }}
      />
    </div>
  );
}
