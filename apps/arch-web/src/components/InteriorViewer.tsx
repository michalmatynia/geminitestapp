'use client';

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useFloorPlanSlots, type Slots } from '@/lib/floorPlanContext';

// 1 unit = 1 m  |  PW=10m wide, PD=7m deep, z=0 is north wall
const PW = 10, PD = 7, CH = 2.8, WT = 0.09;

const INK   = 0x1A1918;
const INK_2 = 0x6A6560;
const INK_3 = 0x9C978F;
const PAPER  = 0xF9F8F5;
const PAPER2 = 0xF2F1ED;
const PAPER3 = 0xECEAE6;
const RUG1   = 0xD4CEC6;
const RUG2   = 0xC8C2BA;
const FOLIAGE = 0xC0C8B0;

const WEIGHTS: Record<string, number> = {
  living: 1.0, bedroom: 1.6, studio: 2.4, amenity: 1.3,
};

function partitions(slots: Slots) {
  const w0 = WEIGHTS[slots[0]] + WEIGHTS[slots[1]];
  const w1 = WEIGHTS[slots[2]] + WEIGHTS[slots[3]];
  return {
    cx: PW * w0 / (w0 + w1),
    lz: PD * WEIGHTS[slots[0]] / w0,
    rz: PD * WEIGHTS[slots[2]] / w1,
  };
}

// ── Core box helper  (mo === 0 → wireframe only, no fill mesh)
function b(
  g: THREE.Group,
  cx: number, cy: number, cz: number,
  w: number, h: number, d: number,
  color: number,
  wc = INK_3, wo = 0.45, mo = 1,
) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (mo > 0) {
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color, transparent: mo < 1, opacity: mo,
      side: THREE.FrontSide,
    }));
    mesh.position.set(cx, cy, cz); mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
  }
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color: wc, transparent: true, opacity: wo }),
  );
  wire.position.set(cx, cy, cz); g.add(wire);
}

// ──────────────────────────────────────────────────────────────────────────────
// FURNITURE CONSTRUCTORS
// All take absolute world positions.  cy param = bottom of furniture (floor level)
// ──────────────────────────────────────────────────────────────────────────────

function fRug(g: THREE.Group, cx: number, cz: number, w: number, d: number, col = RUG1) {
  b(g, cx, 0.008, cz, w, 0.016, d, col, INK_3, 0.22);
  b(g, cx, 0.009, cz, w - 0.08, 0.004, d - 0.08, RUG2, INK_3, 0.18); // inner border — h and d were swapped, causing a tall vertical plane
}

// sofa — back wall at z=backWallZ, open front faces away from backWallZ
function fSofa(g: THREE.Group, cx: number, backWallZ: number, w: number, towardNegZ: boolean) {
  const sw = Math.min(w * 0.9, 2.4);
  const sd = 0.9, sh = 0.42, bh = 0.48, aw = 0.12, lh = 0.09;
  const dir = towardNegZ ? -1 : 1;       // direction sofa "opens" toward
  const cz  = backWallZ + dir * sd / 2;  // sofa seat center z
  const bkZ = backWallZ + dir * 0.09;    // back panel z

  // Legs ×4
  [[sw/2-0.14, -sd/2+0.12], [-sw/2+0.14, -sd/2+0.12],
   [sw/2-0.14,  sd/2-0.12], [-sw/2+0.14,  sd/2-0.12]]
    .forEach(([dx, dz]) => b(g, cx+dx, lh/2, cz + (dz as number)*dir, 0.055, lh, 0.055, PAPER3, INK, 0.65));

  // Seat base
  b(g, cx, lh + sh/2,          cz,   sw,        sh,      sd,   PAPER2, INK_3, 0.5);
  // Seat cushion highlight
  b(g, cx, lh + sh - 0.02,     cz + dir*0.05, sw-aw*2-0.06, 0.08, sd*0.62, PAPER, INK_3, 0.28);
  // Backrest
  b(g, cx, lh + sh + bh/2,     bkZ,  sw-aw*2,   bh,      0.14, PAPER, INK_3, 0.52);
  // Scatter cushions (2 small pillows leaning on backrest)
  b(g, cx - sw*0.22, lh+sh+0.18, bkZ+dir*0.06, 0.42, 0.36, 0.12, PAPER, INK_3, 0.28);
  b(g, cx + sw*0.22, lh+sh+0.18, bkZ+dir*0.06, 0.42, 0.36, 0.12, PAPER, INK_3, 0.28);
  // Armrests
  b(g, cx-sw/2+aw/2, lh+(sh+bh*0.74)/2, cz, aw, sh+bh*0.74, sd,    PAPER2, INK_3, 0.45);
  b(g, cx+sw/2-aw/2, lh+(sh+bh*0.74)/2, cz, aw, sh+bh*0.74, sd,    PAPER2, INK_3, 0.45);
}

