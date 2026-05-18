import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/primitives.public';

interface PreviewSectionActionsProps {
  isHidden: boolean;
  onToggleSectionVisibility: () => void;
  onRemoveSection: () => void;
}

export function PreviewSectionActions({
  isHidden,
  onToggleSectionVisibility,
  onRemoveSection,
}: PreviewSectionActionsProps) {
  return (
    <div className="absolute right-2 top-2 z-20 flex gap-1 opacity-0 transition group-hover:opacity-100">
      <Button
        variant="ghost"
        size="xs"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSectionVisibility();
        }}
      >
        {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={(e) => {
          e.stopPropagation();
          onRemoveSection();
        }}
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
}
