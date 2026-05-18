'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeProjectGroup, INK } from '@/lib/projectModels';
import { loadGltfModel, prepareLoadedModel, disposeObject3D } from '@/lib/threeModelUtils';

const ISO_DIR = new THREE.Vector3(1, 0.72, 1).normalize();

interface ThumbState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  pad: number;
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
  camera.left = -pad * aspect;
  camera.right = pad * aspect;
  camera.top = pad;
  camera.bottom = -pad;
  camera.near = 0.1;
  camera.far = r * 10;
  camera.position.copy(center).addScaledVector(ISO_DIR, r * 4);
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
      (mats as Array<THREE.Material & { opacity: number }>).forEach((mat) => {
        if (c.userData._origOpacity === undefined) c.userData._origOpacity = mat.opacity;
        mat.opacity = on ? (c.userData._origOpacity as number) : 0;
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
    mats.forEach((m) => { m.opacity = 0; });
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
      (mats as Array<THREE.Material & { opacity: number }>).forEach((mat) => {
        if (c.userData._origOpacity === undefined) c.userData._origOpacity = mat.opacity;
        mat.opacity = on ? (c.userData._origOpacity as number) : 0;
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
          const box0 = new THREE.Box3().setFromObject(g);
          const size0 = box0.getSize(new THREE.Vector3());
          const maxAxis = Math.max(size0.x, size0.y, size0.z);
          if (maxAxis > 0) g.scale.multiplyScalar(18 / maxAxis);
          const box1 = new THREE.Box3().setFromObject(g);
          const cx = box1.getCenter(new THREE.Vector3());
          g.position.set(-cx.x, -box1.min.y, -cx.z);
          addGroup(g);
        })
        .catch(() => addGroup(makeProjectGroup(projectIdx)));
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
