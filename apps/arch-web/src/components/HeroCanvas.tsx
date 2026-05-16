'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { disposeObject3D, fitObjectToBox, loadGltfModel, prepareLoadedModel } from '@/lib/threeModelUtils';

function HeroCanvas({ modelUrl }: { modelUrl?: string }) {
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
    const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 300);
    camera.position.set(10, 16, 10);
    camera.lookAt(0, 2, 0);

    const resolvedModelUrl = modelUrl?.trim();
    if (resolvedModelUrl !== undefined && resolvedModelUrl.length > 0) {
      scene.add(new THREE.AmbientLight(0xF9F8F5, 0.9));
      const key = new THREE.DirectionalLight(0xFFF4E0, 1.2);
      key.position.set(8, 18, 12);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xE8EFF8, 0.45);
      fill.position.set(-10, 8, -8);
      scene.add(fill);

      let cancelled = false;
      let loadedModel: THREE.Group | null = null;
      void loadGltfModel(resolvedModelUrl)
        .then((group) => {
          if (cancelled) {
            disposeObject3D(group);
            return;
          }
          prepareLoadedModel(group);
          fitObjectToBox(group, 16, new THREE.Vector3(0, 4.5, 0));
          scene.add(group);
          loadedModel = group;
        })
        .catch(() => undefined);

      let heroMouseX = 0, heroMouseY = 0;
      let targetX = 0, targetY = 0;
      const onMouseMove = (e: MouseEvent) => {
        targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
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

      let t = 0, rafId: number;
      function animate() {
        rafId = requestAnimationFrame(animate);
        t += 0.0005;
        heroMouseX += (targetX - heroMouseX) * 0.055;
        heroMouseY += (targetY - heroMouseY) * 0.055;
        camera.position.x = 10 + Math.sin(t) * 1.1 + heroMouseX * 5.5;
        camera.position.z = 10 + Math.cos(t) * 1.1 + heroMouseY * 4.2;
        camera.position.y = 16 + heroMouseY * 3.8;
        camera.lookAt(0, 3, 0);
        renderer.render(scene, camera);
      }
      animate();

      return () => {
        cancelled = true;
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        window.removeEventListener('mousemove', onMouseMove);
        if (loadedModel !== null) disposeObject3D(loadedModel);
        renderer.dispose();
      };
    }

    const html = document.documentElement;

    function getLineColor()   { return html.dataset.theme === 'nightly' ? 0xE8E5DC : 0x1A1918; }
    function getLineOpacity() { return html.dataset.theme === 'nightly' ? 0.30 : 0.20; }
    function getAccentOpacity() { return html.dataset.theme === 'nightly' ? 0.68 : 0.48; }

    // Ground grid
    const gridLines: THREE.Object3D[] = [];
    function buildGrid() {
      gridLines.forEach(l => scene.remove(l));
      gridLines.length = 0;
      const mat = new THREE.LineBasicMaterial({ color: getLineColor(), transparent: true, opacity: getLineOpacity() * 0.45 });
      for (let i = -12; i <= 12; i++) {
        const g1 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(i * 2.5, -0.01, -30), new THREE.Vector3(i * 2.5, -0.01, 30)]);
        const g2 = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-30, -0.01, i * 2.5), new THREE.Vector3(30, -0.01, i * 2.5)]);
        const l1 = new THREE.Line(g1, mat.clone());
        const l2 = new THREE.Line(g2, mat.clone());
        scene.add(l1); scene.add(l2);
        gridLines.push(l1, l2);
      }
    }
    buildGrid();

    type SetbackDef = { atH: number; shrink: number };
    type RooftopDef = { w: number; d: number; h: number; offX?: number; offZ?: number };
    type BuildingDef = {
      x: number; z: number; w: number; h: number; d: number;
      floorH?: number;
      setbacks?: SetbackDef[];
      rooftop?: RooftopDef[];
      podium?: { expand: number; h: number };
      facadeBaysX?: number;
      facadeBaysZ?: number;
      crossBrace?: boolean;
      isAccent?: boolean;
    };

    const buildingDefs: BuildingDef[] = [
      // ── Central landmark — 3-step Art Deco tower ──────────────────────────────
      {
        x: 0, z: 0, w: 2.4, h: 13.5, d: 2.4, isAccent: true, floorH: 1.1,
        podium: { expand: 0.55, h: 0.65 },
        setbacks: [{ atH: 7, shrink: 0.42 }, { atH: 10, shrink: 0.28 }, { atH: 12, shrink: 0.18 }],
        rooftop: [
          { w: 0.55, d: 0.55, h: 0.5 },             // cap
          { w: 0.34, d: 0.34, h: 3.8 },             // spire
        ],
        facadeBaysX: 3, facadeBaysZ: 3,
      },

      // ── North tower — 2-step with X-bracing ──────────────────────────────────
      {
        x: -1, z: -5.5, w: 1.5, h: 10, d: 1.5, floorH: 1.0,
        setbacks: [{ atH: 7, shrink: 0.30 }],
        rooftop: [{ w: 0.22, d: 0.22, h: 3.5 }],
        facadeBaysX: 2, facadeBaysZ: 2,
        crossBrace: true,
      },

      // ── East needle tower — very slender ──────────────────────────────────────
      {
        x: 5.2, z: -1.8, w: 1.1, h: 11, d: 1.1, floorH: 1.0,
        setbacks: [{ atH: 7.5, shrink: 0.22 }],
        rooftop: [{ w: 0.2, d: 0.2, h: 4.5 }],
        crossBrace: true,
      },

      // ── SE mid-rise with setback crown ────────────────────────────────────────
      {
        x: 4.5, z: 2.5, w: 2.0, h: 7.5, d: 1.8, floorH: 0.9,
        setbacks: [{ atH: 5, shrink: 0.30 }],
        rooftop: [
          { w: 0.55, d: 0.4, h: 0.55, offX: -0.38, offZ: 0 },
          { w: 0.28, d: 0.28, h: 1.5,  offX:  0.32, offZ: 0.18 },
        ],
        facadeBaysX: 2, facadeBaysZ: 2,
      },

      // ── Wide west block — podium + rooftop cluster ────────────────────────────
      {
        x: -5.5, z: 0, w: 3.8, h: 4.5, d: 2.8, floorH: 0.8,
        podium: { expand: 0.35, h: 0.45 },
        rooftop: [
          { w: 0.85, d: 0.65, h: 0.55, offX: -1.0, offZ: -0.5 },
          { w: 0.65, d: 0.55, h: 0.50, offX:  0.8, offZ:  0.4 },
          { w: 0.35, d: 0.35, h: 1.65, offX: -0.2, offZ:  0.3 },
          { w: 0.25, d: 0.25, h: 0.95, offX:  1.2, offZ: -0.6 },
        ],
        facadeBaysX: 4, facadeBaysZ: 3,
      },

      // ── NW tower — 2-step stepped ─────────────────────────────────────────────
      {
        x: -4, z: -3.5, w: 1.5, h: 9, d: 1.5, floorH: 1.0,
        setbacks: [{ atH: 6, shrink: 0.32 }, { atH: 7.8, shrink: 0.20 }],
        rooftop: [{ w: 0.28, d: 0.28, h: 2.2 }],
        facadeBaysX: 2, facadeBaysZ: 2,
      },

      // ── SW corner building ────────────────────────────────────────────────────
      {
        x: -4, z: 3.5, w: 2.2, h: 6, d: 1.8, floorH: 0.85,
        setbacks: [{ atH: 4.2, shrink: 0.35 }],
        rooftop: [
          { w: 0.5,  d: 0.4, h: 0.5, offX: -0.45, offZ: 0 },
          { w: 0.25, d: 0.25, h: 1.0, offX:  0.38, offZ: -0.2 },
        ],
        facadeBaysX: 2,
      },

      // ── NE slab ───────────────────────────────────────────────────────────────
      {
        x: 3, z: -4.5, w: 2.0, h: 7, d: 1.5, floorH: 0.9,
        rooftop: [
          { w: 0.42, d: 0.35, h: 0.5, offX: -0.55, offZ: 0 },
          { w: 0.30, d: 0.28, h: 1.2, offX:  0.50, offZ: 0 },
        ],
        facadeBaysX: 3, facadeBaysZ: 2,
      },

      // ── Far-SE needle ─────────────────────────────────────────────────────────
      {
        x: 7.5, z: 1, w: 1.1, h: 9.5, d: 1.1, floorH: 1.0,
        setbacks: [{ atH: 6.5, shrink: 0.18 }],
        rooftop: [{ w: 0.18, d: 0.18, h: 4.5 }],
        crossBrace: true,
      },

      // ── Far-NW block ──────────────────────────────────────────────────────────
      {
        x: -7.5, z: -2, w: 2.0, h: 6.5, d: 1.8, floorH: 0.9,
        rooftop: [
          { w: 0.45, d: 0.35, h: 0.5,  offX: -0.48, offZ: 0 },
          { w: 0.22, d: 0.22, h: 1.35, offX:  0.48, offZ: 0 },
        ],
        facadeBaysX: 2,
      },

      // ── South low-rise ────────────────────────────────────────────────────────
      {
        x: 1.5, z: 5.5, w: 2.8, h: 4.2, d: 2.2, floorH: 0.8,
        rooftop: [
          { w: 0.70, d: 0.50, h: 0.48, offX: -0.70, offZ: -0.4 },
          { w: 0.52, d: 0.45, h: 0.48, offX:  0.60, offZ:  0.3 },
          { w: 0.28, d: 0.28, h: 1.15, offX:  0,    offZ:  0 },
        ],
        facadeBaysX: 3, facadeBaysZ: 2,
      },

      // ── Far-north anchor ──────────────────────────────────────────────────────
      {
        x: -1, z: -8.5, w: 2.0, h: 5.5, d: 2.0, floorH: 0.85,
        rooftop: [{ w: 0.35, d: 0.35, h: 0.55 }],
      },

      // ── Far-east accent ───────────────────────────────────────────────────────
      {
        x: 8.5, z: -3.5, w: 1.4, h: 5, d: 1.4, floorH: 0.85,
        rooftop: [{ w: 0.28, d: 0.28, h: 1.0 }],
      },
    ];

    const buildingMeshes: THREE.Group[] = [];

    function buildBuildings() {
      buildingMeshes.forEach(b => scene.remove(b));
      buildingMeshes.length = 0;
      const col = getLineColor();
      const op  = getLineOpacity();
      const accentOp = getAccentOpacity();
      const isNightly = html.dataset.theme === 'nightly';

      buildingDefs.forEach((b) => {
        const group   = new THREE.Group();
        const lineCol = b.isAccent ? (isNightly ? 0xC4B9A8 : 0x5A5250) : col;
        const lineOp  = b.isAccent ? accentOp : op;

        const mkMat  = (o = lineOp) => new THREE.LineBasicMaterial({ color: lineCol, transparent: true, opacity: o });
        const mkFMat = () => new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op * 0.45 });
        const mkRMat = () => new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op * 0.60 });
        const mkBMat = () => new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op * 0.28 });

        // Podium base
        if (b.podium) {
          const pw = b.w + b.podium.expand * 2, pd = b.d + b.podium.expand * 2, ph = b.podium.h;
          const pw2 = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(pw, ph, pd)), mkMat());
          pw2.position.y = ph / 2;
          group.add(pw2);
        }

        // Compute tier slices from setbacks
        type Tier = { w: number; d: number; y0: number; y1: number };
        const tiers: Tier[] = [];
        if (b.setbacks && b.setbacks.length > 0) {
          const sorted = [...b.setbacks].sort((a, z) => a.atH - z.atH);
          let pH = 0, pW = b.w, pD = b.d;
          for (const sb of sorted) {
            tiers.push({ w: pW, d: pD, y0: pH, y1: sb.atH });
            pH = sb.atH; pW = b.w - sb.shrink * 2; pD = b.d - sb.shrink * 2;
          }
          tiers.push({ w: pW, d: pD, y0: pH, y1: b.h });
        } else {
          tiers.push({ w: b.w, d: b.d, y0: 0, y1: b.h });
        }

        for (const tier of tiers) {
          const tH = tier.y1 - tier.y0;
          if (tH < 0.05 || tier.w < 0.05 || tier.d < 0.05) continue;
          const hw = tier.w / 2, hd = tier.d / 2;

          // Box edges
          const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(tier.w, tH, tier.d)), mkMat());
          wire.position.y = tier.y0 + tH / 2;
          group.add(wire);

          // Horizontal floor lines
          const fh = b.floorH ?? 0.9;
          for (let y = tier.y0 + fh; y < tier.y1 - 0.05; y += fh) {
            const pts = [
              new THREE.Vector3(-hw, y, -hd), new THREE.Vector3(hw, y, -hd),
              new THREE.Vector3(hw, y,  hd),  new THREE.Vector3(-hw, y,  hd),
              new THREE.Vector3(-hw, y, -hd),
            ];
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mkFMat()));
          }

          // Vertical facade bay mullions
          const bX = b.facadeBaysX ?? 0, bZ = b.facadeBaysZ ?? 0;
          for (let i = 1; i < bX; i++) {
            const x = -hw + (tier.w / bX) * i;
            const front = [new THREE.Vector3(x, tier.y0, -hd), new THREE.Vector3(x, tier.y1, -hd)];
            const back  = [new THREE.Vector3(x, tier.y0,  hd), new THREE.Vector3(x, tier.y1,  hd)];
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(front), mkBMat()));
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(back),  mkBMat()));
          }
          for (let i = 1; i < bZ; i++) {
            const z = -hd + (tier.d / bZ) * i;
            const left  = [new THREE.Vector3(-hw, tier.y0, z), new THREE.Vector3(-hw, tier.y1, z)];
            const right = [new THREE.Vector3( hw, tier.y0, z), new THREE.Vector3( hw, tier.y1, z)];
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(left),  mkBMat()));
            group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(right), mkBMat()));
          }

          // Cross-bracing on ground tier of slender towers
          if (b.crossBrace && tier.y0 === 0) {
            const segs = Math.max(1, Math.round(tH / 3.5));
            const sH   = tH / segs;
            for (let s = 0; s < segs; s++) {
              const y0 = tier.y0 + s * sH, y1 = tier.y0 + (s + 1) * sH;
              // front face
              group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-hw, y0, -hd), new THREE.Vector3(hw, y1, -hd)]), mkBMat()));
              group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3( hw, y0, -hd), new THREE.Vector3(-hw, y1, -hd)]), mkBMat()));
              // back face
              group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-hw, y0, hd), new THREE.Vector3(hw, y1, hd)]), mkBMat()));
              group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3( hw, y0, hd), new THREE.Vector3(-hw, y1, hd)]), mkBMat()));
            }
          }
        }

        // Rooftop structures
        if (b.rooftop) {
          for (const rt of b.rooftop) {
            const rtWire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(rt.w, rt.h, rt.d)), mkRMat());
            rtWire.position.set(rt.offX ?? 0, b.h + rt.h / 2, rt.offZ ?? 0);
            group.add(rtWire);
          }
        }

        group.position.set(b.x, 0, b.z);
        scene.add(group);
        buildingMeshes.push(group);
      });
    }
    buildBuildings();

    // Staggered rise animation
    buildingMeshes.forEach((g, i) => {
      g.scale.y = 0.01;
      const start = Date.now() + 1200 + i * 60;
      const dur   = 1800;
      function tick() {
        const elapsed = Date.now() - start;
        if (elapsed < 0) { requestAnimationFrame(tick); return; }
        const t    = Math.min(elapsed / dur, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        g.scale.y  = 0.01 + ease * 0.99;
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });

    // Smooth mouse tracking with lerp
    let heroMouseX = 0, heroMouseY = 0;
    let targetX    = 0, targetY    = 0;
    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth  - 0.5) * 2;
      targetY = (e.clientY / window.innerHeight - 0.5) * 2;
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
      t += 0.0005;
      heroMouseX += (targetX - heroMouseX) * 0.055;
      heroMouseY += (targetY - heroMouseY) * 0.055;
      camera.position.x = 10 + Math.sin(t) * 1.1 + heroMouseX * 5.5;
      camera.position.z = 10 + Math.cos(t) * 1.1 + heroMouseY * 4.2;
      camera.position.y = 16 + heroMouseY * 3.8;
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
  }, [modelUrl]);

  return (
    <canvas
      id="hero-canvas"
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}

export default memo(HeroCanvas);
