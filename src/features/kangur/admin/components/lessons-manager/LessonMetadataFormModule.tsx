'use client';

import type { JSX } from 'react';
import { LessonMetadataForm } from '../LessonMetadataForm';

interface MetadataFormModuleProps {
  lesson: any;
  onUpdate: (data: any) => void;
  isSaving: boolean;
}

export function MetadataFormModule({ lesson, onUpdate, isSaving }: MetadataFormModuleProps): JSX.Element {
  return (
    <div className='p-4 border-white/10 bg-card/30 rounded-lg'>
      <h3 className='text-sm font-semibold text-white mb-4'>Lesson Metadata</h3>
      <LessonMetadataForm
        lesson={lesson}
        onUpdate={onUpdate}
        isSaving={isSaving}
      />
    </div>
  );
}
