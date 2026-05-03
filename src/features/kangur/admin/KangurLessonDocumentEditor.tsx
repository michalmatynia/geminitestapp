'use client';

import React from 'react';
import { cn } from '@/features/kangur/shared/utils';
import { KANGUR_GRID_ROOMY_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurLessonEditorController } from './document-editor/useKangurLessonEditorController';
import { LessonPagesPanel } from './document-editor/LessonPagesPanel';
import { LessonWorkspace } from './document-editor/LessonWorkspace';
import { KangurLessonPreviewPanel } from './components/KangurLessonPreviewPanel';

export function KangurLessonDocumentEditor(): React.JSX.Element {
  const controller = useKangurLessonEditorController();

  return (
    <div className={cn(KANGUR_GRID_ROOMY_CLASSNAME, 'xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]')}>
      <div className='space-y-4'>
        <LessonPagesPanel controller={controller} />
        <LessonWorkspace controller={controller} />
      </div>
      <KangurLessonPreviewPanel document={controller.mutations.value} activePageId={controller.activePageId} />
    </div>
  );
}

export default KangurLessonDocumentEditor;
