'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  ChevronDown,
  Lock,
  Folder,
  Star,
  Copy,
} from 'lucide-react';
import {
  Button,
  Badge,
  Card,
  FormField,
  Input,
  SelectSimple,
  MetadataItem,
  Tooltip,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { buildCaseResolverCaseHref } from './list/case-list-utils';
import { useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { useAdminCaseResolverCasesState } from '../hooks/useAdminCaseResolverCasesState';
import { CaseTreeNode } from '../pages/AdminCaseResolverCasesUtils';
import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { getCaseResolverDocTooltipWithFallback } from '../relation-search/utils/docs';

export function CaseTreeRenderer({
  nodes,
  depth = 0,
}: {
  nodes: CaseTreeNode[];
  depth?: number;
}): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const {
    collapsedCaseIds,
    handleToggleCaseCollapse,
    editingCaseId,
    editingCaseName,
    setEditingCaseName,
    editingCaseTagId,
    setEditingCaseTagId,
    editingCaseCategoryId,
    setEditingCaseCategoryId,
    editingCaseParentId,
    setEditingCaseParentId,
    setEditingCaseReferenceCaseIds,
    setEditingCaseCaseIdentifierId,
    handleUpdateCase,
    setEditingCaseId,
    handleDeleteCase,
    setIsCreateCaseModalOpen,
    setCaseDraft,
    setCaseFilterCaseIdentifierIds,
    setCaseFilterPanelDefaultExpanded,
    caseResolverTagOptions,
    caseResolverCategoryOptions,
    parentCaseOptions,
  } = useAdminCaseResolverCases();

  const {
    caseIdentifierPathById,
    caseCategoryPathById,
    caseTagById,
    caseIdentifierById,
    caseCategoryById,
  } = useAdminCaseResolverCasesState();

  const handleOpenCreateCaseModal = (parentId: string | null = null): void => {
    setCaseDraft((prev) => ({ ...prev, parentCaseId: parentId }));
    setIsCreateCaseModalOpen(true);
  };

  const handleViewCase = (caseId: string): void => {
    router.push(buildCaseResolverCaseHref(caseId));
  };

  const handleCopyCaseId = async (caseId: string): Promise<void> => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(caseId);
      toast('Case ID copied to clipboard.', { variant: 'success' });
    } catch {
      // ignore
    }
  };

  const handleFilterByCaseIdentifier = (id: string): void => {
    setCaseFilterCaseIdentifierIds([id]);
    setCaseFilterPanelDefaultExpanded(true);
  };

  const handleStartEditCase = (file: CaseResolverFile): void => {
    setEditingCaseId(file.id);
    setEditingCaseName(file.name);
    setEditingCaseParentId(file.parentCaseId ?? null);
    setEditingCaseReferenceCaseIds(file.referenceCaseIds);
    setEditingCaseTagId(file.tagId ?? null);
    setEditingCaseCaseIdentifierId(file.caseIdentifierId ?? null);
    setEditingCaseCategoryId(file.categoryId ?? null);
  };

  const handleSaveCase = (): void => {
    void handleUpdateCase();
  };

  return (
    <div className={cn('space-y-3', depth > 0 && 'mt-3 border-l border-border/40 pl-4')}>
      {nodes.map((node) => {
        const file = node.file;
        const isEditing = editingCaseId === file.id;
        const hasChildren = node.children.length > 0;
        const isCollapsed = collapsedCaseIds.has(file.id);
        const nextDepth = depth + 1;
        const tag = file.tagId ? caseTagById.get(file.tagId) : null;
        const identifier = file.caseIdentifierId
          ? caseIdentifierById.get(file.caseIdentifierId)
          : null;
        const category = file.categoryId ? caseCategoryById.get(file.categoryId) : null;

        return (
          <div key={file.id} className='relative'>
            <Card
              variant={isEditing ? 'glass' : 'subtle'}
              padding='md'
              className={cn(
                'group relative transition-all duration-200',
                isEditing ? 'ring-2 ring-cyan-500/50' : 'hover:border-border/80 hover:bg-card/30'
              )}
            >
              {isEditing ? (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between gap-4'>
                    <FormField label='Case Name' className='flex-1'>
                      <Input
                        value={editingCaseName}
                        onChange={(e) => setEditingCaseName(e.target.value)}
                        className='h-9 bg-black/40'
                      />
                    </FormField>
                    <div className='flex items-end gap-2'>
                      <Button size='sm' onClick={handleSaveCase}>
                        Save
                      </Button>
                      <Button size='sm' variant='ghost' onClick={() => setEditingCaseId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>

                  <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    <FormField label='Parent Case'>
                      <SelectSimple
                        size='sm'
                        value={editingCaseParentId || '__none__'}
                        onValueChange={(val) =>
                          setEditingCaseParentId(val === '__none__' ? null : val)
                        }
                        options={[
                          { value: '__none__', label: '(No parent)' },
                          ...parentCaseOptions.filter((o) => o.value !== file.id),
                        ]}
                        triggerClassName='bg-black/40'
                      />
                    </FormField>
                    <FormField label='Tag'>
                      <SelectSimple
                        size='sm'
                        value={editingCaseTagId || '__none__'}
                        onValueChange={(val) =>
                          setEditingCaseTagId(val === '__none__' ? null : val)
                        }
                        options={[
                          { value: '__none__', label: '(No tag)' },
                          ...caseResolverTagOptions,
                        ]}
                        triggerClassName='bg-black/40'
                      />
                    </FormField>
                    <FormField label='Category'>
                      <SelectSimple
                        size='sm'
                        value={editingCaseCategoryId || '__none__'}
                        onValueChange={(val) =>
                          setEditingCaseCategoryId(val === '__none__' ? null : val)
                        }
                        options={[
                          { value: '__none__', label: '(No category)' },
                          ...caseResolverCategoryOptions,
                        ]}
                        triggerClassName='bg-black/40'
                      />
                    </FormField>
                  </div>
                </div>
              ) : (
                <div className='flex flex-wrap items-start justify-between gap-4'>
                  <div className='flex min-w-0 flex-1 items-start gap-3'>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleToggleCaseCollapse(file.id)}
                      className={cn(
                        'mt-1 h-5 w-5 shrink-0 p-0 text-gray-500 hover:bg-white/10 hover:text-gray-300',
                        !hasChildren && 'pointer-events-none opacity-0'
                      )}
                    >
                      {isCollapsed ? (
                        <ChevronRight className='size-3.5' />
                      ) : (
                        <ChevronDown className='size-3.5' />
                      )}
                    </Button>

                    <div className='min-w-0 flex-1 space-y-1'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='text-sm font-semibold text-white'>{file.name}</span>
                        {file.isLocked && <Lock className='size-3 text-amber-400/80' />}
                        {tag && (
                          <Badge
                            variant='outline'
                            className='bg-blue-500/5 text-blue-300 border-blue-500/20 text-[10px]'
                          >
                            {tag.label}
                          </Badge>
                        )}
                      </div>
                      <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
                        {file.folder && (
                          <MetadataItem
                            variant='minimal'
                            label='Folder'
                            icon={<Folder className='size-3' />}
                            value={file.folder}
                          />
                        )}
                        {identifier && (
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleFilterByCaseIdentifier(identifier.id)}
                            className='group/ident h-auto p-0 font-normal hover:bg-transparent'
                          >
                            <MetadataItem
                              variant='minimal'
                              label='ID'
                              icon={<Star className='size-3 text-amber-400' />}
                              value={caseIdentifierPathById.get(identifier.id)}
                              valueClassName='group-hover/ident:text-cyan-300'
                            />
                          </Button>
                        )}
                        {category && (
                          <MetadataItem
                            variant='minimal'
                            label='Category'
                            value={caseCategoryPathById.get(category.id)}
                            icon={<div className='size-1.5 rounded-full bg-emerald-500/50' />}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                    <Button
                      variant='outline'
                      size='xs'
                      className='h-7'
                      onClick={() => handleViewCase(file.id)}
                    >
                      <Eye className='mr-1 size-3' /> View
                    </Button>
                    <Button
                      variant='outline'
                      size='xs'
                      className='h-7'
                      onClick={() => handleOpenCreateCaseModal(file.id)}
                    >
                      <Plus className='mr-1 size-3' /> Child
                    </Button>
                    <Button
                      variant='outline'
                      size='xs'
                      className='h-7'
                      onClick={() => handleStartEditCase(file)}
                    >
                      <Edit2 className='mr-1 size-3' /> Edit
                    </Button>
                    <Button
                      variant='outline'
                      size='xs'
                      className='h-7 text-rose-400 hover:text-rose-300'
                      onClick={() => handleDeleteCase(file.id)}
                    >
                      <Trash2 className='mr-1 size-3' /> Delete
                    </Button>
                  </div>
                </div>
              )}
              <Tooltip
                content={getCaseResolverDocTooltipWithFallback('copyCaseId', 'Copy Case ID')}
                side='left'
              >
                <Button
                  variant='ghost'
                  size='xs'
                  onClick={() => void handleCopyCaseId(file.id)}
                  className='absolute bottom-2 right-2 h-5 gap-1.5 border border-border/60 bg-black/20 px-2 font-mono text-[9px] text-gray-400 opacity-0 transition-all hover:bg-black/40 group-hover:opacity-100'
                >
                  {file.id.slice(0, 8)}...
                  <Copy className='size-2.5 opacity-60' />
                </Button>
              </Tooltip>
            </Card>
            {hasChildren && !isCollapsed && (
              <CaseTreeRenderer nodes={node.children} depth={nextDepth} />
            )}
          </div>
        );
      })}
    </div>
  );
}
