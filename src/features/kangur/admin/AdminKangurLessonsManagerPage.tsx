'use client';

import React, { useMemo } from 'react';
import { ContextRegistryPageProvider } from '@/shared/lib/ai-context-registry/page-context';
import { Badge } from '@/features/kangur/shared/ui';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { AdminKangurLessonsManagerTreePanel } from './components/AdminKangurLessonsManagerTreePanel';
import { AdminKangurLessonSectionsPanel } from './components/AdminKangurLessonSectionsPanel';
import { LessonSvgQuickAddRuntimeProvider } from './context/LessonSvgQuickAddRuntimeContext';
import { buildKangurAdminLessonsManagerContextBundle } from './context-registry/lessons-manager';
import {
  AdminKangurLessonsManagerRegistrySource,
  KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS,
} from './AdminKangurLessonsManagerPage.shared';
import { useAdminKangurLessonsManagerLogic, type UseAdminKangurLessonsManagerLogicReturn } from './hooks/lessons-manager/useAdminKangurLessonsManagerLogic';
import { LessonsManagerHeaderActions } from './components/LessonsManagerHeaderActions';
import { LessonsManagerModals } from './components/LessonsManagerModals';

export function AdminKangurLessonsManagerPage({
  standalone = true,
}: {
  standalone?: boolean;
} = {}): React.JSX.Element {
  const logic = useAdminKangurLessonsManagerLogic();
  return (
    <ContextRegistryPageProvider
      pageId='page:kangur-admin-lessons-manager'
      title='Kangur Lessons Manager'
      rootNodeIds={KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS}
    >
      <LessonsManagerContent logic={logic} standalone={standalone} />
    </ContextRegistryPageProvider>
  );
}

function LessonsManagerContent({
  logic, standalone
}: {
  logic: UseAdminKangurLessonsManagerLogicReturn;
  standalone: boolean
}): React.JSX.Element {
  const registrySource = useMemo(() => ({
    label: 'Kangur admin lessons manager workspace',
    resolved: buildKangurAdminLessonsManagerContextBundle({
      lessonCount: logic.lessons.length,
      lesson: logic.editingContentLesson,
      document: logic.showContentModal ? logic.contentDraft : null,
      isEditorOpen: logic.showContentModal,
      isSaving: logic.isSaving,
    }),
  }), [logic]);

  const breadcrumbs = useMemo(() => [
    { label: 'Admin', href: '/admin' },
    { label: 'Kangur', href: '/admin/kangur' },
    { label: 'Lessons Manager' },
  ], []);

  return (
    <>
      <AdminKangurLessonsManagerRegistrySource registrySource={registrySource} />
      <LessonSvgQuickAddRuntimeProvider
        lesson={logic.svgModalLesson}
        initialMarkup={logic.svgModalInitialMarkup}
        isOpen={Boolean(logic.svgModalLesson)}
        isSaving={logic.isSaving}
        onClose={() => logic.setSvgModalLesson(null)}
        onSave={(markup) => { void logic.handleSaveQuickSvg(markup); }}
      >
        <KangurAdminContentShell
          title='Lessons Manager'
          description='Manage lesson metadata, localized content, section structure, and legacy imports.'
          breadcrumbs={breadcrumbs}
          headerActions={<LessonsManagerHeaderActions logic={logic} />}
        >
          <div className='mt-4 flex flex-col kangur-panel-gap'>
            <LessonsManagerToolbar logic={logic} />
            {logic.isSectionsMode ? (
              <AdminKangurLessonSectionsPanel standalone={standalone} />
            ) : (
              <LessonsManagerTreePanel logic={logic} standalone={standalone} />
            )}
          </div>
          <LessonsManagerModals logic={logic} />
        </KangurAdminContentShell>
      </LessonSvgQuickAddRuntimeProvider>
    </>
  );
}

function LessonsManagerToolbar({ logic }: { logic: UseAdminKangurLessonsManagerLogicReturn }): React.JSX.Element {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <KangurButton variant='surface' size='sm' onClick={logic.handleToggleTreeMode}>
          Mode: {logic.treeMode.toUpperCase()}
        </KangurButton>
        {logic.legacyImportCount > 0 && <Badge variant='warning'>{logic.legacyImportCount} Legacy</Badge>}
      </div>
      <div className='flex items-center gap-2'>
        <KangurButton variant='ghost' size='sm' onClick={() => { void logic.handleCanonicalize(); }}>Canonicalize</KangurButton>
        <KangurButton variant='ghost' size='sm' onClick={() => { void logic.handleAppendMissing(); }}>Add Missing</KangurButton>
      </div>
    </div>
  );
}

function LessonsManagerTreePanel({ logic, standalone }: { logic: UseAdminKangurLessonsManagerLogicReturn; standalone: boolean }): React.JSX.Element {
  return (
    <AdminKangurLessonsManagerTreePanel
      standalone={standalone}
      isCatalogMode={logic.isCatalogMode}
      isSaving={logic.isSaving}
      isLoading={logic.isLoading}
      lessonsCount={logic.lessons.length}
      lessonsNeedingLegacyImport={logic.legacyImportCount}
      geometryPackAddedCount={logic.geometryPackAddedCount}
      logicPackAddedCount={logic.logicPackAddedCount}
      filterCounts={logic.authoringFilterCounts}
      authoringFilter={logic.authoringFilter}
      onAuthoringFilterChange={logic.setAuthoringFilter}
      authoringFilteredLessonCount={logic.authoringFilteredLessons.length}
      ageGroupFilter={logic.ageGroupFilter}
      onAgeGroupFilterChange={logic.setAgeGroupFilter}
      ageGroupCounts={logic.ageGroupCounts}
      filteredLessonCount={logic.filteredLessons.length}
      activeAgeGroupLabel={logic.activeAgeGroupLabel}
      treeSearchQuery={logic.treeSearchQuery}
      onTreeSearchChange={logic.handleTreeSearchChange}
      searchEnabled={logic.tree.capabilities.search.enabled}
      tree={logic.tree}
      renderNode={logic.renderTreeNode}
      onAddGeometryPack={() => { void logic.handleAddGeometryPack(); }}
      onAddLogicalThinkingPack={() => { void logic.handleAddLogicalThinkingPack(); }}
      onImportAllLessonsToEditor={() => { void logic.handleImportAllLessonsToEditor(); }}
      onAddLesson={logic.handleCreate}
      onSelectOrderedView={() => logic.setTreeModeAndPersist('ordered')}
      onSelectCatalogView={() => logic.setTreeModeAndPersist('catalog')}
      onSelectSectionsView={() => logic.setTreeModeAndPersist('sections')}
    />
  );
}

export default AdminKangurLessonsManagerPage;