function fCoffeeTable(g: THREE.Group, cx: number, cz: number, w: number, d: number) {
  const h = 0.44, th = 0.045, lr = 0.04;
  // 4 tapered-look legs
  [[w/2-0.09, d/2-0.08], [-w/2+0.09, d/2-0.08],
   [w/2-0.09, -d/2+0.08], [-w/2+0.09, -d/2+0.08]]
    .forEach(([dx, dz]) => b(g, cx+dx, h/2, cz+dz, lr, h, lr, PAPER3, INK_3, 0.5));
  b(g, cx, h+th/2,     cz, w,     th,      d,     PAPER2, INK_3, 0.5);   // top
  b(g, cx, h*0.34,     cz, w*0.7, th*0.7,  d*0.7, PAPER3, INK_3, 0.35); // lower shelf
}

function fArmchair(g: THREE.Group, cx: number, cz: number, backZ: number) {
  const w = 0.82, sd = 0.82, sh = 0.42, bh = 0.52, aw = 0.1;
  const dir = backZ < cz ? 1 : -1; // open side
  b(g, cx,          sh/2,            cz, w,      sh,        sd,    PAPER2, INK_3, 0.45); // seat
  b(g, cx,          sh+bh/2,         backZ+dir*0.08, w-aw*2, bh,   0.12,  PAPER,  INK_3, 0.5);  // back
  b(g, cx-w/2+aw/2, (sh+bh*0.7)/2,   cz, aw,    sh+bh*0.7,  sd*0.9, PAPER2, INK_3, 0.4);  // arm L
  b(g, cx+w/2-aw/2, (sh+bh*0.7)/2,   cz, aw,    sh+bh*0.7,  sd*0.9, PAPER2, INK_3, 0.4);  // arm R
}

function fSideTable(g: THREE.Group, cx: number, cz: number) {
  const h = 0.55, th = 0.035, r = 0.035;
  [[0.18, 0.16], [-0.18, 0.16], [0.18, -0.16], [-0.18, -0.16]]
    .forEach(([dx, dz]) => b(g, cx+dx, h/2, cz+dz, r, h, r, PAPER3, INK_3, 0.45));
  b(g, cx, h+th/2, cz, 0.45, th, 0.38, PAPER2, INK_3, 0.45);
}

function fFloorLamp(g: THREE.Group, cx: number, cz: number) {
  b(g, cx, 0.055, cz, 0.26, 0.11, 0.26, PAPER3, INK_3, 0.4);     // base disk
  b(g, cx, 1.35,  cz, 0.03, 2.7,  0.03, PAPER3, INK_2, 0.5);     // pole
  b(g, cx, 2.54,  cz, 0.35, 0.26, 0.35, PAPER2, INK_3, 0.45);    // shade
  b(g, cx, 2.42,  cz, 0.1,  0.04, 0.1,  PAPER3, INK_3, 0.35);    // shade rim
}

function fPlant(g: THREE.Group, cx: number, cz: number, scale = 1.0) {
  const s = scale;
  b(g, cx, 0.1*s,  cz, 0.22*s, 0.2*s,  0.22*s, PAPER3, INK_2, 0.5);   // pot
  b(g, cx, 0.21*s, cz, 0.15*s, 0.02*s, 0.15*s, PAPER2, INK_3, 0.35);  // soil
  b(g, cx, 0.46*s, cz, 0.4*s,  0.38*s, 0.4*s,  FOLIAGE, INK_3, 0.25, 0.88); // main foliage
  b(g, cx-0.12*s, 0.58*s, cz+0.1*s,  0.28*s, 0.26*s, 0.28*s, FOLIAGE, INK_3, 0.2,  0.72);
  b(g, cx+0.1*s,  0.54*s, cz-0.1*s,  0.22*s, 0.22*s, 0.22*s, FOLIAGE, INK_3, 0.18, 0.65);
}

