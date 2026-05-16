import React from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '@/shared/ui/primitives.public';
import { type KangurSubjectDefinition } from '@/features/kangur/lessons/lesson-types';
import { KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import { Button } from '@/shared/ui/primitives.public';
import { renderKangurAdminWorkspaceIntroCard } from './KangurAdminWorkspaceIntroCard';
import { KangurSectionModal, KangurSubsectionModal } from './KangurSectionModals';
import { SubjectSectionsGroup } from './SubjectSectionsGroup';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { 
    useAdminKangurLessonSectionsPanelState,
    type AdminKangurLessonSectionsState 
} from './AdminKangurLessonSectionsPanel.hooks';

function LoadingState({ message }: { message: string }): React.JSX.Element {
  return (
    <div className='rounded-xl border border-dashed border-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground'>
      {message}
    </div>
  );
}

export function AdminKangurLessonSectionsPanel({
  standalone = true,
}: {
  standalone?: boolean;
}): React.JSX.Element {
  const { toast } = useToast();
  const state = useAdminKangurLessonSectionsPanelState(toast);

  return (
    <SectionsPanelContent
      state={state}
      standalone={standalone}
    />
  );
}

interface SectionsPanelContentProps {
  state: AdminKangurLessonSectionsState;
  standalone: boolean;
}

function SectionsPanelList({ state }: { state: AdminKangurLessonSectionsState }): React.JSX.Element {
    return (
        <div className='space-y-6'>
            {KANGUR_SUBJECTS.map((subject: KangurSubjectDefinition) => (
                <SubjectSectionsGroup 
                    key={subject.id}
                    subjectLabel={subject.label}
                    sections={state.sectionsBySubject.get(subject.id) ?? []}
                    expandedSectionId={state.expandedSectionId}
                    onToggleExpand={state.setExpandedSectionId}
                    onMoveUp={state.handleMoveUp}
                    onMoveDown={state.handleMoveDown}
                    onToggleEnabled={state.handleToggleEnabled}
                    onEdit={(section) => {
                        state.setEditingSection(section);
                        state.setShowSectionModal(true);
                    }}
                    onDelete={(section) => state.setDeleteTarget({ section })}
                    onAddSubsection={(section) => {
                        state.setSubsectionParent(section);
                        state.setEditingSubsection(null);
                        state.setShowSubsectionModal(true);
                    }}
                    onEditSubsection={(section, sub) => {
                        state.setSubsectionParent(section);
                        state.setEditingSubsection(sub);
                        state.setShowSubsectionModal(true);
                    }}
                    onDeleteSubsection={(section, subId) =>
                        state.setDeleteTarget({ section, subsectionId: subId })
                    }
                    isSaving={state.isSaving}
                />
            ))}
        </div>
    );
}

function SectionsPanelModals({ state }: { state: AdminKangurLessonSectionsState }): React.JSX.Element {
    return (
        <>
            <KangurSectionModal
                isOpen={state.showSectionModal}
                onClose={() => state.setShowSectionModal(false)}
                section={state.editingSection}
                persistSections={state.persistSections}
                sections={state.sections}
            />
            <KangurSubsectionModal
                isOpen={state.showSubsectionModal}
                onClose={() => state.setShowSubsectionModal(false)}
                parent={state.subsectionParent}
                subsection={state.editingSubsection}
                persistSections={state.persistSections}
                sections={state.sections}
            />
            <DeleteConfirmationModal 
                deleteTarget={state.deleteTarget}
                onCancel={() => state.setDeleteTarget(null)}
                onConfirm={() => { void state.handleConfirmDelete(); }}
                isSaving={state.isSaving}
            />
        </>
    );
}

function SectionsPanelContent({ 
  state,
  standalone 
}: SectionsPanelContentProps): React.JSX.Element {
    return (
        <>
            {standalone &&
                renderKangurAdminWorkspaceIntroCard({
                title: 'Lesson sections',
                description:
                    'Manage section and subsection structure. Sections organise lessons into collapsible groups in the learner catalog.',
                badge: 'Sections editor',
                })}
            <div className='min-h-0 flex-1 overflow-auto rounded-2xl border border-border/60 bg-card/35 p-4 shadow-sm'>
                <div className='mb-4 flex items-center justify-between'>
                <div className='text-sm font-semibold text-foreground'>
                    All sections
                    <span className='ml-2 text-xs font-normal text-muted-foreground'>
                    {state.sections.length} total
                    </span>
                </div>
                <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 rounded-xl px-3 text-xs font-semibold'
                    disabled={state.isSaving || state.isLoading}
                    onClick={() => {
                        state.setEditingSection(null);
                        state.setShowSectionModal(true);
                    }}
                >
                    <Plus className='mr-1 size-3.5' />
                    Add section
                </Button>
                </div>
                {state.isLoading ? (
                    <LoadingState message='Loading sections...' />
                ) : (
                    <SectionsPanelList state={state} />
                )}
            </div>
            <SectionsPanelModals state={state} />
        </>
    );
}

