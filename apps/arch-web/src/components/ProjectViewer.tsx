'use client';

import { memo, useEffect, useRef, useState } from 'react';
import type { Project } from '@/lib/types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeProjectGroup, INK, INK_2, INK_3, PAPER, PAPER2, PAPER3 } from '@/lib/projectModels';
import { disposeObject3D, loadGltfModel, prepareLoadedModel } from '@/lib/threeModelUtils';

type RenderMode = 'edges' | 'wireframe' | 'transparent' | 'solid' | 'textured';
type Props = { projects: Project[] };

const fallbackProjects: Project[] = [
  { code: 'MBD-001', name: 'Helios Tower', projectType: 'Mixed-Use Tower', city: 'Zurich', country: 'CH', stats: ['32 Floors · 42,000 m²', 'Mixed-Use · Zurich, CH'], description: '', order: 0, status: 'published', cameraPosition: { x: 22, y: 18, z: 22 }, cameraTarget: { x: 0, y: 8, z: 0 } },
  { code: 'MBD-002', name: 'Kulturhaus', projectType: 'Cultural Centre', city: 'Amsterdam', country: 'NL', stats: ['3 Volumes · 4,200 m²', 'Cultural · Amsterdam, NL'], description: '', order: 1, status: 'published', cameraPosition: { x: 20, y: 12, z: 20 }, cameraTarget: { x: 0, y: 5, z: 0 } },
  { code: 'MBD-003', name: 'South Quarter', projectType: 'Residential Ensemble', city: 'Berlin', country: 'DE', stats: ['3 Volumes · 8,600 m²', 'Residential · Berlin, DE'], description: '', order: 2, status: 'published', cameraPosition: { x: 18, y: 15, z: 18 }, cameraTarget: { x: 0, y: 6, z: 0 } },
];