// Bed — headboard against headZ wall, body extends toward bodyDir (-1 = toward -z, +1 = toward +z)
function fBed(g: THREE.Group, cx: number, headZ: number, w: number, bodyDir: 1 | -1) {
  const bw = Math.min(w, 1.8), bl = 2.02, bph = 0.5;
  const cz = headZ + bodyDir * bl / 2;
  const footZ = headZ + bodyDir * (bl - 0.06);

  b(g, cx, bph/2,          cz,   bw,      bph,   bl,    PAPER2, INK_3, 0.5);  // platform
  b(g, cx, bph+0.1,         cz,   bw-0.05, 0.2,   bl-0.06, PAPER, INK_3, 0.38); // mattress
  // Headboard (tall panel)
  b(g, cx, bph+0.54,  headZ+bodyDir*0.07, bw,     1.08, 0.1,  PAPER2, INK_2, 0.55);
  b(g, cx, bph+0.54,  headZ+bodyDir*0.02, bw-0.1, 0.92, 0.04, PAPER,  INK_3, 0.3);  // inset panel
  // Footboard
  b(g, cx, bph+0.26, footZ, bw, 0.52, 0.09, PAPER2, INK_3, 0.45);
  // Duvet (with rumple hint)
  b(g, cx, bph+0.17, cz+bodyDir*0.1, bw-0.06, 0.12, bl*0.68, PAPER2, INK_3, 0.4);
  b(g, cx, bph+0.23, cz+bodyDir*0.35, bw-0.1, 0.06, bl*0.1, PAPER,  INK_3, 0.3);  // fold
  // Pillows
  b(g, cx-bw/4+0.02, bph+0.23, headZ+bodyDir*0.3, 0.52, 0.1, 0.4, PAPER, INK_3, 0.28);
  b(g, cx+bw/4-0.02, bph+0.23, headZ+bodyDir*0.3, 0.52, 0.1, 0.4, PAPER, INK_3, 0.28);
}

function fNightstand(g: THREE.Group, cx: number, cz: number) {
  b(g, cx, 0.32, cz, 0.5, 0.64, 0.42, PAPER2, INK_3, 0.45);     // body
  b(g, cx, 0.645, cz, 0.52, 0.025, 0.44, PAPER3, INK_3, 0.4);   // top slab
  b(g, cx, 0.44, cz, 0.46, 0.01, 0.38, PAPER3, INK_3, 0.2);     // drawer gap line
  b(g, cx, 0.25, cz, 0.46, 0.01, 0.38, PAPER3, INK_3, 0.2);     // second drawer
  // Lamp
  b(g, cx+0.1, 0.73, cz-0.05, 0.06, 0.18, 0.06, PAPER3, INK_3, 0.4); // stem
  b(g, cx+0.1, 0.88, cz-0.05, 0.2, 0.2, 0.2, PAPER, INK_3, 0.28);    // shade
}

function fWardrobe(g: THREE.Group, cx: number, cz: number, w: number, d = 0.62) {
  const wh = 2.22;
  b(g, cx, wh/2,   cz, w,      wh,   d,    PAPER2, INK_2, 0.5);           // body
  b(g, cx, wh+0.05, cz, w+0.04, 0.1, d+0.04, PAPER2, INK_2, 0.45);        // cornice
  b(g, cx, wh/2,   cz-d/2+0.005, w*0.96, wh*0.92, 0.01, PAPER3, INK_3, 0.22); // door panel
  // Vertical split (2 doors)
  b(g, cx, wh/2, cz-d/2+0.01, 0.018, wh*0.9, 0.02, PAPER3, INK_2, 0.38);
  // Handles
  b(g, cx-0.12, wh*0.52, cz-d/2+0.01, 0.04, 0.14, 0.025, PAPER3, INK_2, 0.45);
  b(g, cx+0.12, wh*0.52, cz-d/2+0.01, 0.04, 0.14, 0.025, PAPER3, INK_2, 0.45);
}

function fDresser(g: THREE.Group, cx: number, cz: number, w: number) {
  const d = 0.5, h = 0.9;
  b(g, cx, h/2,     cz, w, h, d, PAPER2, INK_3, 0.45);               // body
  b(g, cx, h+0.025, cz, w+0.03, 0.05, d+0.03, PAPER3, INK_3, 0.4);  // top
  // 3 drawer lines
  [0.22, 0.52, 0.76].forEach(t => {
    b(g, cx, h*t, cz-d/2+0.005, w*0.92, 0.012, 0.015, PAPER3, INK_3, 0.28);
    b(g, cx, h*t, cz-d/2+0.008, 0.06, 0.06, 0.02, PAPER3, INK_2, 0.4); // handle
  });
}

function fReadingChair(g: THREE.Group, cx: number, cz: number) {
  const w = 0.72, sd = 0.72, sh = 0.44, bh = 0.58, aw = 0.1;
  b(g, cx, sh/2, cz, w, sh, sd, PAPER2, INK_3, 0.4);
  b(g, cx, sh+bh/2, cz-sd/2+0.09, w-aw*2, bh, 0.12, PAPER, INK_3, 0.48);
  b(g, cx-w/2+aw/2, (sh+bh*0.65)/2, cz, aw, sh+bh*0.65, sd*0.88, PAPER2, INK_3, 0.38);
  b(g, cx+w/2-aw/2, (sh+bh*0.65)/2, cz, aw, sh+bh*0.65, sd*0.88, PAPER2, INK_3, 0.38);
  // Footstool
  b(g, cx, 0.26, cz+sd*0.6, 0.5, 0.26, 0.4, PAPER2, INK_3, 0.35);
}

