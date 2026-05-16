import * as THREE from 'three';

export const INK   = 0x1A1918;
export const INK_2 = 0x6A6560;
export const INK_3 = 0x9C978F;
export const PAPER  = 0xF9F8F5;
export const PAPER2 = 0xF2F1ED;
export const PAPER3 = 0xECEAE6;

export type MatHint = 'glass' | 'concrete' | 'plaster';

// ── Canvas tile builders ──────────────────────────────────────────────────
// Each produces a small repeating tile. Canvases are built once and cached;
// every THREE.Texture(canvas) shares the same GPU upload.
const _canvasCache = new Map<MatHint, HTMLCanvasElement>();

const canCreateCanvas = (): boolean =>
  typeof document !== 'undefined' && typeof document.createElement === 'function';

function glassCanvas(): HTMLCanvasElement {
  // Tile = one curtain-wall panel: 48×72 px → 0.9 m × 1.5 m real-world
  const W = 48, H = 72, frame = 2, spanH = 14;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  // Aluminium mullion background
  ctx.fillStyle = '#292623';
  ctx.fillRect(0, 0, W, H);
  // Spandrel strip (opaque dark metal at top of each floor band)
  ctx.fillStyle = '#34302B';
  ctx.fillRect(frame, frame, W - frame * 2, spanH);
  // Glass panel — cool sky-reflection gradient
  const grad = ctx.createLinearGradient(frame, frame + spanH, frame, H - frame);
  grad.addColorStop(0,    '#B2C8DE');
  grad.addColorStop(0.30, '#A4BACF');
  grad.addColorStop(0.70, '#93A9BC');
  grad.addColorStop(1,    '#86A0AB');
  ctx.fillStyle = grad;
  ctx.fillRect(frame, frame + spanH, W - frame * 2, H - frame * 2 - spanH);
  // Single vertical reflection streak (left edge)
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(frame + 2, frame + spanH + 3, Math.floor((W - frame * 2) * 0.22), H - frame * 2 - spanH - 6);
  return cv;
}

