import React, { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useToast } from '@/shared/ui/primitives.public';
import { type KangurSubjectDefinition } from '@/features/kangur/lessons/lesson-types';
import { KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import {
  type KangurLessonSection,
  type KangurLessonSubsection,
} from '@/shared/contracts/kangur-lesson-sections';
import { Button } from '@/shared/ui/primitives.public';
import {
  useKangurLessonSections,
  useUpdateKangurLessonSections,
} from '@/features/kangur/ui/hooks/useKangurLessonSections';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { renderKangurAdminWorkspaceIntroCard } from './KangurAdminWorkspaceIntroCard';
import { KangurSectionModal, KangurSubsectionModal } from './KangurSectionModals';
import { SubjectSectionsGroup } from './SubjectSectionsGroup';

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
  const sectionsQuery = useKangurLessonSections();
  const sections: KangurLessonSection[] = sectionsQuery.data ?? [];
  const isLoading = sectionsQuery.isLoading;

  const updateSections = useUpdateKangurLessonSections();
  const { toast } = useToast();
  const isSaving = updateSections.isPending;

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<KangurLessonSection | null>(null);
  
  const [showSubsectionModal, setShowSubsectionModal] = useState(false);
  const [subsectionParent, setSubsectionParent] = useState<KangurLessonSection | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<KangurLessonSubsection | null>(null);

  const [deleteTarget, setDeleteTarget] = useState< { section: KangurLessonSection; subsectionId?: string; } | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const sectionsBySubject = useMemo(() => {
    const map = new Map<string, KangurLessonSection[]>();
    for (const section of sections) {
      const list = map.get(section.subject) ?? [];
      list.push(section);
      map.set(section.subject, list);
    }
    for (const [key, list] of map) {
      map.set(key, list.sort((a, b) => a.sortOrder - b.sortOrder));
    }
    return map;
  }, [sections]);

  const persistSections = useCallback(
    async (next: KangurLessonSection[]): Promise<boolean> =>
      await withKangurClientError(
        {
          source: 'kangur.admin.sections-panel',
          action: 'save-sections',
          description: 'Persists lesson sections to Mongo.',
        },
        async () => {
          await updateSections.mutateAsync(next);
          return true;
        },
        {
          fallback: false,
          onError: () => {
            toast('Failed to save sections.', { variant: 'error' });
          },
        }
      ),
    [toast, updateSections]
  );

  return (
    <SectionsPanelContent
      sections={sections}
      isLoading={isLoading}
      isSaving={isSaving}
      sectionsBySubject={sectionsBySubject}
      persistSections={persistSections}
      expandedSectionId={expandedSectionId}
      setExpandedSectionId={setExpandedSectionId}
      setEditingSection={setEditingSection}
      setShowSectionModal={setShowSectionModal}
  setSubsectionParent={setSubsectionParent}
  setEditingSubsection={setEditingSubsection}
  setShowSubsectionModal={setShowSubsectionModal}
  setDeleteTarget={setDeleteTarget}
      showSectionModal={showSectionModal}
      editingSection={editingSection}
      showSubsectionModal={showSubsectionModal}
      subsectionParent={subsectionParent}
      editingSubsection={editingSubsection}
      deleteTarget={deleteTarget}
      standalone={standalone}
    />
  );
}

interface SectionsPanelContentProps {
  sections: KangurLessonSection[];
  isLoading: boolean;
  isSaving: boolean;
  sectionsBySubject: Map<string, KangurLessonSection[]>;
  persistSections: (next: KangurLessonSection[]) => Promise<boolean>;
  expandedSectionId: string | null;
  setExpandedSectionId: (id: string | null) => void;
  setEditingSection: (s: KangurLessonSection | null) => void;
  setShowSectionModal: (show: boolean) => void;
  setSubsectionParent: (s: KangurLessonSection | null) => void;
  setEditingSubsection: (sub: KangurLessonSubsection | null) => void;
  setShowSubsectionModal: (show: boolean) => void;
  setDeleteTarget: (target: { section: KangurLessonSection; subsectionId?: string } | null) => void;
  showSectionModal: boolean;
  editingSection: KangurLessonSection | null;
  showSubsectionModal: boolean;
  subsectionParent: KangurLessonSection | null;
  editingSubsection: KangurLessonSubsection | null;
  deleteTarget: { section: KangurLessonSection; subsectionId?: string } | null;
  standalone: boolean;
}

