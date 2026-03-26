// Public client-safe API for the Viewer3D feature
export { Viewer3D } from './Viewer3DClient';

export type { Viewer3DProps, LightingPreset, EnvironmentPreset } from './components/Viewer3D';
export { Asset3DPreviewModal } from './components/Asset3DPreviewModalImpl';
export { Admin3DAssetsPage } from './pages/Admin3DAssetsPage';
export { Asset3DListPage } from './pages/Asset3DListPage';
export {
  useAsset3DById,
  useAsset3DCategories,
  useAsset3DTags,
  useAssets3D,
} from './hooks/useAsset3dQueries';
