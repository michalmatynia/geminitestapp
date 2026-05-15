import React from 'react';
import { Button, Input, Label, Textarea } from '@/shared/ui/primitives.public';
import { 
    type KangurLessonSection, 
    type KangurLessonSubsection,
    type KangurLessonSubject,
    KANGUR_SUBJECTS
} from '@/features/kangur/shared/contracts/kangur';
import { KANGUR_AGE_GROUPS } from '@/features/kangur/shared/contracts/kangur';

export type SectionFormData = {
  id: string;
  subject: KangurLessonSubject;
  ageGroup: string;
  label: string;
  typeLabel: string;
  emoji?: string;
  sortOrder: number;
  enabled: boolean;
};

export const KangurSectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  section: KangurLessonSection | null;
  persistSections: (next: KangurLessonSection[]) => Promise<boolean>;
  sections: KangurLessonSection[];
}> = ({ isOpen, onClose, section, persistSections, sections }) => {
  const [form, setForm] = React.useState<SectionFormData>({
    id: section?.id ?? '',
    subject: section?.subject ?? 'maths',
    ageGroup: section?.ageGroup ?? 'six_year_old',
    label: section?.label ?? '',
    typeLabel: section?.typeLabel ?? 'Section',
    emoji: section?.emoji ?? '',
    sortOrder: section?.sortOrder ?? 0,
    enabled: section?.enabled ?? true,
  });

  const isEditing = Boolean(section);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    const id = form.id.trim() || `section_${Date.now()}`;
    const nextSection: KangurLessonSection = {
      ...section,
      id,
      subject: form.subject,
      ageGroup: form.ageGroup,
      label: form.label,
      typeLabel: form.typeLabel || 'Section',
      emoji: form.emoji || undefined,
      sortOrder: form.sortOrder,
      enabled: form.enabled,
      componentIds: section?.componentIds ?? [],
      subsections: section?.subsections ?? [],
    } as KangurLessonSection;

    const nextSections = isEditing
      ? sections.map((s) => (s.id === section!.id ? nextSection : s))
      : [...sections, nextSection];

    if (await persistSections(nextSections)) {
        setIsSaving(false);
        onClose();
    } else {
        setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-lg'>
        <h2 className='text-lg font-bold'>{isEditing ? 'Edit Section' : 'Create Section'}</h2>
        <div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4'>
                <div>
                <Label>ID</Label>
                <Input value={form.id} onChange={(e) => setForm(f => ({...f, id: e.target.value}))} disabled={isEditing} />
                </div>
                <div>
                <Label>Label</Label>
                <Input value={form.label} onChange={(e) => setForm(f => ({...f, label: e.target.value}))} />
                </div>
            </div>
            <div className='grid grid-cols-2 gap-4'>
                <div>
                    <Label>Subject</Label>
                    <select value={form.subject} onChange={(e) => setForm(f => ({...f, subject: e.target.value as KangurLessonSubject}))}>
                        {KANGUR_SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                </div>
                <div>
                    <Label>Age group</Label>
                    <select value={form.ageGroup} onChange={(e) => setForm(f => ({...f, ageGroup: e.target.value}))}>
                        {KANGUR_AGE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                </div>
            </div>
            <div className='flex gap-2'>
                <Button onClick={onClose} variant='ghost'>Cancel</Button>
                <Button onClick={() => void handleSave()} disabled={isSaving}>Save</Button>
            </div>
        </div>
      </div>
    </div>
  );
};

export type SubsectionFormData = {
  id: string;
  label: string;
  typeLabel: string;
  sortOrder: number;
  enabled: boolean;
  componentIds: string;
};

export const KangurSubsectionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  parent: KangurLessonSection | null;
  subsection: KangurLessonSubsection | null;
  persistSections: (next: KangurLessonSection[]) => Promise<boolean>;
  sections: KangurLessonSection[];
}> = ({ isOpen, onClose, parent, subsection, persistSections, sections }) => {
  const [form, setForm] = React.useState<SubsectionFormData>({
    id: subsection?.id ?? '',
    label: subsection?.label ?? '',
    typeLabel: subsection?.typeLabel ?? 'Subsection',
    sortOrder: subsection?.sortOrder ?? 0,
    enabled: subsection?.enabled ?? true,
    componentIds: subsection?.componentIds.join(', ') ?? '',
  });

  const isEditing = Boolean(subsection);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async (): Promise<void> => {
    if (parent === null) return;

    setIsSaving(true);
    const id = form.id.trim() || `sub_${Date.now()}`;
    const nextSubsection: KangurLessonSubsection = {
      id,
      label: form.label,
      typeLabel: form.typeLabel || 'Subsection',
      sortOrder: form.sortOrder,
      enabled: form.enabled,
      componentIds: form.componentIds.split(',').map((s) => s.trim()).filter((s) => s.length > 0),
    };

    const nextSections = sections.map((s) => {
      if (s.id === parent.id) {
        return {
          ...s,
          subsections: isEditing
            ? s.subsections.map((sub) => (sub.id === id ? nextSubsection : sub))
            : [...s.subsections, nextSubsection],
        };
      }
      return s;
    });

    if (await persistSections(nextSections)) {
      setIsSaving(false);
      onClose();
    } else {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
      <div className='w-full max-w-lg rounded-xl bg-white p-6 shadow-lg'>
        <h2 className='text-lg font-bold'>{isEditing ? 'Edit Subsection' : 'Add Subsection'}</h2>
        <div className='space-y-4'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <Label>ID</Label>
              <Input
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
                disabled={isEditing}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Component IDs (comma-separated)</Label>
            <Textarea
              value={form.componentIds}
              onChange={(e) => setForm((f) => ({ ...f, componentIds: e.target.value }))}
            />
          </div>
          <div className='flex gap-2'>
            <Button onClick={onClose} variant='ghost'>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
