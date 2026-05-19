/**
 * 3D Model Component
 * 
 * React Three Fiber component for rendering 3D models (GLTF/GLB format).
 * Handles:
 * - Model loading and error handling
 * - Material optimization for performance
 * - Shadow rendering configuration
 * - Texture fallback for blob: references
 * - Position, rotation, and scale transformations
 * - Loading callbacks and error reporting
 * 
 * Client-side component using Three.js and React Three Fiber
 */

'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';

import type { Asset3dRenderMode } from '@/shared/contracts/viewer3d';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

/**
 * Fallback texture for models with broken blob: references
 * Uses a minimal 1x1 transparent PNG to prevent rendering errors
 */
const FALLBACK_TEXTURE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

/**
 * Props for the Model3D component
 */
interface Model3DProps {
  /** URL to the GLTF/GLB model file */
  url: string;
  /** Callback when model finishes loading */
  onLoad?: () => void;
  /** Callback if model fails to load */
  onError?: (error: Error) => void;
  /** Position in 3D space [x, y, z] */
  position?: [number, number, number];
  /** Rotation in radians [x, y, z] */
  rotation?: [number, number, number];
  /** Scale factor (uniform or per-axis) */
  scale?: number | [number, number, number];
  /** Whether to enable shadow rendering */
  enableShadows: boolean;
  /** Material/render mode for inspecting the model */
  renderMode: Asset3dRenderMode;
}

type MeshMaterial = THREE.Material | THREE.Material[];
type ViewerMesh = THREE.Mesh<THREE.BufferGeometry, MeshMaterial>;

type ViewerMeshUserData = THREE.Object3D['userData'] & {
  viewer3dOriginalMaterial?: MeshMaterial;
  viewer3dOverrideMaterial?: MeshMaterial;
  viewer3dEdgeLines?: THREE.LineSegments;
};

const getViewerMeshUserData = (mesh: ViewerMesh): ViewerMeshUserData =>
  mesh.userData as ViewerMeshUserData;

const forEachMaterial = (material: MeshMaterial, callback: (item: THREE.Material) => void): void => {
  if (Array.isArray(material)) {
    material.forEach(callback);
    return;
  }
  callback(material);
};

const disposeMaterial = (material: MeshMaterial | undefined): void => {
  if (material === undefined) return;
  forEachMaterial(material, (item) => item.dispose());
};

function optimizeMaterial(inputMaterial: THREE.Material): void {
  if (inputMaterial instanceof THREE.MeshStandardMaterial && inputMaterial.envMapIntensity !== 1.5) {
    const material = inputMaterial;
    material.envMapIntensity = 1.5;
    material.needsUpdate = true;
  }
}

const EDGES_LINE_COLOR = new THREE.Color('#7dd3fc');
const FLAT_EDGES_LINE_COLOR = new THREE.Color('#334155');
const EDGES_THRESHOLD_DEGREES = 15;

function removeEdgeLines(mesh: ViewerMesh, userData: ViewerMeshUserData): void {
  if (userData.viewer3dEdgeLines === undefined) return;
  mesh.remove(userData.viewer3dEdgeLines);
  userData.viewer3dEdgeLines.geometry.dispose();
  (userData.viewer3dEdgeLines.material as THREE.Material).dispose();
  userData.viewer3dEdgeLines = undefined;
}

function createEdgeLines(mesh: ViewerMesh, color: THREE.Color = EDGES_LINE_COLOR): THREE.LineSegments {
  const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry, EDGES_THRESHOLD_DEGREES);
  const edgesMaterial = new THREE.LineBasicMaterial({ color });
  return new THREE.LineSegments(edgesGeometry, edgesMaterial);
}

function createRenderModeMaterial(renderMode: Asset3dRenderMode): THREE.Material | null {
  if (renderMode === 'solid') {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dce3ef'),
      roughness: 0.72,
      metalness: 0.02,
    });
  }

  if (renderMode === 'wireframe') {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#f8fafc'),
      wireframe: true,
    });
  }

  if (renderMode === 'flat') {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#dce3ef'),
      roughness: 0.72,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  }

  return null;
}

/**
 * Optimizes materials in the loaded 3D scene
 * Applies shadow settings and adjusts material properties for better rendering
 * 
 * @param scene - The Three.js scene/group containing the model
 * @param enableShadows - Whether to enable shadow casting and receiving
 * @param renderMode - Material mode used for model inspection
 */
