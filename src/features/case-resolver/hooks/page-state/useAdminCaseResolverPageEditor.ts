import { useCaseResolverState } from '../useCaseResolverState';

export function useAdminCaseResolverPageEditor() {
  const state = useCaseResolverState();

  return {
    selectedFileId: state.selectedFileId,
    selectedAssetId: state.selectedAssetId,
    setSelectedFileId: state.setSelectedFileId,
    setSelectedAssetId: state.setSelectedAssetId,
    editingDocumentDraft: state.editingDocumentDraft,
    editingDocumentNodeContext: state.editingDocumentNodeContext,
    setEditingDocumentDraft: state.setEditingDocumentDraft,
    handleUploadScanFiles: state.handleUploadScanFiles,
    handleRunScanFileOcr: state.handleRunScanFileOcr,
    handleOpenFileEditor: state.handleOpenFileEditor,
    handleDiscardFileEditorDraft: state.handleDiscardFileEditorDraft,
  };
}
