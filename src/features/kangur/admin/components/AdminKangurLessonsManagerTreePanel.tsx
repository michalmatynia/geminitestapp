import { Folders, Layers, ListOrdered, Plus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  FolderTreeSearchBar,
  FolderTreeViewportV2,
  type FolderTreeViewportRenderNodeInput,
  type MasterFolderTreeSearchState,
  type MasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import type { KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';
import { Button, FolderTreePanel, Skeleton } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

import type { KangurLessonAuthoringFilter } from '../content-creator-insights';
import { renderKangurAdminWorkspaceIntroCard } from './KangurAdminWorkspaceIntroCard';

type FolderTreeShell = MasterFolderTreeShell;
type FolderTreeSearchState = MasterFolderTreeSearchState;

type AdminKangurLessonsManagerTreePanelProps = {
  standalone: boolean;
  isCatalogMode: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lessonsCount: number;
  lessonsNeedingLegacyImport: number;
  geometryPackAddedCount: number;
  logicPackAddedCount: number;
  filterCounts: Array<{ id: KangurLessonAuthoringFilter; label: string; count: number }>;
  authoringFilter: KangurLessonAuthoringFilter;
  onAuthoringFilterChange: (filter: KangurLessonAuthoringFilter) => void;
  authoringFilteredLessonCount: number;
  ageGroupFilter: 'all' | KangurLessonAgeGroup;
  onAgeGroupFilterChange: (filter: 'all' | KangurLessonAgeGroup) => void;
  ageGroupCounts: Map<KangurLessonAgeGroup, number>;
  filteredLessonCount: number;
  activeAgeGroupLabel: string;
  treeSearchQuery: string;
  onTreeSearchChange: (query: string) => void;
  searchEnabled: boolean;
  searchState: FolderTreeSearchState;
  controller: FolderTreeShell['controller'];
  scrollToNodeRef: FolderTreeShell['viewport']['scrollToNodeRef'];
  rootDropUi: FolderTreeShell['appearance']['rootDropUi'];
  renderNode: (input: FolderTreeViewportRenderNodeInput) => ReactNode;
  onAddGeometryPack: () => void;
  onAddLogicalThinkingPack: () => void;
  onImportAllLessonsToEditor: () => void;
  onAddLesson: () => void;
  onSelectOrderedView: () => void;
  onSelectCatalogView: () => void;
  onSelectSectionsView: () => void;
};

type AdminKangurLessonsManagerTreePanelRenderProps =
  AdminKangurLessonsManagerTreePanelProps & {
    activeSegmentClassName: string;
    enableDnd: boolean;
    filterSectionLabelClassName: string;
    inactiveSegmentClassName: string;
    needsAuthoringFilter: boolean;
    toolbarButtonClassName: string;
  };

const renderAdminKangurLessonsManagerTreePanel = ({
  activeAgeGroupLabel,
  activeSegmentClassName,
  ageGroupCounts,
  ageGroupFilter,
  authoringFilter,
  authoringFilteredLessonCount,
  controller,
  enableDnd,
  filterCounts,
  filterSectionLabelClassName,
  filteredLessonCount,
  geometryPackAddedCount,
  inactiveSegmentClassName,
  isCatalogMode,
  isLoading,
  isSaving,
  lessonsCount,
  lessonsNeedingLegacyImport,
  logicPackAddedCount,
  needsAuthoringFilter,
  onAddGeometryPack,
  onAddLesson,
  onAddLogicalThinkingPack,
  onAgeGroupFilterChange,
  onAuthoringFilterChange,
  onImportAllLessonsToEditor,
  onSelectCatalogView,
  onSelectOrderedView,
  onSelectSectionsView,
  renderNode,
  rootDropUi,
  scrollToNodeRef,
  searchEnabled,
  searchState,
  standalone,
  toolbarButtonClassName,
  treeSearchQuery,
  onTreeSearchChange,
}: AdminKangurLessonsManagerTreePanelRenderProps): React.JSX.Element => (
  <>
    {standalone
      ? renderKangurAdminWorkspaceIntroCard({
          title: 'Lessons workspace',
          description:
            'Manage the Kangur lesson library, focus the tree by editorial state, and open lesson editing from the same surface used across the rest of Kangur admin.',
          badge: 'Library surface',
        })
      : null}

    <FolderTreePanel
      className='min-h-0 flex-1 rounded-2xl border border-border/60 bg-card/35 shadow-sm'
      bodyClassName='min-h-0 overflow-hidden'
      header={
        <div className='border-b border-border/60 p-4'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <div className='flex flex-wrap items-center gap-2'>
                  <div className='text-sm font-semibold text-foreground'>Lesson library</div>
                  <span className='rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground'>
                    {isCatalogMode ? 'Catalog view' : 'Ordered view'}
                  </span>
                </div>
                <div className='mt-1 text-sm text-muted-foreground'>
                  Lessons stay synced to the learner app, while this workspace keeps authoring,
                  filtering, and ordering in one place.
                </div>
              </div>
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-semibold',
                    !isCatalogMode ? activeSegmentClassName : inactiveSegmentClassName
                  )}
                  onClick={onSelectOrderedView}
                  disabled={isSaving}
                >
                  <ListOrdered className='mr-1 size-3.5' />
                  Ordered
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-semibold',
                    isCatalogMode ? activeSegmentClassName : inactiveSegmentClassName
                  )}
                  onClick={onSelectCatalogView}
                  disabled={isSaving}
                >
                  <Folders className='mr-1 size-3.5' />
                  Catalog
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className={cn(
                    'h-8 rounded-lg px-3 text-xs font-semibold',
                    inactiveSegmentClassName
                  )}
                  onClick={onSelectSectionsView}
                  disabled={isSaving}
                >
                  <Layers className='mr-1 size-3.5' />
                  Sections
                </Button>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <Button
                onClick={onAddGeometryPack}
                size='sm'
                variant='outline'
                className={toolbarButtonClassName}
                disabled={isSaving || geometryPackAddedCount === 0}
              >
                <Sparkles className='mr-1 size-3.5' />
                Add geometry pack
              </Button>
              <Button
                onClick={onAddLogicalThinkingPack}
                size='sm'
                variant='outline'
                className={toolbarButtonClassName}
                disabled={isSaving || logicPackAddedCount === 0}
              >
                <Sparkles className='mr-1 size-3.5' />
                Add logic pack
              </Button>
              <Button
                onClick={onImportAllLessonsToEditor}
                size='sm'
                variant='outline'
                className={toolbarButtonClassName}
                disabled={isSaving || lessonsCount === 0}
              >
                <Sparkles className='mr-1 size-3.5' />
                Import all to editor
                {lessonsNeedingLegacyImport > 0 ? ` (${lessonsNeedingLegacyImport})` : ''}
              </Button>
              <Button
                onClick={onAddLesson}
                size='sm'
                variant='outline'
                className={toolbarButtonClassName}
                disabled={isSaving}
              >
                <Plus className='mr-1 size-3.5' />
                Add lesson
              </Button>
            </div>

            <div className='space-y-2'>
              <div className={filterSectionLabelClassName}>Editorial filters</div>
              <div className='flex flex-wrap items-center gap-1.5'>
                {filterCounts.map((filter) => (
                  <Button
                    key={filter.id}
                    type='button'
                    size='sm'
                    variant='outline'
                    className={cn(
                      'h-8 rounded-xl px-3 text-xs font-semibold',
                      authoringFilter === filter.id
                        ? activeSegmentClassName
                        : inactiveSegmentClassName
                    )}
                    onClick={(): void => onAuthoringFilterChange(filter.id)}
                    disabled={isSaving}
                  >
                    {filter.label}
                    <span className='ml-1 text-[10px] text-current/75'>{filter.count}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <div className={filterSectionLabelClassName}>Age groups</div>
              <div className='flex flex-wrap items-center gap-1.5'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className={cn(
                    'h-8 rounded-xl px-3 text-xs font-semibold',
                    ageGroupFilter === 'all' ? activeSegmentClassName : inactiveSegmentClassName
                  )}
                  onClick={(): void => onAgeGroupFilterChange('all')}
                  disabled={isSaving}
                >
                  All ages
                  <span className='ml-1 text-[10px] text-current/75'>
                    {authoringFilteredLessonCount}
                  </span>
                </Button>
                {KANGUR_AGE_GROUPS.map((group) => (
                  <Button
                    key={group.id}
                    type='button'
                    size='sm'
                    variant='outline'
                    className={cn(
                      'h-8 rounded-xl px-3 text-xs font-semibold',
                      ageGroupFilter === group.id
                        ? activeSegmentClassName
                        : inactiveSegmentClassName
                    )}
                    onClick={(): void => onAgeGroupFilterChange(group.id)}
                    disabled={isSaving}
                  >
                    {group.label}
                    <span className='ml-1 text-[10px] text-current/75'>
                      {ageGroupCounts.get(group.id) ?? 0}
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-xs text-muted-foreground'>
                {isCatalogMode
                  ? 'Catalog mode groups lessons by visibility, age group, and lesson type.'
                  : 'Ordered mode supports drag-and-drop reordering.'}
                {needsAuthoringFilter
                  ? ` Showing ${filteredLessonCount} matching lessons.`
                  : ''}
                {ageGroupFilter !== 'all' && !needsAuthoringFilter
                  ? ` Showing ${filteredLessonCount} lessons for ${activeAgeGroupLabel}.`
                  : ''}
              </span>
            </div>

            {searchEnabled ? (
              <div className='space-y-2'>
                <div className={filterSectionLabelClassName}>Search</div>
                <FolderTreeSearchBar
                  value={treeSearchQuery}
                  onChange={onTreeSearchChange}
                  placeholder={
                    isCatalogMode
                      ? 'Search catalog groups and lessons...'
                      : 'Search lessons, ids, or component types...'
                  }
                />
                {searchState.isActive ? (
                  <div className='text-[11px] text-muted-foreground/80'>
                    {searchState.matchNodeIds.size} results
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className='space-y-2 p-3'>
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
          <Skeleton className='h-10 w-full' />
        </div>
      ) : (
        <div className='min-h-0 flex-1 overflow-auto p-2'>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            searchState={searchState}
            rootDropUi={isCatalogMode ? { ...rootDropUi, enabled: false } : rootDropUi}
            renderNode={renderNode}
            enableDnd={enableDnd}
            emptyLabel={
              needsAuthoringFilter
                ? 'No lessons match the current authoring filter.'
                : 'No lessons yet. Add the first lesson to start.'
            }
          />
        </div>
      )}
    </FolderTreePanel>
  </>
);

export function AdminKangurLessonsManagerTreePanel({
  standalone,
  isCatalogMode,
  isSaving,
  isLoading,
  lessonsCount,
  lessonsNeedingLegacyImport,
  geometryPackAddedCount,
  logicPackAddedCount,
  filterCounts,
  authoringFilter,
  onAuthoringFilterChange,
  authoringFilteredLessonCount,
  ageGroupFilter,
  onAgeGroupFilterChange,
  ageGroupCounts,
  filteredLessonCount,
  activeAgeGroupLabel,
  treeSearchQuery,
  onTreeSearchChange,
  searchEnabled,
  searchState,
  controller,
  scrollToNodeRef,
  rootDropUi,
  renderNode,
  onAddGeometryPack,
  onAddLogicalThinkingPack,
  onImportAllLessonsToEditor,
  onAddLesson,
  onSelectOrderedView,
  onSelectCatalogView,
  onSelectSectionsView,
}: AdminKangurLessonsManagerTreePanelProps): React.JSX.Element {
  const needsAuthoringFilter = authoringFilter !== 'all';
  const toolbarButtonClassName =
    'h-8 rounded-xl border-border/60 bg-background/60 px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-card/80';
  const activeSegmentClassName = 'border-primary/30 bg-primary/15 text-foreground shadow-sm';
  const inactiveSegmentClassName =
    'border-border/60 bg-background/40 text-muted-foreground hover:bg-card/70 hover:text-foreground';
  const filterSectionLabelClassName =
    'text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';
  const enableDnd =
    !isCatalogMode && authoringFilter === 'all' && ageGroupFilter === 'all' && !isSaving;

  return renderAdminKangurLessonsManagerTreePanel({
    standalone,
    isCatalogMode,
    isSaving,
    isLoading,
    lessonsCount,
    lessonsNeedingLegacyImport,
    geometryPackAddedCount,
    logicPackAddedCount,
    filterCounts,
    authoringFilter,
    onAuthoringFilterChange,
    authoringFilteredLessonCount,
    ageGroupFilter,
    onAgeGroupFilterChange,
    ageGroupCounts,
    filteredLessonCount,
    activeAgeGroupLabel,
    treeSearchQuery,
    onTreeSearchChange,
    searchEnabled,
    searchState,
    controller,
    scrollToNodeRef,
    rootDropUi,
    renderNode,
    onAddGeometryPack,
    onAddLogicalThinkingPack,
    onImportAllLessonsToEditor,
    onAddLesson,
    onSelectOrderedView,
    onSelectCatalogView,
    onSelectSectionsView,
    activeSegmentClassName,
    enableDnd,
    filterSectionLabelClassName,
    inactiveSegmentClassName,
    needsAuthoringFilter,
    toolbarButtonClassName,
  });
}