function ProjectViewer({ projects }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ loadProject: (i: number) => void; setMode: (m: RenderMode) => void; zoom: (factor: number) => void } | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [renderMode, setRenderMode] = useState<RenderMode>('edges');
  const displayProjects = projects.length > 0 ? projects : fallbackProjects;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    function sizeCanvas() {
      if (!canvas || !wrap) return;
      canvas.width = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    }
    sizeCanvas();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // PBR environment (only affects MeshStandardMaterial — wire/solid modes unaffected)
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, canvas.offsetWidth / canvas.offsetHeight, 0.1, 500);
    camera.position.set(36, 28, 36);
    camera.lookAt(0, 5, 0);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.target.set(0, 4, 0);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.update();

    let autoRotateTimer: ReturnType<typeof setTimeout> | null = null;
    const pauseRotate = () => { controls.autoRotate = false; if (autoRotateTimer) clearTimeout(autoRotateTimer); };
    const resumeRotate = () => { autoRotateTimer = setTimeout(() => { controls.autoRotate = true; }, 3000); };
    canvas.addEventListener('pointerdown', pauseRotate);
    canvas.addEventListener('pointerup', resumeRotate);
    canvas.addEventListener('pointerleave', () => { if (!controls.autoRotate) resumeRotate(); });

    scene.environment = envTex;

    // Warm paper lighting — works for all modes
    scene.add(new THREE.AmbientLight(0xF9F8F5, 0.6));
    scene.add(new THREE.HemisphereLight(0xD4E6F2, 0xC8A882, 0.55));
    const sun = new THREE.DirectionalLight(0xFFF4E0, 1.1);
    sun.position.set(12, 22, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.001;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xE8EFF8, 0.4);
    fill.position.set(-10, 8, -12);
    scene.add(fill);

    // Grid
    const groundGrid = new THREE.GridHelper(40, 20, 0xDEDAD4, 0xDEDAD4);
    const gridMat = groundGrid.material as THREE.Material & { opacity: number };
    gridMat.opacity = 0.6;
    gridMat.transparent = true;
    groundGrid.position.y = -0.04;
    scene.add(groundGrid);

    // Shadow receiver
    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.05 })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.01;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Paving-stone ground — visible only in textured mode
    function makePavingTex(): THREE.CanvasTexture {
      const S = 256, stW = 64, stH = 40;
      const cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      const ctx = cv.getContext('2d')!;
      ctx.fillStyle = '#B6B2AC';
      ctx.fillRect(0, 0, S, S);
      for (let ry = 0; ry * stH < S + stH; ry++) {
        const offX = (ry % 2) * (stW / 2);
        for (let rx = -1; rx * stW < S + stW; rx++) {
          const sx = ((rx * stW + offX) % S + S) % S;
          const sy = ry * stH;
          const v = 174 + Math.floor(Math.random() * 22);
          const w = Math.floor(Math.random() * 10);
          ctx.fillStyle = `rgb(${v + w},${v},${v - 5})`;
          ctx.fillRect(sx + 2, sy + 2, stW - 4, stH - 4);
        }
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx.lineWidth = 1;
      for (let y = 0; y <= S; y += stH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
      for (let ry = 0; ry * stH <= S; ry++) {
        const offX = (ry % 2) * (stW / 2);
        for (let x = offX; x <= S + stW; x += stW) {
          const sx = x % S;
          ctx.beginPath(); ctx.moveTo(sx, ry * stH); ctx.lineTo(sx, (ry + 1) * stH); ctx.stroke();
        }
      }
      const t = new THREE.CanvasTexture(cv);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(10, 10);
      return t;
    }
    const pavingMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({
        map: makePavingTex(),
        roughness: 0.92, metalness: 0,
        transparent: true, opacity: 0,
        envMapIntensity: 0.2,
      })
    );
    pavingMesh.rotation.x = -Math.PI / 2;
    pavingMesh.position.y = -0.02;
    pavingMesh.receiveShadow = true;
    scene.add(pavingMesh);

    // Silence unused-import linter — colours used elsewhere in this file or re-exported
    void INK_2; void INK_3; void PAPER; void PAPER2; void PAPER3;

    let currentGroup: THREE.Group | null = null;
    let currentIdx = 0;
    let mode: RenderMode = 'edges';

    const camTargets = displayProjects.map((p) => ({
      x: p.cameraPosition.x,
      y: p.cameraPosition.y,
      z: p.cameraPosition.z,
      ty: p.cameraTarget.y,
    }));

    function animateMat(mat: THREE.Material & { opacity: number }, to: number, durMs: number) {
      const startTime = Date.now(), from = mat.opacity;
      const tick = () => {
        const t = Math.min((Date.now() - startTime) / durMs, 1);
        mat.opacity = from + (to - from) * (1 - Math.pow(1 - t, 2));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    function animateOpacity(group: THREE.Group, targetFn: (c: THREE.Object3D) => number, durMs: number) {
      const startTime = Date.now();
      const entries: Array<{ mat: THREE.Material & { opacity: number }; from: number; to: number }> = [];
      group.traverse(c => {
        if (c.userData._isEdgesOverlay) return; // managed by applyEdgesMode
        const raw = (c as THREE.Mesh).material;
        if (!raw) return;
        const mats = Array.isArray(raw) ? raw : [raw];
        const target = targetFn(c);
        (mats as Array<THREE.Material & { opacity: number }>).forEach(mat => {
          entries.push({ mat, from: mat.opacity, to: target });
        });
      });
      const tick = () => {
        const t = Math.min((Date.now() - startTime) / durMs, 1);
        const ease = 1 - Math.pow(1 - t, 2);
        entries.forEach(({ mat, from, to: target }) => { mat.opacity = from + (target - from) * ease; });
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // Returns target opacity for each object per render mode
    function opFn(m: RenderMode) {
      return (c: THREE.Object3D) => {
        // GLTF meshes — wireframe toggled via material.wireframe, edges via overlay LineSegments
        if (c.userData.isExternalModel) {
          if (m === 'transparent') return 0.28;
          if (m === 'edges')       return 0; // mesh hidden; EdgesGeometry overlay provides visuals
          return 1;
        }
        // Procedural solid-fill (MeshLambertMaterial)
        if (c.userData.isSolid) {
          if (m === 'solid')       return 1;
          if (m === 'transparent') return 0.35;
          return 0;
        }
        // Procedural facade texture (MeshStandardMaterial with canvas map)
        if (c.userData.isTexture) return m === 'textured' ? 1 : 0;
        // Procedural edge line segments (LineSegments / Line)
        if (c.userData.isWire) {
          const lineMat = (c as THREE.LineSegments).material as THREE.LineBasicMaterial;
          const nat = lineMat.opacity ?? 0.75;
          if (m === 'edges' || m === 'wireframe') return nat;
          if (m === 'transparent') return nat * 0.45;
          if (m === 'textured')    return nat * 0.22; // dim structural overlay
          return 0; // solid
        }
        return 0;
      };
    }

    // Toggle material.wireframe on GLTF meshes (marked isExternalModel by prepareLoadedModel)
    function applyWireframeMode(group: THREE.Group, on: boolean) {
      group.traverse(c => {
        if (!c.userData.isExternalModel) return;
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => {
          const mat = m as THREE.MeshStandardMaterial;
          if (!('wireframe' in mat)) return;
          mat.wireframe = on;
          if (on) {
            // Cache original color; use dark ink so edges are visible on parchment bg
            if (!(mat.userData as Record<string, unknown>)['_origColor']) {
              (mat.userData as Record<string, unknown>)['_origColor'] = mat.color.clone();
            }
            mat.color.set(INK);
          } else {
            const orig = (mat.userData as Record<string, unknown>)['_origColor'] as THREE.Color | undefined;
            if (orig) mat.color.copy(orig);
          }
        });
      });
    }

    // Build EdgesGeometry + LineSegments overlays on GLTF meshes for the edges mode.
    // Overlays are cached in mesh.userData._edgesLines and reused on subsequent toggles.
    function applyEdgesMode(group: THREE.Group, on: boolean) {
      group.traverse(c => {
        if (!c.userData.isExternalModel) return;
        const mesh = c as THREE.Mesh;
        if (!mesh.isMesh) return;
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

    let loadToken = 0;

    function loadProject(idx: number) {
      const token = loadToken + 1;
      loadToken = token;
      if (currentGroup) {
        const old = currentGroup;
        animateOpacity(old, () => 0, 350);
        setTimeout(() => {
          scene.remove(old);
          disposeObject3D(old);
        }, 400);
        currentGroup = null;
      }

      const addGroup = (g: THREE.Group) => {
        if (loadToken !== token) { disposeObject3D(g); return; }
        g.traverse(c => {
          const mesh = c as THREE.Mesh;
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : mesh.material
              ? [mesh.material]
              : [];
          (mats as Array<THREE.Material & { opacity: number }>).forEach((mat) => {
            mat.transparent = true;
            mat.opacity = 0;
          });
        });
        applyWireframeMode(g, mode === 'wireframe');
        applyEdgesMode(g, mode === 'edges');
        scene.add(g);
        currentGroup = g;
        setTimeout(() => { if (currentGroup === g) animateOpacity(g, opFn(mode), 600); }, 50);
      };

      const projectModelUrl = displayProjects[idx]?.modelUrl?.trim();
      if (projectModelUrl !== undefined && projectModelUrl.length > 0) {
        void loadGltfModel(projectModelUrl)
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
          .catch(() => addGroup(makeProjectGroup(idx)));
      } else {
        addGroup(makeProjectGroup(idx));
      }
      currentIdx = idx;

      const ct = camTargets[idx];
      const sp = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      const st = controls.target.y;
      const dur = 1200, ts = Date.now();
      const camAnim = () => {
        const t = Math.min((Date.now() - ts) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        camera.position.set(sp.x + (ct.x - sp.x) * e, sp.y + (ct.y - sp.y) * e, sp.z + (ct.z - sp.z) * e);
        controls.target.y = st + (ct.ty - st) * e;
        if (t < 1) requestAnimationFrame(camAnim);
      };
      requestAnimationFrame(camAnim);
    }

    function doZoom(factor: number) {
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
      const dist = camera.position.distanceTo(controls.target);
      const next = Math.min(Math.max(dist * factor, controls.minDistance), controls.maxDistance);
      const target = controls.target.clone().addScaledVector(dir, next);
      const startPos = camera.position.clone();
      const ts = Date.now(), dur = 400;
      const tick = () => {
        const t = Math.min((Date.now() - ts) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(startPos, target, e);
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    const pavingMat = pavingMesh.material as THREE.Material & { opacity: number };

    sceneRef.current = {
      loadProject,
      setMode: (m: RenderMode) => {
        mode = m;
        animateMat(pavingMat, m === 'textured' ? 0.88 : 0, 600);
        animateMat(gridMat, m === 'textured' ? 0.18 : 0.60, 600);
        if (currentGroup) {
          applyWireframeMode(currentGroup, m === 'wireframe');
          applyEdgesMode(currentGroup, m === 'edges');
          animateOpacity(currentGroup, opFn(m), 500);
        }
      },
      zoom: doZoom,
    };

    loadProject(0);

    function onResize() {
      sizeCanvas();
      camera.aspect = canvas!.offsetWidth / canvas!.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas!.offsetWidth, canvas!.offsetHeight);
    }
    window.addEventListener('resize', onResize);

    const bgParchment = new THREE.Color(0xECEAE6);
    const bgSky       = new THREE.Color(0xE2ECF4);
    const bgCurrent   = new THREE.Color(0xECEAE6);

    let rafId: number;
    function animate() {
      rafId = requestAnimationFrame(animate);
      controls.update();
      bgCurrent.lerp(mode === 'textured' ? bgSky : bgParchment, 0.05);
      renderer.setClearColor(bgCurrent, 1);
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', pauseRotate);
      canvas.removeEventListener('pointerup', resumeRotate);
      if (currentGroup) disposeObject3D(currentGroup);
      controls.dispose();
      envTex.dispose();
      renderer.dispose();
    };
  }, []);

  const handleProjectClick = (i: number) => {
    setActiveIdx(i);
    sceneRef.current?.loadProject(i);
  };

  const setMode = (m: RenderMode) => { setRenderMode(m); sceneRef.current?.setMode(m); };
  const active = displayProjects[activeIdx];

  return (
    <section className="viewer-section">
      <div className="viewer-wrap">
        <div className="viewer-sidebar">
          <div className="viewer-sec-num rev" style={{ fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '.22em', color: 'var(--accent)', marginBottom: '4px' }}>
            — 04b / interactive
          </div>
          <p className="rev" style={{ fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '.28em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '24px' }}>
            3d model viewer
          </p>
          <h3 className="rev" style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 'clamp(24px, 2.4vw, 38px)', lineHeight: 1.06, letterSpacing: '-.02em', marginBottom: '32px', color: 'var(--ink)' }}>
            Explore the <em style={{ color: 'var(--ink-2)' }}>work in three dimensions.</em>
          </h3>

          <div className="vp-list">
            {displayProjects.map((p, i) => (
              <button
                key={p.code}
                className={`vp-btn${activeIdx === i ? ' active' : ''}`}
                onClick={() => handleProjectClick(i)}
              >
                <div className="vp-btn-code">{p.code.replace('-', ' — ')}</div>
                <div className="vp-btn-name">{p.name}</div>
                <div className="vp-btn-type">{p.city} · {p.projectType}</div>
              </button>
            ))}
          </div>

          <div className="viewer-mode">
            <div className="viewer-mode-label">render mode</div>
            <div className="viewer-mode-btns">
              <button className={`vmb${renderMode === 'edges'       ? ' active' : ''}`} onClick={() => setMode('edges')}>edges</button>
              <button className={`vmb${renderMode === 'wireframe'   ? ' active' : ''}`} onClick={() => setMode('wireframe')}>wireframe</button>
              <button className={`vmb${renderMode === 'transparent' ? ' active' : ''}`} onClick={() => setMode('transparent')}>transparent</button>
              <button className={`vmb${renderMode === 'solid'       ? ' active' : ''}`} onClick={() => setMode('solid')}>solid</button>
              <button className={`vmb${renderMode === 'textured'    ? ' active' : ''}`} onClick={() => setMode('textured')}>textured</button>
            </div>
          </div>
        </div>

        <div className="viewer-canvas-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} id="viewer-canvas" aria-label="Interactive 3D architectural model" />
          <div className="viewer-overlay-info">
            <span className="voi-code">{active?.code}</span>
            {active?.stats.map((s, i) => <span key={i} className="voi-stat">{s}</span>)}
          </div>
          <div className="viewer-zoom-btns">
            <button
              className="vzb"
              aria-label="Zoom in"
              onClick={() => sceneRef.current?.zoom(0.78)}
            >+</button>
            <button
              className="vzb"
              aria-label="Zoom out"
              onClick={() => sceneRef.current?.zoom(1.28)}
            >−</button>
          </div>
          <div className="viewer-drag-hint">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <circle cx="5.5" cy="5.5" r="5" stroke="currentColor" strokeWidth=".7" />
              <path d="M2.5 5.5h6M5.5 2.5v6" stroke="currentColor" strokeWidth=".7" />
            </svg>
            drag to orbit
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(ProjectViewer);
