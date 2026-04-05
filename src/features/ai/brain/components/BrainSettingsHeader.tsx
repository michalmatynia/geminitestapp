'use client';

import { Brain } from 'lucide-react';

import { Button } from '@/shared/ui/primitives.public';
import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

import { useBrain } from '../context/BrainContext';

export function BrainSettingsHeader(): React.JSX.Element {
  const { handleReset, handleSave, saving } = useBrain();

  return (
    <SectionHeader
      eyebrow='System'
      title='Brain'
      icon={<Brain className='size-5 text-emerald-300' />}
      description='Unified control center for AI routing, provider keys, report schedules, prompt steering, and deep metrics.'
      actions={
        <>
          <Button variant='outline' size='sm' onClick={handleReset}>
            Reset
          </Button>
          <Button size='sm' onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    />
  );
}