function fWorktable(g: THREE.Group, cx: number, cz: number, w: number) {
  const d = 0.76, h = 0.75, th = 0.04;
  b(g, cx, h-th/2, cz, w, th, d, PAPER, INK_3, 0.5);  // desktop
  // Trestle legs (2 panels, full depth)
  b(g, cx-w/2+0.06, (h-th)/2, cz, 0.05, h-th, d*0.88, PAPER2, INK_3, 0.45);
  b(g, cx+w/2-0.06, (h-th)/2, cz, 0.05, h-th, d*0.88, PAPER2, INK_3, 0.45);
  // Stretcher / cross-brace
  b(g, cx, (h-th)*0.32, cz, w-0.2, 0.04, 0.04, PAPER3, INK_3, 0.35);
}

function fMonitor(g: THREE.Group, cx: number, tableCz: number) {
  const tz = tableCz - 0.28;   // monitor toward back of desk
  b(g, cx, 1.04, tz, 0.55, 0.34, 0.04, PAPER3, INK_2, 0.55);   // screen
  b(g, cx, 0.85, tz+0.02, 0.04, 0.2, 0.04, PAPER3, INK_3, 0.4); // arm
  b(g, cx, 0.79, tz+0.1, 0.2, 0.04, 0.2, PAPER3, INK_3, 0.4);  // base
}

function fKeyboard(g: THREE.Group, cx: number, cz: number) {
  b(g, cx, 0.76, cz, 0.44, 0.022, 0.16, PAPER3, INK_2, 0.48);
  b(g, cx, 0.761, cz+0.04, 0.38, 0.008, 0.06, PAPER3, INK_3, 0.22); // keycap row hint
}

function fDeskLamp(g: THREE.Group, cx: number, cz: number) {
  b(g, cx, 0.77, cz, 0.12, 0.04, 0.12, PAPER3, INK_3, 0.45);  // base
  b(g, cx, 0.92, cz-0.08, 0.03, 0.3, 0.03, PAPER3, INK_3, 0.4); // arm 1
  b(g, cx-0.14, 1.05, cz-0.14, 0.03, 0.3, 0.03, PAPER3, INK_3, 0.4); // arm 2
  b(g, cx-0.2, 1.2, cz-0.18, 0.22, 0.12, 0.16, PAPER2, INK_3, 0.4); // shade
}

function fTaskChair(g: THREE.Group, cx: number, cz: number, facingTableAtNegZ: boolean) {
  const sh = 0.47, fd = facingTableAtNegZ ? -1 : 1;
  b(g, cx, 0.03, cz, 0.56, 0.055, 0.09, PAPER3, INK_3, 0.38); // base spoke 1
  b(g, cx, 0.03, cz, 0.09, 0.055, 0.56, PAPER3, INK_3, 0.38); // base spoke 2
  b(g, cx, 0.03, cz, 0.42, 0.055, 0.42, PAPER3, INK_3, 0.3);  // base ring hint
  b(g, cx, sh*0.5, cz, 0.055, sh, 0.055, PAPER3, INK_3, 0.4); // gas-lift column
  b(g, cx, sh-0.04, cz, 0.52, 0.09, 0.5, PAPER2, INK_3, 0.4);  // seat shell
  b(g, cx, sh+0.04, cz, 0.48, 0.1, 0.46, PAPER, INK_3, 0.32);  // seat cushion
  b(g, cx, sh+0.38, cz-fd*0.22, 0.46, 0.72, 0.09, PAPER2, INK_3, 0.45); // backrest
  b(g, cx, sh+0.22, cz-fd*0.14, 0.46, 0.08, 0.06, PAPER3, INK_3, 0.32); // lumbar
  b(g, cx-0.24, sh+0.1, cz, 0.04, 0.04, 0.3, PAPER3, INK_3, 0.35); // armrest L
  b(g, cx+0.24, sh+0.1, cz, 0.04, 0.04, 0.3, PAPER3, INK_3, 0.35); // armrest R
}

