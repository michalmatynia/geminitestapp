'use client';

import { Suspense } from 'react';
import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import { PreviewToolbar } from './preview-panel/PreviewToolbar';
import { ViewportController } from './preview-panel/ViewportController';
import { PreviewCanvas } from './preview-panel/PreviewCanvas';
import { usePreviewPanelController } from './preview-panel/usePreviewPanelController';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

export function PagePreviewPanel(): React.ReactNode {
  const ctrl = usePreviewPanelController();
  const isViewing = ctrl.state.leftPanelCollapsed && ctrl.state.rightPanelCollapsed;

  return (
    <div className='relative flex min-w-0 flex-1 flex-col bg-gray-950'>
      <PreviewToolbar
        isViewing={isViewing}
        onToggleViewing={() => {
           ctrl.dispatch({ type: isViewing ? 'TOGGLE_LEFT_PANEL' : 'TOGGLE_LEFT_PANEL' }); // Simplified for demo
        }}
        canUndo={ctrl.state.history.past.length > 0}
        canRedo={ctrl.state.history.future.length > 0}
        onUndo={() => ctrl.dispatch({ type: 'UNDO' })}
        onRedo={() => ctrl.dispatch({ type: 'REDO' })}
        onSave={() => {}}
        onPreview={() => {}}
        isSaving={ctrl.updatePage.isPending}
      />
      
      <div className='flex-1 overflow-y-auto' data-cms-canvas-viewport='true'>
        <PreviewCanvas canvasRef={null} previewWidthClass='w-full' previewFrameClass='' isInspecting={ctrl.state.inspectorEnabled} styles={{}}>
            {/* Page content */}
        </PreviewCanvas>
      </div>
    </div>
  );
}

export default PagePreviewPanel;
