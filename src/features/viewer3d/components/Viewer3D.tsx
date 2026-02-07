
'use client';

import {
  OrbitControls,
  Center,
  useGLTF,
  Environment,
  Html,
  ContactShadows,
  useProgress,
  Bounds,
  PresentationControls,
} from '@react-three/drei';
import { Canvas, useFrame, useThree, type RootState } from '@react-three/fiber';
import { EffectComposer, Bloom, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode, BlendFunction } from 'postprocessing';
import { Suspense, useEffect, useRef, useMemo, Component, ErrorInfo } from 'react';
import * as THREE from 'three';

import { DitheringPass } from './shaders/DitheringEffect';
import { OrderedDitheringPass } from './shaders/OrderedDitheringEffect';
import { PixelationPass } from './shaders/PixelationEffect';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

const FALLBACK_TEXTURE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=';

// Error Boundary for 3D components
class Model3DErrorBoundary extends Component<
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
    console.error('3D Model Error:', error, errorInfo);
    logClientError(error, {
      componentStack: errorInfo.componentStack,
      context: { source: 'Viewer3D-error-boundary' },
    });
    this.props.onError?.(error);
  }

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Html center>
          <div className="text-red-400 text-center p-4 bg-black/50 rounded">
            <p>Failed to load 3D model</p>
            <p className="text-sm text-gray-400 mt-2">
              {this.state.error?.message || 'Unknown error occurred'}
            </p>
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}

// Loading progress component
function Loader(): React.JSX.Element {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-16 w-16">
          <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className="stroke-gray-700"
              strokeWidth="2"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              className="stroke-blue-500"
              strokeWidth="2"
              strokeDasharray={100}
              strokeDashoffset={100 - progress}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
            {Math.round(progress)}%
          </span>
        </div>
        <span className="text-sm text-gray-400">Loading model...</span>
      </div>
    </Html>
  );
}

// Enhanced model component with PBR material optimization
interface Model3DProps {
  url: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  castShadow?: boolean;
  receiveShadow?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

function AutoRotateGroup({
  enabled,
  speed,
  children,
}: {
  enabled: boolean;
  speed: number;
  children: React.ReactNode;
}): React.JSX.Element {
  const ref = useRef<THREE.Group>(null);
  useFrame((_state: RootState, delta: number) => {
    if (!enabled || !ref.current) return;
    ref.current.rotation.y += delta * speed * 0.6;
  });
  return <group ref={ref}>{children}</group>;
}

function Model3D({
  url,
  onLoad,
  onError,
  castShadow = true,
  receiveShadow = true,
  position,
  rotation,
  scale,
}: Model3DProps): React.JSX.Element | null {
  const replacedTextureRef = useRef(false);
  const { scene } = useGLTF(
    url,
    true,
    true,
    (loader: { manager: THREE.LoadingManager }) => {
      loader.manager.setURLModifier((resourceUrl: string) => {
        if (resourceUrl.startsWith('blob:')) {
          replacedTextureRef.current = true;
          return FALLBACK_TEXTURE_DATA_URL;
        }
        return resourceUrl;
      });
    }
  );
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (scene) {
      if (replacedTextureRef.current) {
        console.warn(
          '[Viewer3D] Model references blob: textures. Re-export as .glb or embed textures to restore materials.'
        );
      }
      // Optimize materials for PBR rendering
      scene.traverse((child: THREE.Object3D) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = castShadow;
          child.receiveShadow = receiveShadow;

          // Enhance material properties for better realism
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.envMapIntensity = 1.5;
            child.material.needsUpdate = true;
          }
        }
      });
      onLoad?.();
    }
  }, [scene, onLoad, castShadow, receiveShadow]);

  useEffect(() => {
    if (!scene && onError) {
      onError(new Error('Failed to load model'));
    }
  }, [scene, onError]);

  if (!scene) {
    return (
      <Html center>
        <div className="text-red-400 text-center p-4 bg-black/50 rounded">
          <p>Model not found</p>
          <p className="text-sm text-gray-400 mt-2">
            The 3D asset could not be loaded
          </p>
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

// Ground plane with realistic shadows
function Ground({ visible = true }: { visible?: boolean }): React.JSX.Element | null {
  if (!visible) return null;

  
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.001, 0]}
      receiveShadow
    >
      <planeGeometry args={[50, 50]} />
      <shadowMaterial
        transparent
        opacity={0.4}
      />
    </mesh>
  );
  
}

// Scene lighting setup
interface SceneLightingProps {
  preset: LightingPreset;
  intensity?: number;
}