function fBookshelf(g: THREE.Group, cx: number, cz: number, w: number, nShelves = 5) {
  const d = 0.35, h = 2.1, sw = 0.025;
  b(g, cx-w/2+sw/2, h/2, cz, sw, h, d, PAPER2, INK_2, 0.5);   // side L
  b(g, cx+w/2-sw/2, h/2, cz, sw, h, d, PAPER2, INK_2, 0.5);   // side R
  b(g, cx, h/2, cz+d/2-0.012, w, h, 0.02, PAPER3, INK_3, 0.28); // back
  b(g, cx, h-sw/2, cz, w, sw, d, PAPER2, INK_2, 0.42);          // top
  b(g, cx, sw/2, cz, w, sw, d, PAPER2, INK_2, 0.42);            // bottom
  for (let i = 1; i < nShelves; i++) {
    const sy = i * (h - sw*2) / nShelves + sw;
    b(g, cx, sy, cz, w-sw*2, sw, d-0.02, PAPER2, INK_2, 0.4);
  }
  // Deterministic book-like objects on each shelf
  const bookData = [
    [0.06, 0.18], [0.14, 0.22], [0.22, 0.16], [-0.1, 0.2], [-0.18, 0.14],
    [0.3, 0.19], [-0.26, 0.17],
  ];
  for (let i = 0; i < nShelves - 1; i++) {
    const sy = i * (h-sw*2) / nShelves + sw;
    bookData.forEach(([bx, bh]) => {
      if (Math.abs(bx) < w/2 - sw - 0.05) {
        b(g, cx+bx, sy+(bh as number)/2, cz-0.02, 0.038, bh as number, 0.29, PAPER3, INK_3, 0.32);
      }
    });
  }
}

function fFilingCabinet(g: THREE.Group, cx: number, cz: number) {
  b(g, cx, 0.7, cz, 0.46, 1.4, 0.55, PAPER2, INK_3, 0.45);
  b(g, cx, 0.72, cz, 0.42, 1.36, 0.02, PAPER3, INK_3, 0.2); // front face
  [0.25, 0.55, 0.82, 1.1].forEach(t =>
    b(g, cx, t, cz-0.27, 0.1, 0.06, 0.02, PAPER3, INK_2, 0.4) // handles
  );
}

function fDiningTable(g: THREE.Group, cx: number, cz: number, w: number, d = 0.92) {
  const h = 0.75, th = 0.04, lr = 0.05;
  [[w/2-0.1, d/2-0.09], [-w/2+0.1, d/2-0.09],
   [w/2-0.1, -d/2+0.09], [-w/2+0.1, -d/2+0.09]]
    .forEach(([dx, dz]) => b(g, cx+dx, h/2, cz+dz, lr, h, lr, PAPER3, INK_3, 0.5));
  b(g, cx, h-th/2, cz, w, th, d, PAPER, INK_3, 0.5);   // tabletop
  b(g, cx, h-th, cz, w-0.12, 0.06, d-0.12, PAPER2, INK_3, 0.3); // apron
}

// dir: which direction the BACK of the chair faces (away from table)
function fDiningChair(g: THREE.Group, cx: number, cz: number, backDx: number, backDz: number) {
  const sh = 0.46, bh = 0.48, sw = 0.44, sd = 0.44;
  const bx = cx + backDx * 0.19, bz = cz + backDz * 0.19;
  const bpW = backDz !== 0 ? sw * 0.9 : 0.09;
  const bpD = backDx !== 0 ? sd * 0.9 : 0.09;
  // Legs ×4
  [[ sw/2-0.06,  sd/2-0.06], [-sw/2+0.06,  sd/2-0.06],
   [ sw/2-0.06, -sd/2+0.06], [-sw/2+0.06, -sd/2+0.06]]
    .forEach(([dx, dz]) => b(g, cx+dx, sh/2, cz+dz, 0.03, sh, 0.03, PAPER3, INK_3, 0.48));
  b(g, cx, sh-0.04, cz, sw, 0.1, sd, PAPER2, INK_3, 0.4);        // seat shell
  b(g, cx, sh+0.04, cz, sw-0.04, 0.08, sd-0.04, PAPER, INK_3, 0.3); // cushion
  b(g, bx, sh+bh/2, bz, bpW, bh, bpD, PAPER2, INK_3, 0.44);     // backrest panel
  // Horizontal back slats (2)
  [0.3, 0.65].forEach(t => {
    b(g, bx, sh+bh*t, bz, bpW*0.9, bh*0.06, bpD*0.9, PAPER3, INK_3, 0.3);
  });
}

