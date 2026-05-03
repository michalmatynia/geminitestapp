'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Html } from '@react-three/drei';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const FALLBACK_TEXTURE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

interface Model3DProps {
  url: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  enableShadows: boolean;
}

function optimizeMaterials(scene: THREE.Group, enableShadows: boolean): void {
  scene.traverse((child: THREE.Object3D) => {
    if (child instanceof THREE.Mesh) {
      // eslint-disable-next-line no-param-reassign
      child.castShadow = enableShadows;
      // eslint-disable-next-line no-param-reassign
      child.receiveShadow = enableShadows;

      if (child.material instanceof THREE.MeshStandardMaterial) {
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

export function Model3D(props: Model3DProps): React.JSX.Element | null {
  const { url, onLoad, onError, position, rotation, scale, enableShadows } = props;

  const replacedTextureRef = useRef(false);
  const { scene } = useGLTF(url, true, true, (loader: THREE.Loader) => {
    const manager = (loader as THREE.Loader & { manager: THREE.LoadingManager }).manager;
    manager.setURLModifier((resourceUrl: string) => {
      if (resourceUrl.startsWith('blob:')) {
        replacedTextureRef.current = true;
        return FALLBACK_TEXTURE_DATA_URL;
      }
      return resourceUrl;
    });
  });
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // scene is always defined after suspension
    if (replacedTextureRef.current) {
      logClientError(new Error('Model references blob: textures'), {
        context: {
          source: 'Viewer3D',
          action: 'loadScene',
          message: 'Model references blob: textures. Re-export as .glb or embed textures to restore materials.',
          level: 'warn',
        },
      });
    }
    optimizeMaterials(scene, enableShadows);
    onLoad?.();
  }, [scene, onLoad, enableShadows]);

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
