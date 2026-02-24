'use client';

import React from 'react';
import { 
  Plus, 
  Folder, 
  ArrowUp, 
  ArrowDown 
} from 'lucide-react';
import { 
  Button, 
  ListPanel, 
  PanelHeader, 
  Breadcrumbs, 
  Card, 
  ConfirmModal 
} from '@/shared/ui';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';

import { AdminCaseResolverCasesProvider, useAdminCaseResolverCases } from '../context/AdminCaseResolverCasesContext';
import { useAdminCaseResolverCasesState } from '../hooks/useAdminCaseResolverCasesState';
import { CaseFilterPanel } from '../components/CaseFilterPanel';
import { CaseTreeRenderer } from '../components/CaseTreeRenderer';

function AdminCaseResolverCasesInner(): React.JSX.Element {
  const {
    isCreateCaseModalOpen,
    setIsCreateCaseModalOpen,
    caseDraft,
    setCaseDraft,
    handleCreateCase,
    isCreatingCase,
    isLoading,
    caseSortOrder,
    setCaseSortOrder,
    caseViewMode,
    setCaseViewMode,
    confirmation,
    setConfirmation,
  } = useAdminCaseResolverCases();

  const {
    files,
    filteredCases,
    visibleCaseNodes,
    hiddenCaseRootCount,
    handleLoadMoreCaseRoots,
  } = useAdminCaseResolverCasesState();

  return (
    <div className='space-y-6'>
      <SettingsPanelBuilder
        open={isCreateCaseModalOpen}
        onClose={() => setIsCreateCaseModalOpen(false)}
        title='Add Case'
        subtitle='Create a new case with optional hierarchy, references, and categorization.'
        size='lg'
        fields={[]} // Fields should ideally come from a shared config
        values={caseDraft}
        onChange={(vals) => setCaseDraft((prev) => ({ ...prev, ...vals }))}
        onSave={handleCreateCase}
        isSaving={isCreatingCase}
      />

      <ListPanel
        header={
          <PanelHeader
            title='Cases'
            description={
              <Breadcrumbs
                items={[
                  { label: 'Admin', href: '/admin' },
                  { label: 'Case Resolver', href: '/admin/case-resolver' },
                  { label: 'Cases' },
                ]}
              />
            }
            actions={[
              {
                key: 'create',
                label: 'New Case',
                icon: <Plus className='size-4' />,
                onClick: () => setIsCreateCaseModalOpen(true),
                variant: 'default',
              }
            ]}
          />
        }
      >
        <div className='space-y-6'>
          <div className='text-sm text-muted-foreground'>
            Case Hierarchy ({filteredCases.length} matches of {files.length} total cases)
          </div>

          <CaseFilterPanel />

          <div className='flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                  Sort Order
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 min-w-32 justify-between px-3'
                  onClick={() => setCaseSortOrder(caseSortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  <span className='flex items-center gap-2'>
                    {caseSortOrder === 'asc' ? <ArrowUp className='size-3' /> : <ArrowDown className='size-3' />}
                    {caseSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </span>
                </Button>
              </div>

              <div className='flex items-center gap-2'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                  View Mode
                </span>
                <div className='flex rounded-md border border-border/60 p-0.5 bg-background/50'>
                  <Button
                    size='sm'
                    variant={caseViewMode === 'hierarchy' ? 'secondary' : 'ghost'}
                    className='h-7 px-3 text-xs'
                    onClick={() => setCaseViewMode('hierarchy')}
                  >
                    Hierarchy
                  </Button>
                  <Button
                    size='sm'
                    variant={caseViewMode === 'list' ? 'secondary' : 'ghost'}
                    className='h-7 px-3 text-xs'
                    onClick={() => setCaseViewMode('list')}
                  >
                    Flat List
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className='min-h-[400px]'>
            {isLoading ? (
              <div className='py-20 text-center text-sm text-gray-500'>Loading cases...</div>
            ) : files.length === 0 ? (
              <Card variant='subtle' padding='lg' className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'>
                <Folder className='size-10 text-muted-foreground/20 mb-4' />
                <p className='text-sm text-muted-foreground'>No cases found. Create your first case to get started.</p>
                <Button variant='outline' size='sm' className='mt-4' onClick={() => setIsCreateCaseModalOpen(true)}>
                  <Plus className='mr-2 size-4' /> Add Case
                </Button>
              </Card>
            ) : filteredCases.length === 0 ? (
              <Card variant='subtle' padding='lg' className='flex flex-col items-center justify-center border-dashed border-border/60 bg-card/20 py-20 text-center'>
                <p className='text-sm text-muted-foreground font-medium'>No cases match your current filters.</p>
              </Card>
            ) : (
              <div className='space-y-3'>
                <CaseTreeRenderer nodes={visibleCaseNodes} />
                {hiddenCaseRootCount > 0 && (
                  <div className='flex items-center justify-center'>
                    <Button variant='outline' size='sm' onClick={handleLoadMoreCaseRoots}>
                      Load more cases ({hiddenCaseRootCount} remaining)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ListPanel>

      <ConfirmModal
        isOpen={Boolean(confirmation)}
        onClose={() => setConfirmation(null)}
        title={confirmation?.title ?? ''}
        message={confirmation?.message ?? ''}
        confirmText={confirmation?.confirmText ?? 'Confirm'}
        isDangerous={confirmation?.isDangerous ?? false}
        onConfirm={async () => {
          if (confirmation?.onConfirm) await confirmation.onConfirm();
          setConfirmation(null);
        }}
      />
    </div>
  );
}

export function AdminCaseResolverCasesPage(): React.JSX.Element {
  return (
    <AdminCaseResolverCasesProvider>
      <AdminCaseResolverCasesInner />
    </AdminCaseResolverCasesProvider>
  );
}