function fKitchenCounter(g: THREE.Group, wallX: number, z0: number, z1: number) {
  const ld = 0.62, lh = 0.9, cth = 0.06;
  const ud = 0.38, uh = 0.72, ugap = 0.52; // upper cab
  const l = z1 - z0, mz = (z0+z1) / 2;
  // Lower cabinet body
  b(g, wallX-ld/2, lh/2, mz, ld, lh, l, PAPER3, INK_2, 0.5);
  // Countertop (overhangs 4cm)
  b(g, wallX-ld/2-0.02, lh+cth/2, mz, ld+0.06, cth, l+0.04, PAPER, INK_2, 0.5);
  // Lower door lines (approx 60cm wide doors)
  const nDoors = Math.ceil(l / 0.62);
  for (let i = 0; i < nDoors; i++) {
    const dz = z0 + (i + 0.5) * (l / nDoors);
    b(g, wallX-ld+0.02, lh*0.5, dz, 0.02, lh*0.85, 0.015, PAPER3, INK_2, 0.35);
  }
  // Upper cabinets (above worktop, 52cm gap)
  b(g, wallX-ud/2, lh+cth+ugap+uh/2, mz, ud, uh, l, PAPER2, INK_2, 0.48);
  // Upper door lines
  for (let i = 0; i < nDoors; i++) {
    const dz = z0 + (i + 0.5) * (l / nDoors);
    b(g, wallX-ud+0.02, lh+cth+ugap+uh*0.5, dz, 0.02, uh*0.88, 0.015, PAPER3, INK_2, 0.32);
  }
  // Sink basin
  b(g, wallX-ld*0.3, lh+cth*0.6, mz-l*0.15, 0.45, 0.04, 0.36, PAPER3, INK_2, 0.45);
}

function fIslandCounter(g: THREE.Group, cx: number, cz: number, w: number, d = 0.7) {
  b(g, cx, 0.45, cz, w, 0.9, d, PAPER3, INK_3, 0.45);
  b(g, cx, 0.92, cz, w+0.04, 0.05, d+0.04, PAPER, INK_3, 0.45);
}

// ──────────────────────────────────────────────────────────────────────────────
// ROOM FURNISHING — room-relative layout per programme
// ──────────────────────────────────────────────────────────────────────────────

