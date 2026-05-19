'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeProjectGroup, INK } from '@/lib/projectModels';
import { loadGltfModel, prepareLoadedModel, disposeObject3D } from '@/lib/threeModelUtils';

type Axis = 'x' | 'y' | 'z';

interface ThumbState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  pad: number;
}

type LineOpacityMaterial = THREE.Material & {
  color?: THREE.Color;
  depthWrite?: boolean;
  opacity: number;
  transparent?: boolean;
};

const axes: Axis[] = ['x', 'y', 'z'];

const getAxisValue = (vector: THREE.Vector3, axis: Axis): number => {
  if (axis === 'x') return vector.x;
  if (axis === 'y') return vector.y;
  return vector.z;
};

const axisVector = (axis: Axis, value: number): THREE.Vector3 => {
  if (axis === 'x') return new THREE.Vector3(value, 0, 0);
  if (axis === 'y') return new THREE.Vector3(0, value, 0);
  return new THREE.Vector3(0, 0, value);
};

const setAxisValue = (vector: THREE.Vector3, axis: Axis, value: number): void => {
  if (axis === 'x') {
    vector.x = value;
  } else if (axis === 'y') {
    vector.y = value;
  } else {
    vector.z = value;
  }
};

function detectUpAxis(box: THREE.Box3, size: THREE.Vector3): Axis {
  return axes.reduce<Axis>((best, axis) => {
    const bestSize = getAxisValue(size, best) || 1;
    const axisSize = getAxisValue(size, axis) || 1;
    const bestScore = Math.abs(getAxisValue(box.min, best)) / bestSize;
    const axisScore = Math.abs(getAxisValue(box.min, axis)) / axisSize;
    return axisScore < bestScore ? axis : best;
  }, 'y');
}

function getOrthographicDirection(upAxis: Axis): THREE.Vector3 {
  const horizontalAxes = axes.filter((axis) => axis !== upAxis);
  const direction = axisVector(horizontalAxes[0], 1)
    .add(axisVector(horizontalAxes[1], 1))
    .add(axisVector(upAxis, 0.72));
  return direction.normalize();
}

function normalizeLoadedModel(group: THREE.Group): void {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const upAxis = detectUpAxis(box, size);
  const maxAxis = Math.max(size.x, size.y, size.z);
  group.userData._milkbarThumbnailUpAxis = upAxis;
  if (maxAxis > 0) group.scale.multiplyScalar(18 / maxAxis);

  const normalizedBox = new THREE.Box3().setFromObject(group);
  const center = normalizedBox.getCenter(new THREE.Vector3());
  const offset = new THREE.Vector3(-center.x, -center.y, -center.z);
  setAxisValue(offset, upAxis, -getAxisValue(normalizedBox.min, upAxis));
  group.position.add(offset);
}

function fitCamera(
  group: THREE.Object3D,
  camera: THREE.OrthographicCamera,
  aspect: number,
): number {
  const box = new THREE.Box3().setFromObject(group);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const r = sphere.radius;
  const pad = r * 1.25;
  const upAxis = (group.userData._milkbarThumbnailUpAxis as Axis | undefined) ?? 'y';
  camera.left = -pad * aspect;
  camera.right = pad * aspect;
  camera.top = pad;
  camera.bottom = -pad;
  camera.near = 0.1;
  camera.far = r * 10;
  camera.up.copy(axisVector(upAxis, 1));
  camera.position.copy(center).addScaledVector(getOrthographicDirection(upAxis), r * 4);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  return pad;
}

// --- per-mode functions ---