function SceneLighting({ preset, intensity = 1 }: SceneLightingProps): React.JSX.Element {
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

// Camera auto-framing
export type LightingPreset = 'studio' | 'outdoor' | 'dramatic' | 'soft';
export type EnvironmentPreset = 'studio' | 'sunset' | 'dawn' | 'night' | 'warehouse' | 'forest' | 'apartment' | 'city' | 'park' | 'lobby';

export interface Viewer3DProps {
  /** URL to the 3D model file (.glb or .gltf) */
  modelUrl: string;
  /** Background color */
  backgroundColor?: string;
  /** Enable dithering post-processing effect */
  enableDithering?: boolean;
  /** Dithering intensity (0-2, default 1) */
  ditheringIntensity?: number;
  /** Enable ordered dithering shader */
  enableOrderedDithering?: boolean;
  /** Dither grid size (2-12, default 4) */
  orderedDitheringGridSize?: number;
  /** Dither pixel size ratio (0.5-3, default 1) */
  orderedDitheringPixelSizeRatio?: number;
  /** Dither grayscale only */
  orderedDitheringGrayscaleOnly?: boolean;
  /** Dither invert colors */
  orderedDitheringInvertColor?: boolean;
  /** Dither luminance method (0=Average, 1=Rec.601, 2=Rec.709, 3=Max) */
  orderedDitheringLuminanceMethod?: number;
  /** Enable pixelation (pixel art effect) */
  enablePixelation?: boolean;
  /** Pixel size in screen pixels (1-32, default 6) */
  pixelSize?: number;
  /** Container class name */
  className?: string;
  /** Callback when model loads */
  onLoad?: () => void;
  /** Callback on load error */
  onError?: (error: Error) => void;
  /** Enable auto-rotation */
  autoRotate?: boolean;
  /** Auto-rotation speed */
  autoRotateSpeed?: number;
  /** Environment preset for HDR lighting */
  environment?: EnvironmentPreset;
  /** Lighting preset */
  lighting?: LightingPreset;
  /** Light intensity multiplier */
  lightIntensity?: number;
  /** Enable shadows */
  enableShadows?: boolean;
  /** Enable bloom effect */
  enableBloom?: boolean;
  /** Bloom intensity */
  bloomIntensity?: number;
  /** Enable tone mapping */
  enableToneMapping?: boolean;
  /** Tone mapping exposure */
  exposure?: number;
  /** Show ground plane */
  showGround?: boolean;
  /** Enable contact shadows */
  enableContactShadows?: boolean;
  /** Enable vignette effect */
  enableVignette?: boolean;
  /** Auto-fit camera to model */
  autoFit?: boolean;
  /** Enable anti-aliasing */
  enableAntiAliasing?: boolean;
  /** Use presentation controls (drag to rotate) */
  presentationMode?: boolean;
  /** Allow user interaction (orbit/pan/zoom) */
  allowUserControls?: boolean;
  /** Model position [x, y, z] */
  modelPosition?: [number, number, number];
  /** Model rotation [x, y, z] in radians */
  modelRotation?: [number, number, number];
  /** Model scale (number or [x, y, z]) */
  modelScale?: number | [number, number, number];
  /** Provide capture ref to grab screenshots from the WebGL canvas */
  captureRef?: React.MutableRefObject<(() => string | null) | null>;
}

function ScreenshotCapture({
  captureRef,
}: {
  captureRef: React.MutableRefObject<(() => string | null) | null>;
}): React.JSX.Element | null {
  const { gl } = useThree();
  useEffect(() => {
    captureRef.current = (): string | null => {
      try {
        return gl.domElement.toDataURL('image/png');
      } catch {
        return null;
      }
    };
    return (): void => {
      if (captureRef.current) captureRef.current = null;
    };
  }, [captureRef, gl]);
  return null;
}

export function Viewer3D({
  modelUrl,
  backgroundColor = '#1a1a2e',
  enableDithering = false,
  ditheringIntensity = 1.0,
  enableOrderedDithering = false,
  orderedDitheringGridSize = 4,
  orderedDitheringPixelSizeRatio = 1,
  orderedDitheringGrayscaleOnly = false,
  orderedDitheringInvertColor = false,
  orderedDitheringLuminanceMethod = 1,
  enablePixelation = false,
  pixelSize = 6,
  className,
  onLoad,
  onError,
  autoRotate = true,
  autoRotateSpeed = 2,
  environment = 'studio',
  lighting = 'studio',
  lightIntensity = 1,
  enableShadows = true,
  enableBloom = false,
  bloomIntensity = 0.5,
  enableToneMapping = true,
  exposure = 1,
  showGround = false,
  enableContactShadows = true,
  enableVignette = false,
  autoFit = true,
  enableAntiAliasing = true,
  presentationMode = false,
  allowUserControls = true,
  modelPosition,
  modelRotation,
  modelScale,
  captureRef,
}: Viewer3DProps): React.JSX.Element {
  const hasPostProcessing =
    enableDithering ||
    enableOrderedDithering ||
    enablePixelation ||
    enableBloom ||
    enableToneMapping ||
    enableVignette ||
    enableAntiAliasing;

  const effects = useMemo(() => {
    const effectsList: React.ReactElement[] = [];
    if (enableAntiAliasing) effectsList.push(<SMAA key="smaa" />);
    if (enableToneMapping) effectsList.push(<ToneMapping key="tonemapping" mode={ToneMappingMode.ACES_FILMIC} />);
    if (enableBloom) effectsList.push(<Bloom key="bloom" intensity={bloomIntensity} luminanceThreshold={0.9} luminanceSmoothing={0.025} />);
    if (enableVignette) effectsList.push(<Vignette key="vignette" offset={0.3} darkness={0.5} blendFunction={BlendFunction.NORMAL} />);
    if (enablePixelation) effectsList.push(<PixelationPass key="pixelation" pixelSize={Math.max(1, pixelSize)} />);
    if (enableOrderedDithering) {
      effectsList.push(
        <OrderedDitheringPass
          key="ordered-dithering"
          gridSize={orderedDitheringGridSize}
          pixelSizeRatio={orderedDitheringPixelSizeRatio}
          grayscaleOnly={orderedDitheringGrayscaleOnly}
          invertColor={orderedDitheringInvertColor}
          luminanceMethod={orderedDitheringLuminanceMethod}
        />
      );
    }
    if (enableDithering) effectsList.push(<DitheringPass key="dithering" intensity={ditheringIntensity} />);
    return effectsList;
  }, [
    enableAntiAliasing,
    enableToneMapping,
    enableBloom,
    bloomIntensity,
    enableVignette,
    enablePixelation,
    pixelSize,
    enableOrderedDithering,
    orderedDitheringGridSize,
    orderedDitheringPixelSizeRatio,
    orderedDitheringGrayscaleOnly,
    orderedDitheringInvertColor,
    orderedDitheringLuminanceMethod,
    enableDithering,
    ditheringIntensity,
  ]);

  const modelNode = (
    <Model3DErrorBoundary {...(onError && { onError })}>
      <AutoRotateGroup enabled={!allowUserControls && autoRotate} speed={autoRotateSpeed}>
        <Model3D
          url={modelUrl}
          {...(onLoad && { onLoad })}
          {...(onError && { onError })}
          castShadow={enableShadows}
          receiveShadow={enableShadows}
          {...(modelPosition && { position: modelPosition })}
          {...(modelRotation && { rotation: modelRotation })}
          {...(modelScale && { scale: modelScale })}
        />
      </AutoRotateGroup>
    </Model3DErrorBoundary>
  );

  const framedModel = autoFit
    ? (
      <Bounds fit clip observe margin={1.2}>
        {modelNode}
      </Bounds>
    )
    : modelNode;

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45, near: 0.1, far: 1000 }}
        shadows={enableShadows}
        gl={{
          preserveDrawingBuffer: true,
          antialias: !hasPostProcessing, // Disable if using SMAA
          toneMapping: enableToneMapping ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping,
          toneMappingExposure: exposure,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        dpr={[1, 2]} // Responsive pixel ratio
      >
        {captureRef ? <ScreenshotCapture captureRef={captureRef} /> : null}
        {}
        <color attach="background" args={[backgroundColor]} />
        {}

        {/* Lighting */}
        <SceneLighting preset={lighting} intensity={lightIntensity} />

        {/* HDR Environment */}
        <Environment preset={environment} background={false} />

        <Suspense fallback={<Loader />}>
          {presentationMode && allowUserControls ? (
            <PresentationControls
              global
              rotation={[0, 0, 0]}
              polar={[-Math.PI / 4, Math.PI / 4]}
              azimuth={[-Math.PI / 4, Math.PI / 4]}
            >
              <Center>
                {framedModel}
              </Center>
            </PresentationControls>
          ) : (
            <Center>
              {framedModel}
            </Center>
          )}

          {/* Ground and shadows */}
          {showGround && <Ground visible={showGround} />}

          {enableContactShadows && (
            <ContactShadows
              opacity={0.5}
              scale={10}
              blur={2}
              far={4}
              resolution={256}
              color="#000000"
            />
          )}
        </Suspense>

        {/* Camera Controls */}
        {!presentationMode && allowUserControls && (
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            enablePan={allowUserControls}
            enableZoom={allowUserControls}
            enableRotate={allowUserControls}
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={0.5}
            maxDistance={100}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
          />
        )}

        {/* Post-processing */}
        {hasPostProcessing && effects.length > 0 && (
          <EffectComposer multisampling={0}>
            {effects}
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}

// Preload models for better performance
export function preloadModel(url: string): void {
  useGLTF.preload(url);
}