import React from 'react';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/utils/ui-utils';
import { type KangurLessonSection, type KangurLessonSubsection } from '@/features/kangur/shared/contracts/kangur';

type RowButtonProps = {
  onClick: () => void;
  disabled: boolean;
  title: string;
  icon: React.ElementType;
  className?: string;
};

const RowButton: React.FC<RowButtonProps> = ({ onClick, disabled, title, icon: Icon, className }) => (
  <Button
    type='button'
    size='icon'
    variant='outline'
    className={cn(
      'h-7 w-7 rounded-lg border-border/60 bg-background/60 text-muted-foreground hover:bg-card/80 hover:text-foreground',
      className
    )}
    disabled={disabled}
    onClick={onClick}
    title={title}
  >
    <Icon className='size-3.5' />
  </Button>
);

const SubsectionRow: React.FC<{
  sub: KangurLessonSubsection;
  onEdit: () => void;
  onDelete: () => void;
  isSaving: boolean;
}> = ({ sub, onEdit, onDelete, isSaving }) => (
  <div className='flex items-center gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-1.5'>
    <div className='min-w-0 flex-1'>
      <div className='flex items-center gap-2'>
        <span className='text-xs font-medium text-foreground'>{sub.label}</span>
        <Badge variant='outline' className='text-[9px]'>{sub.typeLabel}</Badge>
        {sub.enabled !== true ? <Badge variant='secondary' className='text-[9px]'>Off</Badge> : null}
      </div>
      <div className='text-[10px] text-muted-foreground'>{sub.componentIds.length} lessons</div>
    </div>
    <RowButton icon={Pencil} onClick={onEdit} disabled={isSaving} title='Edit subsection' />
    <RowButton icon={Trash2} onClick={onDelete} disabled={isSaving} title='Delete subsection' className='hover:border-red-400/60 hover:text-red-500' />
  </div>
);

type SectionRowProps = {
  section: KangurLessonSection;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleEnabled: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubsection: () => void;
  onEditSubsection: (sub: KangurLessonSubsection) => void;
  onDeleteSubsection: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
  isSaving: boolean;
};

export const SectionRow: React.FC<SectionRowProps> = ({
  section,
  isExpanded,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onToggleEnabled,
  onEdit,
  onDelete,
  onAddSubsection,
  onEditSubsection,
  onDeleteSubsection,
  isFirst,
  isLast,
  isSaving,
}) => {
  const isEnabled = Boolean(section.enabled);

  return (
    <div className='rounded-xl border border-border/60 bg-card/40'>
      <div className='flex items-center gap-2 px-3 py-2'>
        <button type='button' className='shrink-0 p-1 text-muted-foreground hover:text-foreground' onClick={onToggleExpand}>
          <ChevronDown className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} />
        </button>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            {section.emoji ? <span className='text-sm'>{section.emoji}</span> : null}
            <span className='text-sm font-semibold text-foreground'>{section.label}</span>
            <Badge variant='outline' className='text-[10px]'>{section.typeLabel}</Badge>
            {!isEnabled ? <Badge variant='secondary' className='text-[10px]'>Disabled</Badge> : null}
          </div>
        </div>
        <div className='flex items-center gap-1'>
          <RowButton icon={ArrowUp} onClick={onMoveUp} disabled={isSaving || isFirst} title='Move up' />
          <RowButton icon={ArrowDown} onClick={onMoveDown} disabled={isSaving || isLast} title='Move down' />
          <RowButton icon={isEnabled ? Eye : EyeOff} onClick={onToggleEnabled} disabled={isSaving} title={isEnabled ? 'Disable' : 'Enable'} />
          <RowButton icon={Pencil} onClick={onEdit} disabled={isSaving} title='Edit' />
          <RowButton icon={Trash2} onClick={onDelete} disabled={isSaving} title='Delete' className='hover:border-red-400/60 hover:text-red-500' />
        </div>
      </div>
      {isExpanded && (
        <div className='border-t border-border/40 px-4 py-3'>
          <div className='mb-2 flex items-center justify-between'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>Subsections</div>
            <Button type='button' size='sm' variant='outline' className='h-7 rounded-lg px-2.5 text-[11px]' disabled={isSaving} onClick={onAddSubsection}>
              <Plus className='mr-1 size-3' /> Add subsection
            </Button>
          </div>
          <div className='space-y-1.5'>
            {[...section.subsections].sort((a, b) => a.sortOrder - b.sortOrder).map((sub) => (
              <SubsectionRow key={sub.id} sub={sub} onEdit={() => onEditSubsection(sub)} onDelete={() => onDeleteSubsection(sub.id)} isSaving={isSaving} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
