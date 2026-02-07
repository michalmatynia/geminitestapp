// Public client-safe API for the Viewer3D feature
export { Viewer3D, preloadModel } from './components/Viewer3D';
export type { Viewer3DProps, LightingPreset, EnvironmentPreset } from './components/Viewer3D';
export { Asset3DUploader } from './components/Asset3DUploader';
export { Asset3DPreviewModal } from './components/Asset3DPreviewModal';
export { Asset3DCard } from './components/Asset3DCard';
export { Asset3DEditModal } from './components/Asset3DEditModal';
export { DitheringPass, DitheringEffectImpl } from './components/shaders/DitheringEffect';
export { Admin3DAssetsPage } from './pages/Admin3DAssetsPage';
export { Asset3DListPage } from './pages/Asset3DListPage';
export * from './context/Viewer3DContext';
export * from './api';
export * from './types';