function furnishRoom(g: THREE.Group, prog: string, x0: number, z0: number, x1: number, z1: number) {
  const rw = x1 - x0, rd = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;

  if (prog === 'living') {
    const sw = Math.min(rw * 0.7, 2.4);
    // Rug under seating area (sofa back against z0, open toward z1)
    fRug(g, cx, z0 + rd * 0.38, Math.min(rw * 0.82, 2.9), Math.min(rd * 0.6, 1.9));
    fSofa(g, cx, z0, sw, false);          // sofa back on z0 wall, opens toward +z
    fCoffeeTable(g, cx, z0 + rd * 0.44, Math.min(rw*0.3, 1.15), 0.56);
    // Armchair facing the sofa (back toward z1 side)
    if (rw > 1.8) fArmchair(g, x0 + rw*0.8, z0 + rd*0.56, z1 - 0.05);
    // Side table beside armchair
    if (rw > 2.2) fSideTable(g, x0 + rw*0.82, z0 + rd*0.8);
    // Floor lamp (NW corner area)
    if (rw > 2.0) fFloorLamp(g, x0 + 0.3, z0 + 0.3);
    // Plant (far corner)
    if (rw > 2.5 && rd > 1.8) fPlant(g, x1 - 0.28, z1 - 0.28);

  } else if (prog === 'bedroom') {
    // Bed headboard against z1 (south exterior wall), body extends toward z0
    const bw = Math.min(rw * 0.52, 1.82);
    fRug(g, cx, z1 - rd*0.38, Math.min(rw*0.7, 2.2), Math.min(rd*0.45, 1.4), RUG2);
    fBed(g, cx, z1 - 0.1, bw, -1);       // body extends toward -z (z0 direction)
    if (rw > 1.4) {
      fNightstand(g, cx - bw/2 - 0.32, z1 - 1.12);
      fNightstand(g, cx + bw/2 + 0.32, z1 - 1.12);
    }
    // Wardrobe along west wall if wide enough
    const wdw = Math.min(rw * 0.55, 1.8);
    if (rd > 2.5) fWardrobe(g, x0 + wdw/2 + 0.04, z0 + rd*0.35, wdw);
    // Dresser
    if (rw > 2.8) fDresser(g, x1 - 0.4, z0 + rd*0.68, Math.min(rw*0.28, 0.9));
    // Reading chair in remaining corner
    if (rw > 3.0 && rd > 3.0) fReadingChair(g, x1 - 0.6, z0 + 0.55);

  } else if (prog === 'studio') {
    // Long worktable facing wall at x1 (east), chair south of table
    const tw = Math.min(rw * 0.58, 2.85);
    fWorktable(g, cx, z0 + rd*0.35, tw);
    fMonitor(g, cx + tw*0.12, z0 + rd*0.35);
    fKeyboard(g, cx, z0 + rd*0.35 + 0.22);
    fDeskLamp(g, cx + tw*0.38, z0 + rd*0.35 - 0.3);
    fTaskChair(g, cx, z0 + rd*0.35 + 0.62, true); // backrest away from table, seat faces -z toward table
    // Bookshelf against east wall
    const bsw = Math.min(rw*0.35, 1.1);
    if (rd > 1.8) fBookshelf(g, x1 - bsw/2 - 0.2, cz + rd*0.12, bsw);
    // Filing cabinet
    if (rw > 2.5) fFilingCabinet(g, x0 + 0.28, z0 + rd*0.62);
    // Plant on desk end or floor
    fPlant(g, cx + tw*0.52, z0 + rd*0.35 - 0.28, 0.7);
    // Second small worktable / return desk
    if (rw > 4.0) {
      fWorktable(g, cx + tw*0.38, z0 + rd*0.7, Math.min(rw*0.32, 1.2));
    }

  } else if (prog === 'amenity') {
    // Dining group centered in room
    const tw = Math.min(rw * 0.42, 1.65);
    const td = 0.92;
    fRug(g, cx, cz, Math.min(rw*0.72, 2.8), Math.min(rd*0.68, 2.2));
    fDiningTable(g, cx, cz, tw, td);
    // Place chairs around table (guarded to stay in room)
    const chairGap = 0.3;
    if (cz - td/2 - chairGap - 0.25 > z0) fDiningChair(g, cx, cz-td/2-chairGap, 0, -1);  // S
    if (cz + td/2 + chairGap + 0.25 < z1) fDiningChair(g, cx, cz+td/2+chairGap, 0, 1);   // N
    if (cx - tw/2 - chairGap - 0.25 > x0) fDiningChair(g, cx-tw/2-chairGap, cz, -1, 0);  // W
    if (cx + tw/2 + chairGap + 0.25 < x1) fDiningChair(g, cx+tw/2+chairGap, cz, 1, 0);   // E
    // Kitchen counter along east wall
    const ctrLen = Math.min(rd * 0.72, 2.4);
    fKitchenCounter(g, x1, cz - ctrLen/2, cz + ctrLen/2);
    // Kitchen island if room is wide enough
    if (rw > 4.5 && rd > 2.2) {
      fIslandCounter(g, x1 - rw*0.32, cz + rd*0.26, Math.min(rw*0.22, 1.1));
    }
    // Plant in corner
    if (rw > 2.2) fPlant(g, x0 + 0.3, z0 + 0.3, 0.9);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// SCENE ASSEMBLY
// ──────────────────────────────────────────────────────────────────────────────

function buildInterior(slots: Slots): THREE.Group {
  const g = new THREE.Group();
  const { cx, lz, rz } = partitions(slots);

  // ── Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(PW, PD),
    new THREE.MeshLambertMaterial({ color: PAPER3 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(PW/2, 0, PD/2);
  floor.receiveShadow = true;
  g.add(floor);

  // Floor perimeter outline
  g.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,0.002,0), new THREE.Vector3(PW,0.002,0),
      new THREE.Vector3(PW,0.002,PD), new THREE.Vector3(0,0.002,PD),
      new THREE.Vector3(0,0.002,0),
    ]),
    new THREE.LineBasicMaterial({ color: INK_3, transparent: true, opacity: 0.4 }),
  ));

  // ── Partition walls
  b(g, cx,             CH/2, PD/2, WT,     CH, PD,    PAPER, INK_2, 0.55, 0.26);
  b(g, cx/2,           CH/2, lz,   cx,     CH, WT,    PAPER, INK_2, 0.5,  0.22);
  b(g, cx+(PW-cx)/2,   CH/2, rz,   PW-cx,  CH, WT,    PAPER, INK_2, 0.5,  0.22);

  // Ceiling partition traces
  const tMat = new THREE.LineBasicMaterial({ color: INK_3, transparent: true, opacity: 0.2 });
  [[cx,CH,0,cx,CH,PD],[0,CH,lz,cx,CH,lz],[cx,CH,rz,PW,CH,rz]].forEach(([ax,ay,az,bx,by,bz]) =>
    g.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(ax,ay,az), new THREE.Vector3(bx,by,bz)]),
      tMat,
    ))
  );

  // ── Furnish each room
  furnishRoom(g, slots[0], 0,  0,  cx, lz);
  furnishRoom(g, slots[1], 0,  lz, cx, PD);
  furnishRoom(g, slots[2], cx, 0,  PW, rz);
  furnishRoom(g, slots[3], cx, rz, PW, PD);

  return g;
}

