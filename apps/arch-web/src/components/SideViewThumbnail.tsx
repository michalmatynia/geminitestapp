'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeProjectGroup } from '@/lib/projectModels';
import { disposeObject3D } from '@/lib/threeModelUtils';

interface State {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  group: THREE.Group | null;
  canvas: HTMLCanvasElement;
}

function SideViewThumbnail({ projectIdx }: { projectIdx: number }) {
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
      // Front elevation: X = width, Y = height  (camera looks along –Z)
      const halfW = (size.x / 2) * 1.45;
      const halfH = (size.y / 2) * 1.45;
      const fhh = Math.max(halfH, halfW / aspect);
      const fhw = fhh * aspect;

      s.camera.left   = -fhw;
      s.camera.right  = +fhw;
      s.camera.top    = +fhh;
      s.camera.bottom = -fhh;

      const dist = Math.max(size.z, 4) * 5;
      s.camera.position.set(center.x, center.y, center.z + dist);
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

  // ── Swap procedural elevation when the selected project changes ────────────
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;

    if (s.group) {
      s.scene.remove(s.group);
      disposeObject3D(s.group);
      s.group = null;
    }

    let cancelled = false;
    const group = makeProjectGroup(projectIdx);
    if (cancelled) {
      disposeObject3D(group);
      return;
    }
    group.traverse(c => {
      const mat = (c as THREE.Mesh).material as (THREE.Material & { opacity: number }) | undefined;
      if (mat && c.userData.isSolid) mat.opacity = 0;
    });
    s.scene.add(group);
    s.group = group;
    requestAnimationFrame(() => renderRef.current?.());

    return () => { cancelled = true; };
  }, [projectIdx]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

export default memo(SideViewThumbnail);
