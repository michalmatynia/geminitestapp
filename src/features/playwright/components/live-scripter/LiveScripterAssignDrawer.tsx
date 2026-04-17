'use client';

import type { SelectorRegistryNamespace } from '@/shared/contracts/integrations/selector-registry';
import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';

import { LiveScripterAssignDrawerForm } from './LiveScripterAssignDrawerForm';
import { useLiveScripterAssignDrawerModel } from './useLiveScripterAssignDrawerModel';

type Props = {
  pickedElement: LiveScripterPickedElement | null;
  websiteId: string | null;
  flowId: string | null;
  initialRegistryNamespace?: SelectorRegistryNamespace;
  onStepAppended: () => void;
};

export function LiveScripterAssignDrawer({
  pickedElement,
  websiteId,
  flowId,
  initialRegistryNamespace = 'tradera',
  onStepAppended,
}: Props): React.JSX.Element {
  const model = useLiveScripterAssignDrawerModel({
    pickedElement,
    websiteId,
    flowId,
    initialRegistryNamespace,
    onStepAppended,
  });

  return (
    <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
      <div className='space-y-1'>
        <h2 className='text-sm font-semibold'>Assign Step</h2>
        <p className='text-xs text-muted-foreground'>
          Pick an element from the live preview and append a real sequencer step bound to that
          selector.
        </p>
      </div>

      {pickedElement === null ? (
        <div className='rounded-md border border-dashed border-white/10 p-4 text-sm text-muted-foreground'>
          Switch to Pick mode and click an element in the live preview.
        </div>
      ) : (
        <LiveScripterAssignDrawerForm pickedElement={pickedElement} model={model} />
      )}
    </div>
  );
}
