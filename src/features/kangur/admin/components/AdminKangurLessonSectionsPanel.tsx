'use client';

import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { KANGUR_AGE_GROUPS, KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog-metadata';
import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurLessonSection,
  KangurLessonSubsection,
} from '@/shared/contracts/kangur-lesson-sections';
import { Badge, Button, FormModal, Input, Label } from '@/features/kangur/shared/ui';
import { ConfirmModal } from '@/features/kangur/shared/ui/templates/modals';
import { cn } from '@/features/kangur/shared/utils';
import {
  useKangurLessonSections,
  useUpdateKangurLessonSections,
} from '@/features/kangur/ui/hooks/useKangurLessonSections';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { useToast } from '@/features/kangur/shared/ui';
import { renderKangurAdminWorkspaceIntroCard } from './KangurAdminWorkspaceIntroCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionFormData = {
  id: string;
  subject: KangurLessonSubject;
  ageGroup: KangurLessonAgeGroup;
  label: string;
  typeLabel: string;
  emoji: string;
  sortOrder: number;
  enabled: boolean;
};

type SubsectionFormData = {
  id: string;
  label: string;
  typeLabel: string;
  sortOrder: number;
  enabled: boolean;
  componentIds: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createBlankSectionForm = (
  subject: KangurLessonSubject = 'maths',
  ageGroup: KangurLessonAgeGroup = 'six_year_old',
  sortOrder = 0,
): SectionFormData => ({
  id: '',
  subject,
  ageGroup,
  label: '',
  typeLabel: 'Section',
  emoji: '',
  sortOrder,
  enabled: true,
});

const sectionToForm = (section: KangurLessonSection): SectionFormData => ({
  id: section.id,
  subject: section.subject,
  ageGroup: section.ageGroup,
  label: section.label,
  typeLabel: section.typeLabel,
  emoji: section.emoji ?? '',
  sortOrder: section.sortOrder,
  enabled: section.enabled,
});

const createBlankSubsectionForm = (sortOrder = 0): SubsectionFormData => ({
  id: '',
  label: '',
  typeLabel: 'Subsection',
  sortOrder,
  enabled: true,
  componentIds: '',
});

const subsectionToForm = (sub: KangurLessonSubsection): SubsectionFormData => ({
  id: sub.id,
  label: sub.label,
  typeLabel: sub.typeLabel,
  sortOrder: sub.sortOrder,
  enabled: sub.enabled,
  componentIds: sub.componentIds.join(', '),
});

const parseComponentIds = (raw: string): KangurLessonComponentId[] =>
  raw
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean) as KangurLessonComponentId[];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type AdminKangurLessonSectionsPanelProps = {
  standalone?: boolean;
};

