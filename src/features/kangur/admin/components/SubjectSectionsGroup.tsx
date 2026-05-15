import React from 'react';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/utils/ui-utils';
import { type KangurLessonSection, type KangurLessonSubsection } from '@/features/kangur/shared/contracts/kangur';
import { SectionRow } from './SectionRow';

type SubjectSectionsGroupProps = {
  subjectLabel: string;
  sections: KangurLessonSection[];
  expandedSectionId: string | null;
  onToggleExpand: (id: string | null) => void;
  onMoveUp: (idx: number, section: KangurLessonSection) => Promise<void>;
  onMoveDown: (idx: number, section: KangurLessonSection) => Promise<void>;
  onToggleEnabled: (section: KangurLessonSection) => Promise<void>;
  onEdit: (section: KangurLessonSection) => void;
  onDelete: (section: KangurLessonSection) => void;
  onAddSubsection: (section: KangurLessonSection) => void;
  onEditSubsection: (section: KangurLessonSection, sub: KangurLessonSubsection) => void;
  onDeleteSubsection: (section: KangurLessonSection, subId: string) => void;
  isSaving: boolean;
};

export const SubjectSectionsGroup: React.FC<SubjectSectionsGroupProps> = ({
  subjectLabel,
  sections,
  expandedSectionId,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onEdit,
  onDelete,
  onAddSubsection,
  onEditSubsection,
  onDeleteSubsection,
  isSaving,
}): React.JSX.Element => (
  <div>
    <div className='mb-2 flex items-center gap-2'>
      <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
        {subjectLabel}
      </div>
      <Badge variant='outline' className='text-[10px]'>
        {sections.length}
      </Badge>
    </div>
    {sections.length === 0 ? (
      <div className='py-2 text-xs text-muted-foreground'>No sections for this subject.</div>
    ) : (
      <div className='space-y-1.5'>
        {sections.map((section, idx) => (
          <SectionRow
            key={section.id}
            section={section}
            isExpanded={expandedSectionId === section.id}
            onToggleExpand={() => onToggleExpand(expandedSectionId === section.id ? null : section.id)}
            onMoveUp={() => void onMoveUp(idx, section)}
            onMoveDown={() => void onMoveDown(idx, section)}
            onToggleEnabled={() => void onToggleEnabled(section)}
            onEdit={() => onEdit(section)}
            onDelete={() => onDelete(section)}
            onAddSubsection={() => onAddSubsection(section)}
            onEditSubsection={(sub) => onEditSubsection(section, sub)}
            onDeleteSubsection={(subId) => onDeleteSubsection(section, subId)}
            isFirst={idx === 0}
            isLast={idx === sections.length - 1}
            isSaving={isSaving}
          />
        ))}
      </div>
    )}
  </div>
);
