import { Button, Badge } from '@/shared/ui/primitives.public';
import { Eye, EyeOff, Undo2, Redo2 } from 'lucide-react';

export function PreviewToolbar({
  isViewing,
  onToggleViewing,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onPreview,
  isSaving,
}: any) {
  return (
    <div className='flex items-center justify-end gap-2 px-6 py-3 border-b border-border'>
      <Button size='xs' variant='outline' onClick={onToggleViewing}>
        {isViewing ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </Button>
      {!isViewing && (
        <>
          <Button size='icon' variant='ghost' onClick={onUndo} disabled={!canUndo}><Undo2 className='size-4' /></Button>
          <Button size='icon' variant='ghost' onClick={onRedo} disabled={!canRedo}><Redo2 className='size-4' /></Button>
          <Button size='sm' onClick={onPreview}>Preview</Button>
          <Button size='sm' variant='solid' onClick={onSave} disabled={isSaving}>Save</Button>
        </>
      )}
    </div>
  );
}
