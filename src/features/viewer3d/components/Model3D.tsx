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

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Html } from '@react-three/drei';
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
}

/**
 * Optimizes materials in the loaded 3D scene
 * Applies shadow settings and adjusts material properties for better rendering
 * 
 * @param scene - The Three.js scene/group containing the model
 * @param enableShadows - Whether to enable shadow casting and receiving
 */
function optimizeMaterials(scene: THREE.Group, enableShadows: boolean): void {
  // Traverse all objects in the scene hierarchy
  scene.traverse((child: THREE.Object3D) => {
    // Only process mesh objects
    if (child instanceof THREE.Mesh) {
      // Configure shadow rendering
      // eslint-disable-next-line no-param-reassign
      child.castShadow = enableShadows;
      // eslint-disable-next-line no-param-reassign
      child.receiveShadow = enableShadows;

      // Optimize standard materials
      if (child.material instanceof THREE.MeshStandardMaterial) {
        // Adjust environment map intensity for better lighting
        if (child.material.envMapIntensity !== 1.5) {
          // eslint-disable-next-line no-param-reassign
          child.material.envMapIntensity = 1.5;
          // eslint-disable-next-line no-param-reassign
          child.material.needsUpdate = true;
        }
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
export function Model3D(props: Model3DProps): React.JSX.Element | null {
  const { url, onLoad, onError, position, rotation, scale, enableShadows } = props;

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
    // Apply material optimizations
    optimizeMaterials(scene, enableShadows);
    onLoad?.();
  }, [scene, onLoad, enableShadows]);

  // Handle loading errors
  useEffect(() => {
    // scene is always defined after suspension, but we keep this for type safety in case of unexpected useGLTF behavior
    if (!scene && onError !== undefined) {
      onError(new Error('Failed to load model'));
    }
  }, [scene, onError]);

  if (!scene) {
    return (
      <Html center>
        <div className='text-red-400 text-center p-4 bg-black/50 rounded'>
          <p>Model not found</p>
          <p className='text-sm text-gray-400 mt-2'>The 3D asset could not be loaded</p>
        </div>
      </Html>
    );
  }

  return (
    <primitive
      ref={modelRef}
      object={scene}
      dispose={null}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}
