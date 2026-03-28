// Keep the shared viewer3d barrel client-safe and graph-light. Admin pages import
// their route components directly so regular CMS/frontend consumers don't pull
// page-level modules into the same Turbopack resolution surface.
export { Viewer3D } from './Viewer3DClient';
export type { Viewer3DProps, LightingPreset, EnvironmentPreset } from './components/Viewer3D';
export { Asset3DUploader } from './components/Asset3DUploader';
export { Asset3DPreviewModal } from './components/Asset3DPreviewModalImpl';
export { Asset3DCard } from './components/Asset3DCard';
export { Asset3DEditModal } from './components/Asset3DEditModalImpl';
export * from './context/Viewer3DContext';
export {
  useAsset3DById,
  useAsset3DCategories,
  useAsset3DTags,
  useAssets3D,
} from './hooks/useAsset3dQueries';

export { default as Admin3DAssetsPage } from './pages/Admin3DAssetsPage';
export { default as Asset3DListPage } from './pages/Asset3DListPage';
export type { Asset3DRecord } from '@/shared/contracts/viewer3d';
