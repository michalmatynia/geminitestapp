import { useCallback, useMemo, useState } from 'react';
import type { useToast } from '@/shared/ui/primitives.public';
import {
  type KangurLessonSection,
  type KangurLessonSubsection,
} from '@/shared/contracts/kangur-lesson-sections';
import {
  useKangurLessonSections,
  useUpdateKangurLessonSections,
} from '@/features/kangur/ui/hooks/useKangurLessonSections';
import { withKangurClientError } from '@/features/kangur/observability/client';

export interface AdminKangurLessonSectionsState {
  sections: KangurLessonSection[];
  isLoading: boolean;
  isSaving: boolean;
  showSectionModal: boolean;
  setShowSectionModal: (v: boolean) => void;
  editingSection: KangurLessonSection | null;
  setEditingSection: (s: KangurLessonSection | null) => void;
  showSubsectionModal: boolean;
  setShowSubsectionModal: (v: boolean) => void;
  subsectionParent: KangurLessonSection | null;
  setSubsectionParent: (s: KangurLessonSection | null) => void;
  editingSubsection: KangurLessonSubsection | null;
  setEditingSubsection: (sub: KangurLessonSubsection | null) => void;
  deleteTarget: { section: KangurLessonSection; subsectionId?: string; } | null;
  setDeleteTarget: (target: { section: KangurLessonSection; subsectionId?: string; } | null) => void;
  expandedSectionId: string | null;
  setExpandedSectionId: (id: string | null) => void;
  sectionsBySubject: Map<string, KangurLessonSection[]>;
  persistSections: (next: KangurLessonSection[]) => Promise<boolean>;
  handleMoveUp: (idx: number, section: KangurLessonSection) => Promise<void>;
  handleMoveDown: (idx: number, section: KangurLessonSection) => Promise<void>;
  handleToggleEnabled: (section: KangurLessonSection) => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
}

interface HandlerParams {
  sections: KangurLessonSection[];
  sectionsBySubject: Map<string, KangurLessonSection[]>;
  persistSections: (next: KangurLessonSection[]) => Promise<boolean>;
  deleteTarget: { section: KangurLessonSection; subsectionId?: string; } | null;
  setDeleteTarget: (target: { section: KangurLessonSection; subsectionId?: string; } | null) => void;
  toast: ReturnType<typeof useToast>['toast'];
}

function useAdminKangurLessonSectionsDeleteHandler({
  sections,
  persistSections,
  deleteTarget,
  setDeleteTarget,
  toast,
}: Pick<HandlerParams, 'sections' | 'persistSections' | 'deleteTarget' | 'setDeleteTarget' | 'toast'>): {
  handleConfirmDelete: () => Promise<void>;
} {
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

  return { handleConfirmDelete };
}

function useAdminKangurLessonSectionsHandlers({
  sections,
  sectionsBySubject,
  persistSections,
  deleteTarget,
  setDeleteTarget,
  toast,
}: HandlerParams): {
  handleMoveUp: (idx: number, section: KangurLessonSection) => Promise<void>;
  handleMoveDown: (idx: number, section: KangurLessonSection) => Promise<void>;
  handleToggleEnabled: (section: KangurLessonSection) => Promise<void>;
  handleConfirmDelete: () => Promise<void>;
} {
  const { handleConfirmDelete } = useAdminKangurLessonSectionsDeleteHandler({
    sections, persistSections, deleteTarget, setDeleteTarget, toast
  });

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

  return {
    handleMoveUp,
    handleMoveDown,
    handleToggleEnabled,
    handleConfirmDelete,
  };
}

function useAdminKangurLessonSectionsModals(): {
  showSectionModal: boolean;
  setShowSectionModal: (v: boolean) => void;
  editingSection: KangurLessonSection | null;
  setEditingSection: (s: KangurLessonSection | null) => void;
  showSubsectionModal: boolean;
  setShowSubsectionModal: (v: boolean) => void;
  subsectionParent: KangurLessonSection | null;
  setSubsectionParent: (s: KangurLessonSection | null) => void;
  editingSubsection: KangurLessonSubsection | null;
  setEditingSubsection: (sub: KangurLessonSubsection | null) => void;
  deleteTarget: { section: KangurLessonSection; subsectionId?: string; } | null;
  setDeleteTarget: (target: { section: KangurLessonSection; subsectionId?: string; } | null) => void;
  expandedSectionId: string | null;
  setExpandedSectionId: (id: string | null) => void;
} {
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<KangurLessonSection | null>(null);
  
  const [showSubsectionModal, setShowSubsectionModal] = useState(false);
  const [subsectionParent, setSubsectionParent] = useState<KangurLessonSection | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<KangurLessonSubsection | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ section: KangurLessonSection; subsectionId?: string; } | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  return {
    showSectionModal, setShowSectionModal,
    editingSection, setEditingSection,
    showSubsectionModal, setShowSubsectionModal,
    subsectionParent, setSubsectionParent,
    editingSubsection, setEditingSubsection,
    deleteTarget, setDeleteTarget,
    expandedSectionId, setExpandedSectionId
  };
}


export function useAdminKangurLessonSectionsPanelState(toast: ReturnType<typeof useToast>['toast']): AdminKangurLessonSectionsState {
  const sectionsQuery = useKangurLessonSections();
  const sections: KangurLessonSection[] = sectionsQuery.data ?? [];
  const isLoading = sectionsQuery.isLoading;

  const updateSections = useUpdateKangurLessonSections();
  const isSaving = updateSections.isPending;

  const modals = useAdminKangurLessonSectionsModals();

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

  const handlers = useAdminKangurLessonSectionsHandlers({
    sections,
    sectionsBySubject,
    persistSections,
    deleteTarget: modals.deleteTarget,
    setDeleteTarget: modals.setDeleteTarget,
    toast,
  });

  return {
    sections,
    isLoading,
    isSaving,
    ...modals,
    sectionsBySubject,
    persistSections,
    ...handlers,
  };
}