export function AdminKangurLessonSectionsPanel({
  standalone = true,
}: AdminKangurLessonSectionsPanelProps): React.JSX.Element {
  const { data: sections = [], isLoading } = useKangurLessonSections();
  const updateSections = useUpdateKangurLessonSections();
  const { toast } = useToast();
  const isSaving = updateSections.isPending;

  // --- Section modal ---
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState<KangurLessonSection | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormData>(() => createBlankSectionForm());

  // --- Subsection modal ---
  const [showSubsectionModal, setShowSubsectionModal] = useState(false);
  const [subsectionParent, setSubsectionParent] = useState<KangurLessonSection | null>(null);
  const [editingSubsection, setEditingSubsection] = useState<KangurLessonSubsection | null>(null);
  const [subsectionForm, setSubsectionForm] = useState<SubsectionFormData>(() =>
    createBlankSubsectionForm(),
  );

  // --- Delete confirm ---
  const [deleteTarget, setDeleteTarget] = useState<{ section: KangurLessonSection; subsectionId?: string } | null>(null);

  // --- Expand ---
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const sectionsBySubject = useMemo(() => {
    const map = new Map<KangurLessonSubject, KangurLessonSection[]>();
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

  // --- Persist helper ---
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
        },
      ),
    [toast, updateSections],
  );

  // --- Section CRUD ---
  const openCreateSection = (): void => {
    const maxSort = sections.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    setEditingSection(null);
    setSectionForm(createBlankSectionForm('maths', 'six_year_old', maxSort + 100));
    setShowSectionModal(true);
  };

  const openEditSection = (section: KangurLessonSection): void => {
    setEditingSection(section);
    setSectionForm(sectionToForm(section));
    setShowSectionModal(true);
  };

  const handleSaveSection = async (): Promise<void> => {
    const id = sectionForm.id.trim() || `section_${Date.now()}`;
    const nextSection: KangurLessonSection = {
      id,
      subject: sectionForm.subject,
      ageGroup: sectionForm.ageGroup,
      label: sectionForm.label,
      typeLabel: sectionForm.typeLabel || 'Section',
      emoji: sectionForm.emoji || undefined,
      sortOrder: sectionForm.sortOrder,
      enabled: sectionForm.enabled,
      componentIds: editingSection?.componentIds ?? [],
      subsections: editingSection?.subsections ?? [],
    };

    const nextSections = editingSection
      ? sections.map((s) => (s.id === editingSection.id ? nextSection : s))
      : [...sections, nextSection];

    const ok = await persistSections(nextSections);
    if (ok) {
      toast(editingSection ? 'Section updated.' : 'Section created.', { variant: 'success' });
      setShowSectionModal(false);
    }
  };

  const handleToggleSectionEnabled = async (section: KangurLessonSection): Promise<void> => {
    const nextSections = sections.map((s) =>
      s.id === section.id ? { ...s, enabled: !s.enabled } : s,
    );
    const ok = await persistSections(nextSections);
    if (ok) {
      toast(section.enabled ? 'Section disabled.' : 'Section enabled.', { variant: 'success' });
    }
  };

  const handleMoveSectionUp = async (section: KangurLessonSection): Promise<void> => {
    const subjectSections = sectionsBySubject.get(section.subject) ?? [];
    const idx = subjectSections.findIndex((s) => s.id === section.id);
    const prev = idx > 0 ? subjectSections[idx - 1] : undefined;
    if (!prev) return;
    const nextSections = sections.map((s) => {
      if (s.id === section.id) return { ...s, sortOrder: prev.sortOrder };
      if (s.id === prev.id) return { ...s, sortOrder: section.sortOrder };
      return s;
    });
    await persistSections(nextSections);
  };

  const handleMoveSectionDown = async (section: KangurLessonSection): Promise<void> => {
    const subjectSections = sectionsBySubject.get(section.subject) ?? [];
    const idx = subjectSections.findIndex((s) => s.id === section.id);
    const nextItem = idx >= 0 && idx < subjectSections.length - 1 ? subjectSections[idx + 1] : undefined;
    if (!nextItem) return;
    const nextSections = sections.map((s) => {
      if (s.id === section.id) return { ...s, sortOrder: nextItem.sortOrder };
      if (s.id === nextItem.id) return { ...s, sortOrder: section.sortOrder };
      return s;
    });
    await persistSections(nextSections);
  };

  // --- Subsection CRUD ---
  const openCreateSubsection = (parent: KangurLessonSection): void => {
    const maxSort = parent.subsections.reduce((max, s) => Math.max(max, s.sortOrder), 0);
    setSubsectionParent(parent);
    setEditingSubsection(null);
    setSubsectionForm(createBlankSubsectionForm(maxSort + 100));
    setShowSubsectionModal(true);
  };

  const openEditSubsection = (
    parent: KangurLessonSection,
    sub: KangurLessonSubsection,
  ): void => {
    setSubsectionParent(parent);
    setEditingSubsection(sub);
    setSubsectionForm(subsectionToForm(sub));
    setShowSubsectionModal(true);
  };

  const handleSaveSubsection = async (): Promise<void> => {
    if (!subsectionParent) return;
    const id = subsectionForm.id.trim() || `sub_${Date.now()}`;
    const nextSub: KangurLessonSubsection = {
      id,
      label: subsectionForm.label,
      typeLabel: subsectionForm.typeLabel || 'Subsection',
      sortOrder: subsectionForm.sortOrder,
      enabled: subsectionForm.enabled,
      componentIds: parseComponentIds(subsectionForm.componentIds),
    };

    const nextSubsections = editingSubsection
      ? subsectionParent.subsections.map((s) => (s.id === editingSubsection.id ? nextSub : s))
      : [...subsectionParent.subsections, nextSub];

    const nextSections = sections.map((s) =>
      s.id === subsectionParent.id ? { ...s, subsections: nextSubsections } : s,
    );
    const ok = await persistSections(nextSections);
    if (ok) {
      toast(editingSubsection ? 'Subsection updated.' : 'Subsection created.', {
        variant: 'success',
      });
      setShowSubsectionModal(false);
    }
  };

  // --- Delete ---
  const handleDelete = async (): Promise<void> => {
    if (!deleteTarget) return;
    let nextSections: KangurLessonSection[];
    if (deleteTarget.subsectionId) {
      nextSections = sections.map((s) =>
        s.id === deleteTarget.section.id
          ? { ...s, subsections: s.subsections.filter((sub) => sub.id !== deleteTarget.subsectionId) }
          : s,
      );
    } else {
      nextSections = sections.filter((s) => s.id !== deleteTarget.section.id);
    }
    const ok = await persistSections(nextSections);
    if (ok) {
      toast(deleteTarget.subsectionId ? 'Subsection deleted.' : 'Section deleted.', {
        variant: 'success',
      });
      setDeleteTarget(null);
    }
  };

  // --- Styles ---
  const rowButtonClassName =
    'h-7 w-7 rounded-lg border-border/60 bg-background/60 text-muted-foreground hover:bg-card/80 hover:text-foreground';

  const renderSectionRow = (section: KangurLessonSection): React.ReactNode => {
    const isExpanded = expandedSectionId === section.id;
    const subjectSections = sectionsBySubject.get(section.subject) ?? [];
    const idx = subjectSections.findIndex((s) => s.id === section.id);
    const isFirst = idx === 0;
    const isLast = idx === subjectSections.length - 1;

    return (
      <div
        key={section.id}
        className='rounded-xl border border-border/60 bg-card/40'
      >
        <div className='flex items-center gap-2 px-3 py-2'>
          <button
            type='button'
            className='shrink-0 p-1 text-muted-foreground hover:text-foreground'
            onClick={() => setExpandedSectionId(isExpanded ? null : section.id)}
          >
            <ChevronDown
              className={cn('size-4 transition-transform', isExpanded && 'rotate-180')}
            />
          </button>

          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              {section.emoji ? <span className='text-sm'>{section.emoji}</span> : null}
              <span className='text-sm font-semibold text-foreground'>{section.label}</span>
              <Badge variant='outline' className='text-[10px]'>
                {section.typeLabel}
              </Badge>
              {!section.enabled ? (
                <Badge variant='secondary' className='text-[10px]'>
                  Disabled
                </Badge>
              ) : null}
            </div>
            <div className='mt-0.5 text-[11px] text-muted-foreground'>
              {section.componentIds.length} direct lessons
              {section.subsections.length > 0
                ? ` · ${section.subsections.length} subsections`
                : ''}
            </div>
          </div>

          <div className='flex items-center gap-1'>
            <Button
              type='button'
              size='icon'
              variant='outline'
              className={rowButtonClassName}
              disabled={isSaving || isFirst}
              onClick={() => void handleMoveSectionUp(section)}
              title='Move up'
            >
              <ArrowUp className='size-3.5' />
            </Button>
            <Button
              type='button'
              size='icon'
              variant='outline'
              className={rowButtonClassName}
              disabled={isSaving || isLast}
              onClick={() => void handleMoveSectionDown(section)}
              title='Move down'
            >
              <ArrowDown className='size-3.5' />
            </Button>
            <Button
              type='button'
              size='icon'
              variant='outline'
              className={rowButtonClassName}
              disabled={isSaving}
              onClick={() => void handleToggleSectionEnabled(section)}
              title={section.enabled ? 'Disable' : 'Enable'}
            >
              {section.enabled ? <Eye className='size-3.5' /> : <EyeOff className='size-3.5' />}
            </Button>
            <Button
              type='button'
              size='icon'
              variant='outline'
              className={rowButtonClassName}
              disabled={isSaving}
              onClick={() => openEditSection(section)}
              title='Edit'
            >
              <Pencil className='size-3.5' />
            </Button>
            <Button
              type='button'
              size='icon'
              variant='outline'
              className={cn(rowButtonClassName, 'hover:border-red-400/60 hover:text-red-500')}
              disabled={isSaving}
              onClick={() => setDeleteTarget({ section })}
              title='Delete'
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        </div>

        {isExpanded ? (
          <div className='border-t border-border/40 px-4 py-3'>
            <div className='mb-2 flex items-center justify-between'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
                Subsections
              </div>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-7 rounded-lg px-2.5 text-[11px]'
                disabled={isSaving}
                onClick={() => openCreateSubsection(section)}
              >
                <Plus className='mr-1 size-3' />
                Add subsection
              </Button>
            </div>

            {section.subsections.length === 0 ? (
              <div className='py-2 text-xs text-muted-foreground'>
                No subsections. Direct componentIds: {section.componentIds.length > 0 ? section.componentIds.join(', ') : 'none'}
              </div>
            ) : (
              <div className='space-y-1.5'>
                {[...section.subsections]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className='flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5'
                    >
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='text-xs font-medium text-foreground'>
                            {sub.label}
                          </span>
                          <Badge variant='outline' className='text-[9px]'>
                            {sub.typeLabel}
                          </Badge>
                          {!sub.enabled ? (
                            <Badge variant='secondary' className='text-[9px]'>
                              Off
                            </Badge>
                          ) : null}
                        </div>
                        <div className='text-[10px] text-muted-foreground'>
                          {sub.componentIds.length} lessons
                        </div>
                      </div>
                      <Button
                        type='button'
                        size='icon'
                        variant='outline'
                        className={cn(rowButtonClassName, 'size-6')}
                        disabled={isSaving}
                        onClick={() => openEditSubsection(section, sub)}
                        title='Edit subsection'
                      >
                        <Pencil className='size-3' />
                      </Button>
                      <Button
                        type='button'
                        size='icon'
                        variant='outline'
                        className={cn(
                          rowButtonClassName,
                          'size-6 hover:border-red-400/60 hover:text-red-500',
                        )}
                        disabled={isSaving}
                        onClick={() =>
                          setDeleteTarget({ section, subsectionId: sub.id })
                        }
                        title='Delete subsection'
                      >
                        <Trash2 className='size-3' />
                      </Button>
                    </div>
                  ))}
              </div>
            )}

            {section.componentIds.length > 0 ? (
              <div className='mt-3'>
                <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
                  Direct component IDs
                </div>
                <div className='mt-1 text-[11px] text-muted-foreground'>
                  {section.componentIds.join(', ')}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const deleteMessage = deleteTarget?.subsectionId
    ? `Delete subsection from "${deleteTarget.section.label}"?`
    : `Delete section "${deleteTarget?.section.label ?? ''}" and all its subsections?`;

  return (
    <>
      {standalone
        ? renderKangurAdminWorkspaceIntroCard({
            title: 'Lesson sections',
            description:
              'Manage section and subsection structure. Sections organise lessons into collapsible groups in the learner catalog.',
            badge: 'Sections editor',
          })
        : null}

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
            onClick={openCreateSection}
          >
            <Plus className='mr-1 size-3.5' />
            Add section
          </Button>
        </div>

        {isLoading ? (
          <div className='py-8 text-center text-sm text-muted-foreground'>Loading sections...</div>
        ) : (
          <div className='space-y-6'>
            {KANGUR_SUBJECTS.map((subject) => {
              const subjectSections = sectionsBySubject.get(subject.id) ?? [];
              return (
                <div key={subject.id}>
                  <div className='mb-2 flex items-center gap-2'>
                    <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
                      {subject.label}
                    </div>
                    <Badge variant='outline' className='text-[10px]'>
                      {subjectSections.length}
                    </Badge>
                  </div>
                  {subjectSections.length === 0 ? (
                    <div className='py-2 text-xs text-muted-foreground'>
                      No sections for this subject.
                    </div>
                  ) : (
                    <div className='space-y-1.5'>
                      {subjectSections.map((section) => renderSectionRow(section))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section create/edit modal */}
      <FormModal
        isOpen={showSectionModal}
        onClose={() => {
          setShowSectionModal(false);
          setEditingSection(null);
        }}
        title={editingSection ? 'Edit Section' : 'Create Section'}
        subtitle='Configure section metadata for the lesson catalog.'
        onSave={() => void handleSaveSection()}
        isSaving={isSaving}
        isSaveDisabled={!sectionForm.label.trim() || isSaving}
        saveText={editingSection ? 'Save Section' : 'Create Section'}
      >
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>ID</Label>
              <Input
                value={sectionForm.id}
                onChange={(e) => setSectionForm((f) => ({ ...f, id: e.target.value }))}
                placeholder='auto-generated if empty'
                disabled={Boolean(editingSection)}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={sectionForm.label}
                onChange={(e) => setSectionForm((f) => ({ ...f, label: e.target.value }))}
                placeholder='Section name'
              />
            </div>
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>Subject</Label>
              <select
                className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'
                value={sectionForm.subject}
                onChange={(e) =>
                  setSectionForm((f) => ({
                    ...f,
                    subject: e.target.value as KangurLessonSubject,
                  }))
                }
                disabled={Boolean(editingSection)}
              >
                {KANGUR_SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Age group</Label>
              <select
                className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'
                value={sectionForm.ageGroup}
                onChange={(e) =>
                  setSectionForm((f) => ({
                    ...f,
                    ageGroup: e.target.value as KangurLessonAgeGroup,
                  }))
                }
                disabled={Boolean(editingSection)}
              >
                {KANGUR_AGE_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className='grid grid-cols-3 gap-4'>
            <div>
              <Label>Type label</Label>
              <Input
                value={sectionForm.typeLabel}
                onChange={(e) => setSectionForm((f) => ({ ...f, typeLabel: e.target.value }))}
                placeholder='Section'
              />
            </div>
            <div>
              <Label>Emoji</Label>
              <Input
                value={sectionForm.emoji}
                onChange={(e) => setSectionForm((f) => ({ ...f, emoji: e.target.value }))}
                placeholder='optional'
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type='number'
                value={sectionForm.sortOrder}
                onChange={(e) =>
                  setSectionForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                }
              />
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='checkbox'
              id='section-enabled'
              aria-label='Enabled'
              checked={sectionForm.enabled}
              onChange={(e) => setSectionForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            <Label htmlFor='section-enabled'>Enabled</Label>
          </div>
        </div>
      </FormModal>

      {/* Subsection create/edit modal */}
      <FormModal
        isOpen={showSubsectionModal}
        onClose={() => {
          setShowSubsectionModal(false);
          setSubsectionParent(null);
          setEditingSubsection(null);
        }}
        title={editingSubsection ? 'Edit Subsection' : 'Add Subsection'}
        subtitle={`In section "${subsectionParent?.label ?? ''}"`}
        onSave={() => void handleSaveSubsection()}
        isSaving={isSaving}
        isSaveDisabled={!subsectionForm.label.trim() || isSaving}
        saveText={editingSubsection ? 'Save' : 'Create'}
      >
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>ID</Label>
              <Input
                value={subsectionForm.id}
                onChange={(e) =>
                  setSubsectionForm((f) => ({ ...f, id: e.target.value }))
                }
                placeholder='auto-generated if empty'
                disabled={Boolean(editingSubsection)}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={subsectionForm.label}
                onChange={(e) =>
                  setSubsectionForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder='Subsection name'
              />
            </div>
          </div>
          <div className='grid grid-cols-3 gap-4'>
            <div>
              <Label>Type label</Label>
              <Input
                value={subsectionForm.typeLabel}
                onChange={(e) =>
                  setSubsectionForm((f) => ({ ...f, typeLabel: e.target.value }))
                }
                placeholder='Subsection'
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type='number'
                value={subsectionForm.sortOrder}
                onChange={(e) =>
                  setSubsectionForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className='flex items-center gap-2 pt-6'>
              <input
                type='checkbox'
                id='subsection-enabled'
                aria-label='Enabled'
                checked={subsectionForm.enabled}
                onChange={(e) =>
                  setSubsectionForm((f) => ({ ...f, enabled: e.target.checked }))
                }
              />
              <Label htmlFor='subsection-enabled'>Enabled</Label>
            </div>
          </div>
          <div>
            <Label>Component IDs (comma-separated)</Label>
            <textarea
              className='flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm'
              aria-label='Component IDs (comma-separated)'
              value={subsectionForm.componentIds}
              onChange={(e) =>
                setSubsectionForm((f) => ({ ...f, componentIds: e.target.value }))
              }
              placeholder='ComponentA, ComponentB'
            />
          </div>
        </div>
      </FormModal>

      {/* Delete confirm */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title='Delete'
        message={deleteMessage}
        confirmText='Delete'
        isDangerous
      />
    </>
  );
}
