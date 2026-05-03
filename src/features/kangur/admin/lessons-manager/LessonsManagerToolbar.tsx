import { KangurButton, Badge } from '@/features/kangur/ui/design/primitives';

export function LessonsManagerToolbar({ state, onToggleMode, onCanonicalize }: { state: any; onToggleMode: () => void; onCanonicalize: () => void }) {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <KangurButton variant='surface' size='sm' onClick={onToggleMode}>
          Mode: {state.treeMode.toUpperCase()}
        </KangurButton>
        {state.legacyImportCount > 0 && <Badge variant='warning'>{state.legacyImportCount} Legacy</Badge>}
      </div>
      <div className='flex items-center gap-2'>
        <KangurButton variant='ghost' size='sm' onClick={onCanonicalize}>Canonicalize</KangurButton>
      </div>
    </div>
  );
}