function applyEdgesMode(root: THREE.Object3D, on: boolean): void {
  root.traverse((c) => {
    // Procedural wire edges: visible in edges mode
    if (c.userData.isWire) {
      const raw = (c as THREE.LineSegments).material;
      if (!raw) return;
      const mats = Array.isArray(raw) ? raw : [raw];
      (mats as LineOpacityMaterial[]).forEach((mat) => {
        const userData = mat.userData as Record<string, unknown>;
        if (userData._milkbarOrigOpacity === undefined) userData._milkbarOrigOpacity = mat.opacity;
        mat.color?.set(INK);
        mat.transparent = true;
        mat.opacity = on ? Math.max(userData._milkbarOrigOpacity as number, 0.78) : 0;
        mat.depthWrite = false;
        mat.needsUpdate = true;
      });
      return;
    }
    if (!(c as THREE.Mesh).isMesh) return;
    const mesh = c as THREE.Mesh;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Array<
      THREE.Material & { opacity: number }
    >;
    // Procedural fills: always hidden in edges mode
    if (c.userData.isSolid || c.userData.isTexture) {
      mats.forEach((m) => { m.opacity = 0; });
      return;
    }
    // GLTF mesh: hide face, show feature-edge overlay
    mats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0;
      m.depthWrite = false;
      m.needsUpdate = true;
    });
    if (on) {
      if (!mesh.userData._edgesLines) {
        const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 15);
        const linesMat = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.85 });
        const lines = new THREE.LineSegments(edgesGeo, linesMat);
        lines.userData._isEdgesOverlay = true;
        mesh.add(lines);
        mesh.userData._edgesLines = lines;
      }
      (mesh.userData._edgesLines as THREE.LineSegments).visible = true;
    } else if (mesh.userData._edgesLines) {
      (mesh.userData._edgesLines as THREE.LineSegments).visible = false;
    }
  });
}

function applyWireframeMode(root: THREE.Object3D, on: boolean): void {
  root.traverse((c) => {
    if (c.userData.isWire) {
      const raw = (c as THREE.LineSegments).material;
      if (!raw) return;
      const mats = Array.isArray(raw) ? raw : [raw];
      (mats as LineOpacityMaterial[]).forEach((mat) => {
        const userData = mat.userData as Record<string, unknown>;
        if (userData._milkbarOrigOpacity === undefined) userData._milkbarOrigOpacity = mat.opacity;
        mat.color?.set(INK);
        mat.transparent = true;
        mat.opacity = on ? Math.max(userData._milkbarOrigOpacity as number, 0.78) : 0;
        mat.depthWrite = false;
        mat.needsUpdate = true;
      });
      return;
    }
    if (!(c as THREE.Mesh).isMesh) return;
    const mesh = c as THREE.Mesh;
    if (mesh.userData._edgesLines) {
      (mesh.userData._edgesLines as THREE.LineSegments).visible = false;
    }
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Array<
      THREE.Material & { opacity: number; wireframe?: boolean; color: THREE.Color }
    >;
    if (c.userData.isSolid) { mats.forEach((m) => { m.opacity = on ? 0 : 0.85; }); return; }
    if (c.userData.isTexture) { mats.forEach((m) => { m.opacity = on ? 0 : 0.9; }); return; }
    // GLTF: material.wireframe toggle with color caching
    mats.forEach((mat) => {
      if ('wireframe' in mat) {
        mat.wireframe = on;
        if (on) {
          if (!(mat.userData as Record<string, unknown>)['_origColor']) {
            (mat.userData as Record<string, unknown>)['_origColor'] = mat.color.clone();
          }
          mat.color.set(INK);
        } else {
          const orig = (mat.userData as Record<string, unknown>)['_origColor'] as THREE.Color | undefined;
          if (orig) mat.color.copy(orig);
        }
      }
      mat.opacity = 1;
      mat.depthWrite = true;
      mat.needsUpdate = true;
    });
  });
}

