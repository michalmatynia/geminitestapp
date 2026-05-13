'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const initW = canvas.offsetWidth || window.innerWidth;
    const initH = canvas.offsetHeight || window.innerHeight;
    renderer.setSize(initW, initH);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 200);
    camera.position.set(10, 16, 10);
    camera.lookAt(0, 2, 0);

    const html = document.documentElement;

    function getLineColor() { return html.dataset.theme === 'nightly' ? 0xE8E5DC : 0x1A1918; }
    function getLineOpacity() { return html.dataset.theme === 'nightly' ? 0.14 : 0.09; }
    function getAccentOpacity() { return html.dataset.theme === 'nightly' ? 0.45 : 0.28; }

    const gridLines: THREE.Object3D[] = [];
    function buildGrid() {
      gridLines.forEach(l => scene.remove(l));
      gridLines.length = 0;
      const mat = new THREE.LineBasicMaterial({ color: getLineColor(), transparent: true, opacity: getLineOpacity() * 0.6 });
      for (let i = -8; i <= 8; i++) {
        const g1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i * 2.5, -0.01, -20), new THREE.Vector3(i * 2.5, -0.01, 20)]);
        const g2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-20, -0.01, i * 2.5), new THREE.Vector3(20, -0.01, i * 2.5)]);
        const l1 = new THREE.Line(g1, mat.clone());
        const l2 = new THREE.Line(g2, mat.clone());
        scene.add(l1); scene.add(l2);
        gridLines.push(l1, l2);
      }
    }
    buildGrid();

    const buildingDefs = [
      { x: -4, z: -2, w: 1.8, h: 5.5, d: 1.8 },
      { x: 0, z: 0, w: 2.2, h: 9, d: 2.2 },
      { x: 3.5, z: -1.5, w: 1.2, h: 7, d: 1.2 },
      { x: -2.5, z: 3, w: 2.8, h: 3.5, d: 1.8 },
      { x: 2.5, z: 2.5, w: 1.4, h: 6.5, d: 1.4 },
      { x: -6, z: 0.5, w: 3.2, h: 2.5, d: 2.4 },
      { x: 5, z: 1, w: 1, h: 4.5, d: 1 },
      { x: -3.5, z: -4, w: 2, h: 3, d: 1.5 },
      { x: 1, z: -4, w: 1.5, h: 5, d: 1.5 },
    ];

    const buildingMeshes: THREE.Group[] = [];

    function buildBuildings() {
      buildingMeshes.forEach(b => scene.remove(b));
      buildingMeshes.length = 0;
      const col = getLineColor();
      const op = getLineOpacity();
      const buildingMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op });
      const accentMat = new THREE.LineBasicMaterial({
        color: html.dataset.theme === 'nightly' ? 0xB0A898 : 0x8A8075,
        transparent: true, opacity: getAccentOpacity(),
      });

      buildingDefs.forEach((b, idx) => {
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
        const edges = new THREE.EdgesGeometry(geo);
        const mat = idx === 1 ? accentMat.clone() : buildingMat.clone();
        const wire = new THREE.LineSegments(edges, mat);
        wire.position.y = b.h / 2;
        group.add(wire);

        const floorMat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op * 0.5 });
        for (let y = 0; y <= b.h; y += 0.9) {
          const hw = b.w / 2, hd = b.d / 2;
          const pts = [
            new THREE.Vector3(-hw, y, -hd), new THREE.Vector3(hw, y, -hd),
            new THREE.Vector3(hw, y, hd), new THREE.Vector3(-hw, y, hd),
            new THREE.Vector3(-hw, y, -hd),
          ];
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), floorMat.clone()));
        }
        group.position.set(b.x, 0, b.z);
        scene.add(group);
        buildingMeshes.push(group);
      });
    }
    buildBuildings();

    // Rise animation via setTimeout (GSAP may not be loaded yet when this mounts)
    buildingMeshes.forEach((g, i) => {
      g.scale.y = 0.01;
      const start = Date.now() + 1500 + i * 80;
      const dur = 1400;
      function tick() {
        const t = Math.min((Date.now() - start) / dur, 1);
        if (t < 0) { requestAnimationFrame(tick); return; }
        const ease = 1 - Math.pow(1 - t, 3);
        g.scale.y = 0.01 + ease * 0.99;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });

    let heroMouseX = 0, heroMouseY = 0;
    const onMouseMove = (e: MouseEvent) => {
      heroMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      heroMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    function onResize() {
      if (!canvas) return;
      const w = canvas.offsetWidth || window.innerWidth;
      const h = canvas.offsetHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    const onThemeChange = () => { buildGrid(); buildBuildings(); };
    window.addEventListener('themechange', onThemeChange);

    let t = 0, rafId: number;
    function animate() {
      rafId = requestAnimationFrame(animate);
      t += 0.0004;
      camera.position.x = 10 + Math.sin(t) * 0.8 + heroMouseX * 3.2;
      camera.position.z = 10 + Math.cos(t) * 0.8 + heroMouseY * 2.4;
      camera.position.y = 16 + heroMouseY * 2.0;
      camera.lookAt(0, 3, 0);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('themechange', onThemeChange);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      id="hero-canvas"
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