// ──────────────────────────────────────────────────────────────────────────────
// REACT COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

function disposeGroup(g: THREE.Group) {
  g.traverse(obj => {
    const o = obj as THREE.Mesh;
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    (mats as THREE.Material[]).forEach(m => m.dispose());
  });
}

interface State {
  renderer: THREE.WebGLRenderer;
  scene:    THREE.Scene;
  camera:   THREE.PerspectiveCamera;
  controls: OrbitControls;
  group:    THREE.Group | null;
}

function InteriorViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const stateRef  = useRef<State | null>(null);
  const { slots } = useFloorPlanSlots();

  // ── Init renderer / scene / lights (once)
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(wrap.offsetWidth, wrap.offsetHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF2F1ED);
    scene.fog = new THREE.FogExp2(0xF2F1ED, 0.042);

    const camera = new THREE.PerspectiveCamera(48, wrap.offsetWidth / wrap.offsetHeight, 0.1, 80);
    camera.position.set(13.5, 6.5, 10.5);

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(PW/2, 0.9, PD/2);
    controls.enableDamping = true; controls.dampingFactor = 0.07;
    controls.minDistance = 3; controls.maxDistance = 24;
    controls.minPolarAngle = Math.PI/9; controls.maxPolarAngle = Math.PI/2.1;
    controls.enableZoom = false;
    controls.autoRotate = true; controls.autoRotateSpeed = 0.28;
    controls.update();

    let rotTimer: ReturnType<typeof setTimeout> | null = null;
    const pause  = () => { controls.autoRotate = false; if (rotTimer) clearTimeout(rotTimer); };
    const resume = () => { rotTimer = setTimeout(() => { controls.autoRotate = true; }, 3000); };
    canvas.addEventListener('pointerdown', pause);
    canvas.addEventListener('pointerup', resume);
    canvas.addEventListener('pointerleave', () => { if (!controls.autoRotate) resume(); });

    scene.add(new THREE.AmbientLight(0xF9F8F5, 1.05));
    const sun = new THREE.DirectionalLight(0xFFF8F0, 0.85);
    sun.position.set(9, 16, 8); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5; sun.shadow.camera.far  = 40;
    sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
    sun.shadow.camera.top  = 14;  sun.shadow.camera.bottom = -14;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xE8F0F8, 0.32);
    fill.position.set(-6, 7, -9); scene.add(fill);
    const bounce = new THREE.HemisphereLight(0xF9F8F5, 0xECEAE6, 0.25);
    scene.add(bounce);

    stateRef.current = { renderer, scene, camera, controls, group: null };

    const onResize = () => {
      if (!wrap) return;
      camera.aspect = wrap.offsetWidth / wrap.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wrap.offsetWidth, wrap.offsetHeight);
    };
    window.addEventListener('resize', onResize);

    let rafId: number;
    (function animate() { rafId = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); })();

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', pause);
      canvas.removeEventListener('pointerup', resume);
      controls.dispose(); renderer.dispose();
      stateRef.current = null;
    };
  }, []);

  // ── Rebuild interior whenever slots change
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.group) { s.scene.remove(s.group); disposeGroup(s.group); }

    const group = buildInterior(slots);

    // Collect target opacities from a reference copy, then start at 0
    type Entry = { mat: THREE.Material & { opacity: number }; target: number };
    const entries: Entry[] = [];
    const ref = buildInterior(slots);
    const targets: number[] = [];
    ref.traverse(obj => {
      const mats = Array.isArray((obj as THREE.Mesh).material)
        ? (obj as THREE.Mesh).material as THREE.Material[]
        : (obj as THREE.Mesh).material ? [(obj as THREE.Mesh).material as THREE.Material] : [];
      (mats as Array<THREE.Material & { opacity: number }>).forEach(m => targets.push(m.opacity));
    });
    disposeGroup(ref);

    let ti = 0;
    group.traverse(obj => {
      const mats = Array.isArray((obj as THREE.Mesh).material)
        ? (obj as THREE.Mesh).material as THREE.Material[]
        : (obj as THREE.Mesh).material ? [(obj as THREE.Mesh).material as THREE.Material] : [];
      (mats as Array<THREE.Material & { opacity: number }>).forEach(m => {
        entries.push({ mat: m, target: targets[ti++] ?? 1 });
        m.transparent = true; m.opacity = 0;
      });
    });

    s.scene.add(group); s.group = group;

    const t0 = performance.now(), dur = 520;
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 2);
      entries.forEach(({ mat, target }) => { mat.opacity = target * ease; });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [slots]);

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        aria-label="Interactive interior view of the studio floor plan with furniture"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default memo(InteriorViewer);