function applySolidMode(root: THREE.Object3D): void {
  root.traverse((c) => {
    if (c.userData.isWire) {
      const raw = (c as THREE.LineSegments).material;
      if (!raw) return;
      (Array.isArray(raw) ? raw : [raw] as Array<THREE.Material & { opacity: number }>).forEach(
        (m: THREE.Material & { opacity: number }) => { m.opacity = 0; },
      );
      return;
    }
    if (!(c as THREE.Mesh).isMesh) return;
    const mesh = c as THREE.Mesh;
    if (mesh.userData._edgesLines) (mesh.userData._edgesLines as THREE.LineSegments).visible = false;
    const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as Array<
      THREE.Material & { opacity: number; wireframe?: boolean; color: THREE.Color }
    >;
    if (c.userData.isSolid) { mats.forEach((m) => { m.opacity = 0.85; }); return; }
    if (c.userData.isTexture) { mats.forEach((m) => { m.opacity = 0; }); return; }
    mats.forEach((mat) => {
      if ('wireframe' in mat) {
        mat.wireframe = false;
        const orig = (mat.userData as Record<string, unknown>)['_origColor'] as THREE.Color | undefined;
        if (orig) mat.color.copy(orig);
      }
      mat.opacity = 1;
      mat.depthWrite = true;
      mat.needsUpdate = true;
    });
  });
}

function applyViewMode(
  root: THREE.Object3D,
  mode: 'edges' | 'wireframe' | 'solid',
): void {
  if (mode === 'edges') applyEdgesMode(root, true);
  else if (mode === 'wireframe') applyWireframeMode(root, true);
  else applySolidMode(root);
}

// --- component ---

function IsometricThumbnail({
  projectIdx,
  modelUrl,
  viewMode = 'edges',
}: {
  projectIdx: number;
  modelUrl?: string | undefined;
  viewMode?: 'edges' | 'wireframe' | 'solid' | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<ThumbState | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  // Init renderer + lights + ResizeObserver (once per mount)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.offsetWidth || 180;
    const h = parent.offsetHeight || 220;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xf9f8f5, 0.8));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.0);
    sun.position.set(10, 18, 8);
    scene.add(sun);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    stateRef.current = { renderer, scene, camera, pad: 5 };

    const ro = new ResizeObserver(() => {
      const nw = parent.offsetWidth;
      const nh = parent.offsetHeight;
      if (!nw || !nh) return;
      renderer.setSize(nw, nh, false);
      const na = nw / nh;
      const pad = stateRef.current?.pad ?? 5;
      camera.left = -pad * na;
      camera.right = pad * na;
      camera.updateProjectionMatrix();
      if (stateRef.current) renderer.render(scene, camera);
    });
    ro.observe(parent);

    return () => {
      ro.disconnect();
      if (groupRef.current) {
        scene.remove(groupRef.current);
        disposeObject3D(groupRef.current);
        groupRef.current = null;
      }
      renderer.dispose();
      stateRef.current = null;
    };
  }, []);

  // Swap model when projectIdx or modelUrl changes
  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const { scene, camera } = state;
    let cancelled = false;

    if (groupRef.current) {
      scene.remove(groupRef.current);
      disposeObject3D(groupRef.current);
      groupRef.current = null;
    }

    const addGroup = (g: THREE.Group): void => {
      if (cancelled || !stateRef.current) { disposeObject3D(g); return; }
      const canvas = canvasRef.current;
      const par = canvas?.parentElement;
      const aspect = par ? (par.offsetWidth || 180) / (par.offsetHeight || 220) : 1;
      const pad = fitCamera(g, camera, aspect);
      stateRef.current.pad = pad;
      applyViewMode(g, viewModeRef.current);
      scene.add(g);
      groupRef.current = g;
      stateRef.current.renderer.render(scene, camera);
    };

    const trimmedUrl = modelUrl?.trim();
    if (trimmedUrl) {
      void loadGltfModel(trimmedUrl)
        .then((g) => {
          prepareLoadedModel(g);
          normalizeLoadedModel(g);
          addGroup(g);
        })
        .catch(() => {
          if (!cancelled && stateRef.current) {
            stateRef.current.renderer.render(scene, camera);
          }
        });
    } else {
      addGroup(makeProjectGroup(projectIdx));
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIdx, modelUrl]);

  // Re-apply view mode when it changes
  useEffect(() => {
    const g = groupRef.current;
    const state = stateRef.current;
    if (!g || !state) return;
    applyViewMode(g, viewMode);
    state.renderer.render(state.scene, state.camera);
  }, [viewMode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

export default memo(IsometricThumbnail);
