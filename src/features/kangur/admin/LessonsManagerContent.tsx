'use client';

import React, { useCallback, useMemo } from 'react';
import { useLessonsManager } from '../context/LessonsManagerContext';
import { KangurAdminContentShell } from '../components/KangurAdminContentShell';
import { Badge, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import { AdminKangurLessonsManagerTreePanel } from '../components/AdminKangurLessonsManagerTreePanel';
import { AdminKangurLessonSectionsPanel } from '../components/AdminKangurLessonSectionsPanel';
import { FormModal } from '@/features/kangur/shared/ui';
import { LessonMetadataForm } from '../components/LessonMetadataForm';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { LessonContentEditorDialog } from '../components/LessonContentEditorDialog';
import { LessonSvgQuickAddModal } from '../components/LessonSvgQuickAddModal';
import type { UseAdminKangurLessonsManagerStateReturn } from './AdminKangurLessonsManagerPage.hooks';

export function LessonsManagerContent({ standalone = true }: { standalone?: boolean }): React.JSX.Element {
  const state = useLessonsManager();
  
  const {
    contentLocale, setContentLocale, isLoading, contentLocaleOptions, contentLocaleLabel, lessons,
    showModal, setShowModal, showContentModal, setShowContentModal, editingLesson, setEditingLesson,
    editingContentLesson, setEditingContentLesson, lessonToDelete, setLessonToDelete, formData, setFormData,
    componentContentJson, setComponentContentJson, contentDraft, setContentDraft, treeMode, setTreeModeAndPersist,
    authoringFilter, setAuthoringFilter, ageGroupFilter, setAgeGroupFilter, isSaving, authoringFilterCounts,
    authoringFilteredLessons, geometryPackAddedCount, logicPackAddedCount, legacyImportCount, filteredLessons,
    handleCreate, handleToggleTreeMode, handleCanonicalize, handleAppendMissing, handleAddGeometryPack, 
    handleAddLogicalThinkingPack, handleImportAllLessonsToEditor, handleSave, handleCloseModal,
    handleDelete, handleSaveContent, handleClearContent, handleImportLegacy, controller, scrollToNodeRef,
    rootDropUi, renderTreeNode, capabilities, searchState, treeSearchQuery, handleTreeSearchChange,
    ageGroupCounts, activeAgeGroupLabel, isCatalogMode, isSectionsMode, handleComponentChange
  } = state;

  const breadcrumbs = useMemo(() => [
    { label: 'Admin', href: '/admin' },
    { label: 'Kangur', href: '/admin/kangur' },
    { label: 'Lessons Manager' },
  ], []);

  const handleAgeFilterChange = useCallback((v: string) => setAgeGroupFilter(v as any), [setAgeGroupFilter]);
  const handleAuthoringFilterChange = useCallback((v: string) => setAuthoringFilter(v as any), [setAuthoringFilter]);

  return (
    <KangurAdminContentShell
      title='Lessons Manager'
      description='Manage lesson metadata, localized content, section structure, and legacy imports.'
      breadcrumbs={breadcrumbs}
      headerActions={
        <div className='flex items-center gap-3'>
          <SelectSimple value={contentLocale} onChange={(v) => setContentLocale(v as any)} options={contentLocaleOptions} className='w-40' ariaLabel='Content locale' title='Content locale' />
          <Badge variant='outline'>{contentLocaleLabel}</Badge>
          <SelectSimple value={ageGroupFilter} onChange={handleAgeFilterChange} options={[{ value: 'all', label: 'All Ages' }, ...KANGUR_AGE_GROUPS.map((g) => ({ value: g.id, label: g.label }))]} className='w-40' ariaLabel='Age group filter' title='Age group filter' />
          <SelectSimple value={authoringFilter} onChange={handleAuthoringFilterChange} options={authoringFilterCounts.map((f) => ({ value: f.id, label: `${f.label} (${f.count})` }))} className='w-52' ariaLabel='Editorial state filter' title='Editorial state filter' />
          <KangurButton variant='primary' onClick={handleCreate}>New lesson</KangurButton>
        </div>
      }
    >
      <div className='mt-4 flex flex-col kangur-panel-gap'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <KangurButton variant='surface' size='sm' onClick={handleToggleTreeMode}>Mode: {treeMode.toUpperCase()}</KangurButton>
            {legacyImportCount > 0 && <Badge variant='warning'>{legacyImportCount} Legacy</Badge>}
          </div>
          <div className='flex items-center gap-2'>
            <KangurButton variant='ghost' size='sm' onClick={() => void handleCanonicalize()}>Canonicalize</KangurButton>
            <KangurButton variant='ghost' size='sm' onClick={() => void handleAppendMissing()}>Add Missing</KangurButton>
          </div>
        </div>
        {isSectionsMode ? <AdminKangurLessonSectionsPanel standalone={standalone} /> : (
          <AdminKangurLessonsManagerTreePanel
            standalone={standalone} isCatalogMode={isCatalogMode} isSaving={isSaving} isLoading={isLoading} lessonsCount={lessons.length}
            lessonsNeedingLegacyImport={legacyImportCount} geometryPackAddedCount={geometryPackAddedCount} logicPackAddedCount={logicPackAddedCount}
            filterCounts={authoringFilterCounts} authoringFilter={authoringFilter} onAuthoringFilterChange={setAuthoringFilter}
            authoringFilteredLessonCount={authoringFilteredLessons.length} ageGroupFilter={ageGroupFilter} onAgeGroupFilterChange={setAgeGroupFilter}
            ageGroupCounts={ageGroupCounts} filteredLessonCount={filteredLessons.length} activeAgeGroupLabel={activeAgeGroupLabel}
            treeSearchQuery={treeSearchQuery} onTreeSearchChange={handleTreeSearchChange} searchEnabled={capabilities.search.enabled}
            searchState={searchState} controller={controller} scrollToNodeRef={scrollToNodeRef} rootDropUi={rootDropUi}
            renderNode={renderTreeNode} onAddGeometryPack={() => void handleAddGeometryPack()} onAddLogicalThinkingPack={() => void handleAddLogicalThinkingPack()}
            onImportAllLessonsToEditor={() => void handleImportAllLessonsToEditor()} onAddLesson={handleCreate} onSelectOrderedView={() => setTreeModeAndPersist('ordered')}
            onSelectCatalogView={() => setTreeModeAndPersist('catalog')} onSelectSectionsView={() => setTreeModeAndPersist('sections')}
          />
        )}
      </div>
      <FormModal title={editingLesson ? 'Edit Lesson' : 'Create Lesson'} isOpen={showModal} onClose={handleCloseModal} onSave={() => void handleSave()} isSaving={isSaving} saveText={editingLesson ? 'Save Lesson' : 'Create Lesson'}>
        <LessonMetadataForm formData={formData} setFormData={setFormData} componentContentJson={componentContentJson} setComponentContentJson={setComponentContentJson} showComponentContentEditor={true} onComponentChange={handleComponentChange} />
      </FormModal>
      <ConfirmModal isOpen={Boolean(lessonToDelete)} onClose={() => setLessonToDelete(null)} onConfirm={() => void handleDelete()} title='Delete Lesson' message={`Are you sure you want to delete "${lessonToDelete?.title ?? 'lesson'}"?`} confirmLabel='Delete' variant='danger' />
      {editingContentLesson && (
        <LessonContentEditorDialog isOpen={showContentModal} onClose={() => { setShowContentModal(false); setEditingContentLesson(null); }} lesson={editingContentLesson} document={contentDraft} onLessonChange={setEditingContentLesson} onChange={setContentDraft} onSave={() => void handleSaveContent()} isSaving={isSaving} onImportLegacy={() => void handleImportLegacy(editingContentLesson)} onClearContent={() => void handleClearContent()} />
      )}
      <LessonSvgQuickAddModal />
    </KangurAdminContentShell>
  );
}