function concreteCanvas(): HTMLCanvasElement {
  // Tile = one formwork-board tier: 512×28 px → 2.0 m × 0.22 m real-world
  const W = 512, H = 28;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#C2BEB7';
  ctx.fillRect(0, 0, W, H);
  // Micro-grain noise
  for (let i = 0; i < 640; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  // Board joint lines at top and bottom
  ctx.strokeStyle = 'rgba(0,0,0,0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 0.5);     ctx.lineTo(W, 0.5);     ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, H - 0.5); ctx.lineTo(W, H - 0.5); ctx.stroke();
  // Formwork tie holes — 3 per tile → every 0.5 m in real-world
  [128, 256, 384].forEach(x => {
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.beginPath(); ctx.arc(x, H / 2, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.beginPath(); ctx.arc(x, H / 2, 2.8, 0, Math.PI * 2); ctx.fill();
  });
  return cv;
}

function plasterCanvas(): HTMLCanvasElement {
  // Tile = one render-plaster zone: 128×128 px → 1.8 m × 2.2 m real-world
  const W = 128, H = 128;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#DEDBD4';
  ctx.fillRect(0, 0, W, H);
  // Subtle grain
  for (let i = 0; i < 320; i++) {
    ctx.fillStyle = `rgba(0,0,0,${0.012 + Math.random() * 0.022})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }
  // Expansion / render-coat joint lines every ~H/3 ≈ 43 px → ~730 mm
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 1;
  for (let y = H / 3; y < H - 2; y += H / 3) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Faint perimeter outline
  ctx.strokeStyle = 'rgba(0,0,0,0.05)';
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
  return cv;
}

function getBaseCanvas(m: MatHint): HTMLCanvasElement {
  if (_canvasCache.has(m)) return _canvasCache.get(m)!;
  if (!canCreateCanvas()) {
    throw new Error('Canvas facade textures are only available in the browser.');
  }
  const cv = m === 'glass' ? glassCanvas() : m === 'concrete' ? concreteCanvas() : plasterCanvas();
  _canvasCache.set(m, cv);
  return cv;
}

// Build a PBR material with a tiled facade texture.
// tintHex is multiplied with the map (0xFFFFFF = no tint).
function facadeMat(w: number, h: number, m: MatHint, tintHex = 0xFFFFFF): THREE.MeshStandardMaterial {
  let roughness: number, metalness: number, envMapIntensity: number;
  if (m === 'glass') {
    roughness = 0.12; metalness = 0.12; envMapIntensity = 1.0;
  } else if (m === 'concrete') {
    roughness = 0.88; metalness = 0;   envMapIntensity = 0.28;
  } else {
    roughness = 0.76; metalness = 0;   envMapIntensity = 0.32;
  }

  if (!canCreateCanvas()) {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(tintHex),
      roughness, metalness, envMapIntensity,
      transparent: true, opacity: 0,
    });
  }

  const tex = new THREE.Texture(getBaseCanvas(m));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;

  if (m === 'glass') {
    tex.repeat.set(w / 0.9,  h / 1.5);
  } else if (m === 'concrete') {
    tex.repeat.set(w / 2.0,  h / 0.22);
  } else {
    tex.repeat.set(w / 1.8,  h / 2.2);
  }

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: new THREE.Color(tintHex),
    roughness, metalness, envMapIntensity,
    transparent: true, opacity: 0,
  });
}

// ── Geometry builders ─────────────────────────────────────────────────────

export function addBox(
  group: THREE.Group,
  x: number, y: number, z: number,
  w: number, h: number, d: number,
  lineColor: number, lineOp: number,
  meshColor?: number,
  matHint: MatHint = 'plaster',
  tintHex = 0xFFFFFF,
) {
  const geo = new THREE.BoxGeometry(w, h, d);

  const wf = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: lineColor, transparent: true, opacity: lineOp }),
  );
  wf.position.set(x, y, z);
  wf.userData.isWire = true;
  group.add(wf);

  const solidMesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ color: meshColor ?? PAPER, transparent: true, opacity: 0 }),
  );
  solidMesh.position.set(x, y, z);
  solidMesh.castShadow = true;
  solidMesh.receiveShadow = true;
  solidMesh.userData.isSolid = true;
  group.add(solidMesh);

  const texMesh = new THREE.Mesh(geo, facadeMat(w, h, matHint, tintHex));
  texMesh.position.set(x, y, z);
  texMesh.castShadow = true;
  texMesh.receiveShadow = true;
  texMesh.userData.isTexture = true;
  group.add(texMesh);
}

// Thin concrete slab edge — visible only in textured mode, protrudes from face
function addSlabEdge(
  group: THREE.Group,
  cx: number, y: number, cz: number,
  w: number, d: number,
) {
  const edgeH = 0.26;
  const geo = new THREE.BoxGeometry(w, edgeH, d);
  const mesh = new THREE.Mesh(geo, facadeMat(w, edgeH, 'concrete', 0xD8D4CE));
  mesh.position.set(cx, y, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.isTexture = true;
  group.add(mesh);
}

export function addFloorPlate(
  group: THREE.Group,
  x: number, y: number, z: number,
  w: number, d: number,
  color: number, opacity: number,
) {
  const hw = w / 2, hd = d / 2;
  const pts = [
    new THREE.Vector3(x - hw, y, z - hd),
    new THREE.Vector3(x + hw, y, z - hd),
    new THREE.Vector3(x + hw, y, z + hd),
    new THREE.Vector3(x - hw, y, z + hd),
    new THREE.Vector3(x - hw, y, z - hd),
  ];
  const l = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  l.userData.isWire = true;
  group.add(l);
}

export function makeProjectGroup(idx: number): THREE.Group {
  const g = new THREE.Group();
  g.position.y = 0.02;

  if (idx === 0) {
    // ── Helios Tower ─────────────────────────────────────────────────────
    // Glass shaft: cool blue tint; podium: neutral concrete
    addBox(g, 0, 14,   0, 3.6, 28, 3.6, INK,   0.8, PAPER2, 'glass',    0xD8EEF8);
    addBox(g, 0, 30.5, 0, 3,   3,  3,   INK_2, 0.7, PAPER3, 'glass',    0xCCE2F0);
    addBox(g, 0, 1.5,  0, 6,   3,  6,   INK_3, 0.5, PAPER,  'concrete', 0xDDDAD4);
    for (let y = 1; y <= 28; y += 1.2) addFloorPlate(g, 0, y, 0, 3.6, 3.6, INK_3, 0.25);
  } else if (idx === 1) {
    // ── Kulturhaus ────────────────────────────────────────────────────────
    // Fair-face concrete — warm limestone tint throughout
    const lTint = 0xF0E8D4; // warm limestone
    addBox(g,  0,   3,   0, 14,  6, 8, INK,   0.75, PAPER2, 'concrete', lTint);
    addBox(g,  3.5, 8.5, 0, 9,   5, 6, INK,   0.75, PAPER,  'concrete', lTint);
    addBox(g,  7.5, 8.5, 0, 0.2, 5, 6, INK_2, 0.6,  PAPER3, 'concrete', lTint);
    addBox(g, -4,   3,   0, 3,   4, 8, INK_3, 0.35, PAPER2, 'concrete', lTint);
    for (let y = 1.5; y <= 6; y += 1.5) addFloorPlate(g, 0, y, 0, 14, 8, INK_3, 0.2);
    // 3D slab edges on main hall at each floor level (protrude 0.06 m per face)
    for (let y = 1.5; y <= 4.5; y += 1.5) addSlabEdge(g, 0, y, 0, 14.12, 8.12);
  } else {
    // ── South Quarter ─────────────────────────────────────────────────────
    // Warm ochre-cream plaster — distinct from both glass and concrete
    const pTint = 0xFFF0E0; // warm ochre
    addBox(g, -5,   4,   0, 6,   8,  5,   INK, 0.75, PAPER,  'plaster', pTint);
    addBox(g,  1,   6,   0, 5,   12, 4.5, INK, 0.75, PAPER2, 'plaster', pTint);
    addBox(g,  6.5, 8.5, 0, 3.5, 17, 4,   INK, 0.75, PAPER3, 'plaster', pTint);
    for (let y = 2; y <= 8;  y += 2) addFloorPlate(g, -5,  y, 0, 6.4, 5.4, INK_2, 0.3);
    for (let y = 2; y <= 12; y += 2) addFloorPlate(g,  1,  y, 0, 5.4, 5,   INK_3, 0.2);
    for (let y = 2; y <= 17; y += 2) addFloorPlate(g,  6.5, y, 0, 4,  4.5, INK_3, 0.2);
    // 3D slab edges (protrude 0.06 m per face, neutral concrete tone)
    for (let y = 2; y <= 8;  y += 2) addSlabEdge(g, -5,   y, 0, 6.12, 5.12);
    for (let y = 2; y <= 12; y += 2) addSlabEdge(g,  1,   y, 0, 5.12, 4.62);
    for (let y = 2; y <= 17; y += 2) addSlabEdge(g,  6.5, y, 0, 3.62, 4.12);
  }
  return g;
}

// Interactive viewer camera presets (perspective)
export const VIEWER_CAM = [
  { x: 22, y: 18, z: 22, ty: 8  },
  { x: 20, y: 12, z: 20, ty: 5  },
  { x: 18, y: 15, z: 18, ty: 6  },
];
