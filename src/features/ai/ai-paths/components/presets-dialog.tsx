'use client';

import type { ClusterPreset } from '@/shared/contracts/ai-paths';
import type { ModalStateProps } from '@/shared/contracts/ui';
import {
  Button,
  Textarea,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

interface PresetsDialogProps extends ModalStateProps {
  presetsJson: string;
  setPresetsJson: (value: string) => void;
  clusterPresets: ClusterPreset[];
  onImport: (mode: 'merge' | 'replace') => Promise<void>;
  onCopyJson: (value: string) => void;
}

export function PresetsDialog({
  isOpen,
  onClose,
  presetsJson,
  setPresetsJson,
  clusterPresets,
  onImport,
  onCopyJson,
}: PresetsDialogProps): React.JSX.Element {
  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Export / Import Presets'
      subtitle='Share Cluster Presets as JSON across projects.'
      size='md'
    >
      <div className='space-y-4'>
        <Textarea
          className='min-h-[240px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={presetsJson}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
            setPresetsJson(event.target.value)
          }
        />
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => setPresetsJson(JSON.stringify(clusterPresets, null, 2))}
          >
            Load Export
          </Button>
          <Button
            type='button'
            variant='default'
            onClick={() => { void onImport('merge'); }}
          >
            Import (Merge)
          </Button>
          <Button
            type='button'
            variant='destructive'
            onClick={() => { void onImport('replace'); }}
          >
            Replace Existing
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              const value = presetsJson || JSON.stringify(clusterPresets, null, 2);
              onCopyJson(value);
            }}
          >
            Copy JSON
          </Button>
        </div>
      </div>
    </DetailModal>
  );
}
