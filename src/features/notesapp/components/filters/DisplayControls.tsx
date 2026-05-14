import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/shared/ui/primitives.public';

export const DisplayControls = ({
  showTimestamps,
  showBreadcrumbs,
  showRelatedNotes,
  onUpdate,
}: {
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  onUpdate: (settings: { showTimestamps?: boolean; showBreadcrumbs?: boolean; showRelatedNotes?: boolean }) => void;
}): React.JSX.Element => (
  <div className='flex items-center gap-1.5'>
    <span className='text-sm font-medium text-gray-400'>Display:</span>
    <DisplayToggle
      label='Toggle timestamps'
      isActive={showTimestamps}
      onToggle={() => onUpdate({ showTimestamps: !showTimestamps })}
    />
    <DisplayToggle
      label='Toggle breadcrumbs'
      isActive={showBreadcrumbs}
      onToggle={() => onUpdate({ showBreadcrumbs: !showBreadcrumbs })}
    />
    <DisplayToggle
      label='Toggle related notes'
      isActive={showRelatedNotes}
      onToggle={() => onUpdate({ showRelatedNotes: !showRelatedNotes })}
    />
  </div>
);

const DisplayToggle = ({
  label,
  isActive,
  onToggle,
}: {
  label: string;
  isActive: boolean;
  onToggle: () => void;
}) => (
  <Button
    variant={isActive ? 'default' : 'outline'}
    onClick={onToggle}
    className='h-8 gap-1 px-2'
    title={label}
    aria-label={label}
  >
    {isActive ? <Eye size={14} /> : <EyeOff size={14} />}
  </Button>
);
