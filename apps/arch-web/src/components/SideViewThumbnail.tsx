'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { INK } from '@/lib/projectModels';
import { disposeObject3D, loadGltfModel, prepareLoadedModel } from '@/lib/threeModelUtils';

interface State {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  group: THREE.Group | null;
  canvas: HTMLCanvasElement;
}

type SideViewThumbnailProps = {
  projectIdx: number;
  modelUrl?: string;
};

type Axis = 'x' | 'y' | 'z';

const EDGE_MATERIAL = new THREE.LineBasicMaterial({
  color: INK,
  transparent: true,
  opacity: 0.72,
});

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

function addEdgesRenderMode(group: THREE.Group): void {
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0;
      material.depthWrite = false;
      material.needsUpdate = true;
    });

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry, 12),
      EDGE_MATERIAL.clone()
    );
    edges.userData._isEdgesOverlay = true;
    mesh.add(edges);
  });
}

function normalizeToElevationOrigin(group: THREE.Group): void {
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const upAxis = detectUpAxis(box, size);
  const maxAxis = Math.max(size.x, size.y, size.z);
  group.userData._milkbarElevationUpAxis = upAxis;
  if (maxAxis > 0) group.scale.multiplyScalar(22 / maxAxis);

  const normalizedBox = new THREE.Box3().setFromObject(group);
  const center = normalizedBox.getCenter(new THREE.Vector3());
  const offset = new THREE.Vector3(-center.x, -center.y, -center.z);
  setAxisValue(offset, upAxis, -getAxisValue(normalizedBox.min, upAxis));
  group.position.add(offset);
}

function getElevationAxes(group: THREE.Group, size: THREE.Vector3): {
  depthAxis: Axis;
  horizontalAxis: Axis;
  upAxis: Axis;
} {
  const upAxis = (group.userData._milkbarElevationUpAxis as Axis | undefined) ?? 'y';
  const horizontalAxes = axes.filter((axis) => axis !== upAxis);
  const horizontalAxis = getAxisValue(size, horizontalAxes[0]) >= getAxisValue(size, horizontalAxes[1])
    ? horizontalAxes[0]
    : horizontalAxes[1];
  const depthAxis = horizontalAxes.find((axis) => axis !== horizontalAxis) ?? horizontalAxes[0];
  return { depthAxis, horizontalAxis, upAxis };
}

function SideViewThumbnail({ projectIdx, modelUrl }: SideViewThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef<State | null>(null);
  const renderRef = useRef<(() => void) | null>(null);

  // ── Init renderer once ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);

    scene.add(new THREE.AmbientLight(0xF9F8F5, 0.7));
    const sun = new THREE.DirectionalLight(0xFFF4E0, 0.9);
    sun.position.set(4, 8, 6);
    scene.add(sun);

    stateRef.current = { renderer, scene, camera, group: null, canvas };

    renderRef.current = () => {
      const s = stateRef.current;
      if (!s || !s.group) return;

      const w = s.canvas.clientWidth  || 200;
      const h = s.canvas.clientHeight || 280;

      s.renderer.setSize(w, h, false);

      const box    = new THREE.Box3().setFromObject(s.group);
      const size   = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const aspect = w / h;
      // Orthographic elevation. Uploaded CAD models may be Y-up or Z-up,
      // so use the detected up axis as screen vertical.
      const { depthAxis, horizontalAxis, upAxis } = getElevationAxes(s.group, size);
      const halfW = (getAxisValue(size, horizontalAxis) / 2) * 1.45;
      const halfH = (getAxisValue(size, upAxis) / 2) * 1.45;
      const fhh = Math.max(halfH, halfW / aspect);
      const fhw = fhh * aspect;

      s.camera.left   = -fhw;
      s.camera.right  = +fhw;
      s.camera.top    = +fhh;
      s.camera.bottom = -fhh;

      const dist = Math.max(getAxisValue(size, depthAxis), 4) * 5;
      s.camera.position.copy(center).add(axisVector(depthAxis, dist));
      s.camera.up.copy(axisVector(upAxis, 1));
      s.camera.lookAt(center);
      s.camera.updateProjectionMatrix();

      s.renderer.render(s.scene, s.camera);
    };

    const ro = new ResizeObserver(() => renderRef.current?.());
    ro.observe(canvas);
    requestAnimationFrame(() => renderRef.current?.());

    return () => {
      ro.disconnect();
      const s = stateRef.current;
      if (s?.group) disposeObject3D(s.group);
      renderer.dispose();
      stateRef.current = null;
    };
  }, []);

  // ── Swap CMS project model when the selected project changes ────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    const resolvedModelUrl = modelUrl?.trim();

    if (s.group) {
      s.scene.remove(s.group);
      disposeObject3D(s.group);
      s.group = null;
    }
    renderRef.current?.();

    if (resolvedModelUrl === undefined || resolvedModelUrl.length === 0) return;

    let cancelled = false;
    void loadGltfModel(resolvedModelUrl)
      .then((group) => {
        if (cancelled) {
          disposeObject3D(group);
          return;
        }

        prepareLoadedModel(group);
        normalizeToElevationOrigin(group);
        addEdgesRenderMode(group);
        s.scene.add(group);
        s.group = group;
        requestAnimationFrame(() => renderRef.current?.());
      })
      .catch(() => {
        if (!cancelled) renderRef.current?.();
      });

    return () => { cancelled = true; };
  }, [projectIdx, modelUrl]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

export default memo(SideViewThumbnail);
