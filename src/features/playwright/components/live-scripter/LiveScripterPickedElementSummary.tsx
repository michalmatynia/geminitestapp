'use client';

import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';
import { Badge } from '@/shared/ui/primitives.public';

export function LiveScripterPickedElementSummary({
  pickedElement,
}: {
  pickedElement: LiveScripterPickedElement;
}): React.JSX.Element {
  return (
    <div className='rounded-md border border-white/10 bg-black/20 p-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Badge variant='outline'>{pickedElement.tag}</Badge>
        {typeof pickedElement.role === 'string' && pickedElement.role.length > 0 ? (
          <Badge variant='outline'>{pickedElement.role}</Badge>
        ) : null}
        {typeof pickedElement.id === 'string' && pickedElement.id.length > 0 ? (
          <Badge variant='outline'>#{pickedElement.id}</Badge>
        ) : null}
      </div>
      {typeof pickedElement.textPreview === 'string' && pickedElement.textPreview.length > 0 ? (
        <div className='mt-2 text-sm text-muted-foreground'>{pickedElement.textPreview}</div>
      ) : null}
    </div>
  );
}
