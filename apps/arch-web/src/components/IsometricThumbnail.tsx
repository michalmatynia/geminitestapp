'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { makeProjectGroup } from '@/lib/projectModels';

// Isometric direction: camera up-right-back, matching the interactive viewer's angle
const ISO_DIR = new THREE.Vector3(1, 0.72, 1).normalize();

function IsometricThumbnail({ projectIdx }: { projectIdx: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement!;
    const w = parent.offsetWidth  || 180;
    const h = parent.offsetHeight || 220;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    // Build geometry — same source as ProjectViewer
    const group = makeProjectGroup(projectIdx);

    // Wireframe-only for the static thumbnail
    group.traverse(c => {
      const mat = (c as THREE.Mesh).material as (THREE.Material & { opacity: number }) | undefined;
      if (mat && c.userData.isSolid) mat.opacity = 0;
    });
    scene.add(group);

    // Fit orthographic camera to the model's bounding sphere
    const box    = new THREE.Box3().setFromObject(group);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const center = sphere.center;
    const r      = sphere.radius;

    const aspect = w / h;
    const pad    = r * 1.25;
    const camera = new THREE.OrthographicCamera(
      -pad * aspect,  pad * aspect,
       pad,           -pad,
       0.1,           r * 10,
    );
    camera.position.copy(center).addScaledVector(ISO_DIR, r * 4);
    camera.lookAt(center);

    function render() { renderer.render(scene, camera); }
    render();

    const ro = new ResizeObserver(() => {
      const nw = parent.offsetWidth, nh = parent.offsetHeight;
      if (!nw || !nh) return;
      renderer.setSize(nw, nh, false);
      const na = nw / nh;
      camera.left = -pad * na; camera.right = pad * na;
      camera.updateProjectionMatrix();
      render();
    });
    ro.observe(parent);

    return () => { ro.disconnect(); renderer.dispose(); };
  }, [projectIdx]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}

export default memo(IsometricThumbnail);
