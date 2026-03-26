// Public client-safe API for the Viewer3D feature
export { Viewer3D } from './Viewer3DClient';

export type { Viewer3DProps, LightingPreset, EnvironmentPreset } from './components/Viewer3D';
export { Asset3DUploader } from './components/Asset3DUploader';
export { Asset3DPreviewModal } from './components/Asset3DPreviewModalImpl';
export { Asset3DCard } from './components/Asset3DCard';
export { Asset3DEditModal } from './components/Asset3DEditModalImpl';
export * from './context/Viewer3DContext';
export * from './hooks/useAsset3dQueries';
export * from './api';
export * from '@/shared/contracts/viewer3d';