function applyMaterialMode(
  scene: THREE.Group,
  enableShadows: boolean,
  renderMode: Asset3dRenderMode
): void {
  // Traverse all objects in the scene hierarchy
  scene.traverse((child: THREE.Object3D) => {
    // Only process mesh objects (LineSegments children are skipped)
    if (child instanceof THREE.Mesh) {
      const mesh = child as ViewerMesh;
      const userData = getViewerMeshUserData(mesh);

      userData.viewer3dOriginalMaterial ??= mesh.material;

      // Configure shadow rendering
      mesh.castShadow = enableShadows;
      mesh.receiveShadow = enableShadows;

      // Always remove stale edge lines before applying the current mode
      removeEdgeLines(mesh, userData);

      if (renderMode === 'edges') {
        // Transparent mesh faces so only the LineSegments edges are visible
        disposeMaterial(userData.viewer3dOverrideMaterial);
        const transparentMaterial = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        });
        mesh.material = transparentMaterial;
        userData.viewer3dOverrideMaterial = transparentMaterial;

        const lineSegments = createEdgeLines(mesh);
        userData.viewer3dEdgeLines = lineSegments;
        mesh.add(lineSegments);
        return;
      }

      const overrideMaterial = createRenderModeMaterial(renderMode);
      disposeMaterial(userData.viewer3dOverrideMaterial);
      userData.viewer3dOverrideMaterial = undefined;

      if (overrideMaterial === null) {
        mesh.material = userData.viewer3dOriginalMaterial;
        forEachMaterial(mesh.material, optimizeMaterial);
        return;
      }

      mesh.material = overrideMaterial;
      userData.viewer3dOverrideMaterial = overrideMaterial;

      if (renderMode === 'flat') {
        const lineSegments = createEdgeLines(mesh, FLAT_EDGES_LINE_COLOR);
        userData.viewer3dEdgeLines = lineSegments;
        mesh.add(lineSegments);
      }
    }
  });
}

function restoreMaterialMode(scene: THREE.Group): void {
  scene.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      const mesh = child as ViewerMesh;
      const userData = getViewerMeshUserData(mesh);
      removeEdgeLines(mesh, userData);
      disposeMaterial(userData.viewer3dOverrideMaterial);
      userData.viewer3dOverrideMaterial = undefined;
      if (userData.viewer3dOriginalMaterial !== undefined) {
        mesh.material = userData.viewer3dOriginalMaterial;
        userData.viewer3dOriginalMaterial = undefined;
      }
    }
  });
}

/**
 * Renders a 3D model using React Three Fiber
 * Handles loading, optimization, and error states
 * 
 * @param props - Component props
 * @returns JSX element or null if model fails to load
 */
export function Model3D(props: Model3DProps): React.JSX.Element {
  const { url, onLoad, position, rotation, scale, enableShadows, renderMode } = props;

  // Track if we've replaced blob: textures with fallback
  const replacedTextureRef = useRef(false);
  
  // Load the GLTF model with texture URL modifier
  const { scene } = useGLTF(url, true, true, (loader: THREE.Loader) => {
    // Intercept texture loading to handle blob: references
    const manager = (loader as THREE.Loader & { manager: THREE.LoadingManager }).manager;
    manager.setURLModifier((resourceUrl: string) => {
      // Replace blob: URLs with fallback texture
      if (resourceUrl.startsWith('blob:')) {
        replacedTextureRef.current = true;
        return FALLBACK_TEXTURE_DATA_URL;
      }
      return resourceUrl;
    });
  });
  
  const modelRef = useRef<THREE.Group>(null);
  const modelScene = useMemo(() => scene.clone(true), [scene]);

  // Optimize materials and handle blob texture warnings
  useEffect(() => {
    // scene is always defined after suspension
    if (replacedTextureRef.current) {
      // Log warning about blob textures
      logClientError(new Error('Model references blob: textures'), {
        context: {
          source: 'Viewer3D',
          action: 'loadScene',
          message: 'Model references blob: textures. Re-export as .glb or embed textures to restore materials.',
          level: 'warn',
        },
      });
    }
    // Apply material optimizations and inspection overrides
    applyMaterialMode(modelScene, enableShadows, renderMode);
    onLoad?.();
    return () => restoreMaterialMode(modelScene);
  }, [modelScene, onLoad, enableShadows, renderMode]);

  return (
    <primitive
      ref={modelRef}
      object={modelScene}
      dispose={null}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
