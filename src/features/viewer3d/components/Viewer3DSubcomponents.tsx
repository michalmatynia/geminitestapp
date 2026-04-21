'use client';

import React, { Component, useEffect, useRef, type ErrorInfo } from 'react';
import type * as THREE from 'three';
import { Html, useProgress } from '@react-three/drei';
import { useFrame, useThree, type RootState } from '@react-three/fiber';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { getLastUserAction } from '@/shared/utils/observability/user-action-tracker';
import type { Asset3dLightingPreset } from '@/shared/contracts/viewer3d';

export type LightingPreset = Asset3dLightingPreset;

// Error Boundary for 3D components
export class Model3DErrorBoundary extends Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logClientError(error, {
      componentStack: errorInfo.componentStack,
      context: {
        source: 'Viewer3D-error-boundary',
        lastUserAction: getLastUserAction(),
        route: typeof window !== 'undefined' ? window.location.pathname : null,
      },
    });
    this.props.onError?.(error);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message;
      return (
        <Html center>
          <div className='text-red-400 text-center p-4 bg-black/50 rounded'>
            <p>Failed to load 3D model</p>
            <p className='text-sm text-gray-400 mt-2'>
              {errorMsg !== undefined && errorMsg !== '' ? errorMsg : 'Unknown error occurred'}
            </p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

// Loading progress component
export function Loader(): React.JSX.Element {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className='flex flex-col items-center gap-3'>
        <div className='relative h-16 w-16'>
          <svg className='h-16 w-16 -rotate-90' viewBox='0 0 36 36'>
            <circle
              cx='18'
              cy='18'
              r='16'
              fill='none'
              className='stroke-gray-700'
              strokeWidth='2'
            />
            <circle
              cx='18'
              cy='18'
              r='16'
              fill='none'
              className='stroke-blue-500'
              strokeWidth='2'
              strokeDasharray={100}
              strokeDashoffset={100 - progress}
              strokeLinecap='round'
            />
          </svg>
          <span className='absolute inset-0 flex items-center justify-center text-xs font-medium text-white'>
            {Math.round(progress)}%
          </span>
        </div>
        <span className='text-sm text-gray-400'>Loading model...</span>
      </div>
    </Html>
  );
}

export function AutoRotateGroup(props: {
  children: React.ReactNode;
  autoRotate: boolean;
  autoRotateSpeed: number;
}): React.JSX.Element {
  const { children, autoRotate, autoRotateSpeed } = props;

  const ref = useRef<THREE.Group>(null);
  useFrame((_state: RootState, delta: number) => {
    if (!autoRotate || !ref.current) return;
    ref.current.rotation.y += delta * autoRotateSpeed * 0.6;
  });
  return <group ref={ref}>{children}</group>;
}

// Ground plane with realistic shadows
export function Ground(props: { showGround: boolean }): React.JSX.Element | null {
  const { showGround } = props;

  if (!showGround) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <shadowMaterial transparent opacity={0.4} />
    </mesh>
  );
}

// Scene lighting setup
export function SceneLighting(props: { preset: LightingPreset; intensity: number }): React.JSX.Element {
  const { preset, intensity } = props;

  const lightConfigs = {
    studio: {
      ambient: 0.4,
      main: { position: [5, 5, 5] as [number, number, number], intensity: 1.2 },
      fill: { position: [-5, 3, -5] as [number, number, number], intensity: 0.5 },
      rim: { position: [0, 5, -10] as [number, number, number], intensity: 0.8 },
    },
    outdoor: {
      ambient: 0.3,
      main: { position: [10, 10, 5] as [number, number, number], intensity: 1.5 },
      fill: { position: [-5, 2, 5] as [number, number, number], intensity: 0.3 },
      rim: { position: [0, 8, -8] as [number, number, number], intensity: 0.4 },
    },
    dramatic: {
      ambient: 0.15,
      main: { position: [3, 8, 3] as [number, number, number], intensity: 2 },
      fill: { position: [-8, 2, -3] as [number, number, number], intensity: 0.2 },
      rim: { position: [-3, 5, -8] as [number, number, number], intensity: 1.2 },
    },
    soft: {
      ambient: 0.6,
      main: { position: [5, 5, 5] as [number, number, number], intensity: 0.8 },
      fill: { position: [-5, 5, 5] as [number, number, number], intensity: 0.6 },
      rim: { position: [0, 3, -5] as [number, number, number], intensity: 0.4 },
    },
  };

  const config = lightConfigs[preset] || lightConfigs.studio;

  return (
    <>
      <ambientLight intensity={config.ambient * intensity} />
      <directionalLight
        position={config.main.position}
        intensity={config.main.intensity * intensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0001}
      />
      <directionalLight
        position={config.fill.position}
        intensity={config.fill.intensity * intensity}
      />
      <directionalLight
        position={config.rim.position}
        intensity={config.rim.intensity * intensity}
      />
    </>
  );
}

export function ScreenshotCapture(props: {
  captureRef: React.MutableRefObject<(() => string | null) | null>;
}): React.JSX.Element | null {
  const { captureRef } = props;

  const { gl } = useThree();
  useEffect(() => {
     
    captureRef.current = (): string | null => {
      try {
        return (gl as THREE.WebGLRenderer).domElement.toDataURL('image/png');
      } catch (error) {
        logClientError(error as Error);
        return null;
      }
    };
    return (): void => {
      if (captureRef.current) {
         
        captureRef.current = null;
      }
    };
  }, [captureRef, gl]);
  return null;
}