function SectionsPanelContent({ 
  sections, isLoading, isSaving, sectionsBySubject, persistSections,
  expandedSectionId, setExpandedSectionId, setEditingSection, setShowSectionModal,
  setSubsectionParent, setEditingSubsection, setShowSubsectionModal, setDeleteTarget,
  showSectionModal, editingSection, showSubsectionModal, subsectionParent, editingSubsection,
  deleteTarget,
  standalone 
}: SectionsPanelContentProps): React.JSX.Element {
    const { toast } = useToast();

    const handleMoveUp = async (idx: number, section: KangurLessonSection): Promise<void> => {
        const subjectSections = sectionsBySubject.get(section.subject) ?? [];
        const prev = subjectSections[idx - 1];
        if (prev === undefined) return;
        await persistSections(sections.map((s) => {
            if (s.id === section.id) return { ...s, sortOrder: prev.sortOrder };
            if (s.id === prev.id) return { ...s, sortOrder: section.sortOrder };
            return s;
        }));
    };

    const handleMoveDown = async (idx: number, section: KangurLessonSection): Promise<void> => {
        const subjectSections = sectionsBySubject.get(section.subject) ?? [];
        const nextItem = subjectSections[idx + 1];
        if (nextItem === undefined) return;
        await persistSections(sections.map((s) => {
            if (s.id === section.id) return { ...s, sortOrder: nextItem.sortOrder };
            if (s.id === nextItem.id) return { ...s, sortOrder: section.sortOrder };
            return s;
        }));
    };

    const handleToggleEnabled = async (section: KangurLessonSection): Promise<void> => {
        const next = sections.map((s) =>
            s.id === section.id ? { ...s, enabled: !s.enabled } : s
        );
        if (await persistSections(next)) {
            toast(section.enabled ? 'Section disabled.' : 'Section enabled.', {
                variant: 'success',
            });
        }
    };

    const handleConfirmDelete = async (): Promise<void> => {
        if (deleteTarget === null) return;
        const next = deleteTarget.subsectionId === undefined
            ? sections.filter((section) => section.id !== deleteTarget.section.id)
            : sections.map((section) =>
                section.id === deleteTarget.section.id
                    ? {
                        ...section,
                        subsections: section.subsections.filter(
                            (subsection) => subsection.id !== deleteTarget.subsectionId
                        ),
                    }
                    : section
            );
        if (await persistSections(next)) {
            setDeleteTarget(null);
            toast('Section structure updated.', { variant: 'success' });
        }
    };

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
                    {sections.length} total
                    </span>
                </div>
                <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    className='h-8 rounded-xl px-3 text-xs font-semibold'
                    disabled={isSaving || isLoading}
                    onClick={() => {
                        setEditingSection(null);
                        setShowSectionModal(true);
                    }}
                >
                    <Plus className='mr-1 size-3.5' />
                    Add section
                </Button>
                </div>
                {isLoading ? (
                    <LoadingState message='Loading sections...' />
                ) : (
                    <div className='space-y-6'>
                        {KANGUR_SUBJECTS.map((subject: KangurSubjectDefinition) => (
                            <SubjectSectionsGroup 
                                key={subject.id}
                                subjectLabel={subject.label}
                                sections={sectionsBySubject.get(subject.id) ?? []}
                                expandedSectionId={expandedSectionId}
                                onToggleExpand={setExpandedSectionId}
                                onMoveUp={handleMoveUp}
                                onMoveDown={handleMoveDown}
                                onToggleEnabled={handleToggleEnabled}
                                onEdit={(section) => {
                                    setEditingSection(section);
                                    setShowSectionModal(true);
                                }}
                                onDelete={(section) => setDeleteTarget({ section })}
                                onAddSubsection={(section) => {
                                    setSubsectionParent(section);
                                    setEditingSubsection(null);
                                    setShowSubsectionModal(true);
                                }}
                                onEditSubsection={(section, sub) => {
                                    setSubsectionParent(section);
                                    setEditingSubsection(sub);
                                    setShowSubsectionModal(true);
                                }}
                                onDeleteSubsection={(section, subId) =>
                                    setDeleteTarget({ section, subsectionId: subId })
                                }
                                isSaving={isSaving}
                            />
                        ))}
                    </div>
                )}
            </div>
            <KangurSectionModal
                isOpen={showSectionModal}
                onClose={() => setShowSectionModal(false)}
                section={editingSection}
                persistSections={persistSections}
                sections={sections}
            />
            <KangurSubsectionModal
                isOpen={showSubsectionModal}
                onClose={() => setShowSubsectionModal(false)}
                parent={subsectionParent}
                subsection={editingSubsection}
                persistSections={persistSections}
                sections={sections}
            />
            {deleteTarget ? (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
                    <div className='w-full max-w-sm rounded-xl border border-border/60 bg-background p-5 shadow-xl'>
                        <div className='text-sm font-semibold text-foreground'>Delete section item?</div>
                        <div className='mt-2 text-sm text-muted-foreground'>
                            This will remove the selected {deleteTarget.subsectionId ? 'subsection' : 'section'}.
                        </div>
                        <div className='mt-4 flex justify-end gap-2'>
                            <Button type='button' variant='ghost' onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button
                                type='button'
                                variant='destructive'
                                disabled={isSaving}
                                onClick={() => { void handleConfirmDelete(); }}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
