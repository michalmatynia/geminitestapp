import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

type FileReaderLikeResult = string | ArrayBuffer | null;
type InteriorBuilder = (slots: string[]) => THREE.Object3D;
type ProjectBuilder = (index: number) => THREE.Object3D;

class NodeFileReader {
  result: FileReaderLikeResult = null;
  onloadend: (() => void) | null = null;

  readAsArrayBuffer(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }

  readAsDataURL(blob: Blob): void {
    void blob.arrayBuffer().then((buffer) => {
      const base64 = Buffer.from(buffer).toString('base64');
      this.result = `data:${blob.type};base64,${base64}`;
      this.onloadend?.();
    });
  }
}

globalThis.FileReader = NodeFileReader as unknown as typeof FileReader;

type ExportEntry = {
  key: string;
  filename: string;
  create: () => THREE.Object3D;
};

const DEFAULT_OUT_DIR =
  'hosting/fastcomet/milkbardesigners.com/public_html/uploads/cms/models/procedural';

const projectCodes = ['MBD-001', 'MBD-002', 'MBD-003'] as const;

const parseOutDir = (): string => {
  const arg = process.argv.slice(2).find((entry) => entry.startsWith('--out='));
  return arg?.slice('--out='.length).trim() || DEFAULT_OUT_DIR;
};

const lineMaterial = (opacity: number): THREE.LineBasicMaterial =>
  new THREE.LineBasicMaterial({
    color: 0x1a1918,
    transparent: true,
    opacity,
  });

const addWireBox = (
  group: THREE.Group,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  opacity = 0.42
): void => {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), lineMaterial(opacity));
  wire.position.set(x, h / 2, z);
  group.add(wire);
};

const addFloorLines = (
  group: THREE.Group,
  x: number,
  z: number,
  w: number,
  h: number,
  d: number,
  floorH: number
): void => {
  for (let y = floorH; y < h; y += floorH) {
    const hw = w / 2;
    const hd = d / 2;
    const points = [
      new THREE.Vector3(x - hw, y, z - hd),
      new THREE.Vector3(x + hw, y, z - hd),
      new THREE.Vector3(x + hw, y, z + hd),
      new THREE.Vector3(x - hw, y, z + hd),
      new THREE.Vector3(x - hw, y, z - hd),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial(0.18)));
  }
};

function createHeroBackgroundModel(): THREE.Group {
  const group = new THREE.Group();

  for (let i = -12; i <= 12; i++) {
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(i * 2.5, -0.01, -30),
          new THREE.Vector3(i * 2.5, -0.01, 30),
        ]),
        lineMaterial(0.09)
      )
    );
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-30, -0.01, i * 2.5),
          new THREE.Vector3(30, -0.01, i * 2.5),
        ]),
        lineMaterial(0.09)
      )
    );
  }

  const towers = [
    { x: 0, z: 0, w: 2.4, h: 13.5, d: 2.4, floorH: 1.1, cap: 3.8 },
    { x: -1, z: -5.5, w: 1.5, h: 10, d: 1.5, floorH: 1.0, cap: 3.5 },
    { x: 5.2, z: -1.8, w: 1.1, h: 11, d: 1.1, floorH: 1.0, cap: 4.5 },
    { x: 4.5, z: 2.5, w: 2.0, h: 7.5, d: 1.8, floorH: 0.9, cap: 1.5 },
    { x: -5.5, z: 0, w: 3.8, h: 4.5, d: 2.8, floorH: 0.8, cap: 1.65 },
    { x: -4, z: -3.5, w: 1.5, h: 9, d: 1.5, floorH: 1.0, cap: 2.2 },
    { x: -4, z: 3.5, w: 2.2, h: 6, d: 1.8, floorH: 0.85, cap: 1.0 },
    { x: 3, z: -4.5, w: 2.0, h: 7, d: 1.5, floorH: 0.9, cap: 1.2 },
    { x: 7.5, z: 1, w: 1.1, h: 9.5, d: 1.1, floorH: 1.0, cap: 4.5 },
    { x: -7.5, z: -2, w: 2.0, h: 6.5, d: 1.8, floorH: 0.9, cap: 1.35 },
    { x: 1.5, z: 5.5, w: 2.8, h: 4.2, d: 2.2, floorH: 0.8, cap: 1.15 },
    { x: -1, z: -8.5, w: 2.0, h: 5.5, d: 2.0, floorH: 0.85, cap: 0.55 },
    { x: 8.5, z: -3.5, w: 1.4, h: 5, d: 1.4, floorH: 0.85, cap: 1.0 },
  ];

  towers.forEach((tower) => {
    addWireBox(group, tower.x, tower.z, tower.w, tower.h, tower.d, 0.34);
    addFloorLines(group, tower.x, tower.z, tower.w, tower.h, tower.d, tower.floorH);
    addWireBox(group, tower.x, tower.z, tower.w * 0.24, tower.cap, tower.d * 0.24, 0.5);
    const cap = group.children.at(-1);
    if (cap !== undefined) {
      cap.position.y = tower.h + tower.cap / 2;
    }
  });

  group.name = 'Milkbar hero background procedural model';
  return group;
}

const colorFromMaterial = (material: THREE.Material): THREE.Color => {
  const source = material as THREE.Material & { color?: THREE.Color };
  return source.color instanceof THREE.Color ? source.color.clone() : new THREE.Color(0xffffff);
};

const opacityForExport = (material: THREE.Material, object: THREE.Object3D): number => {
  if (object.userData['isTexture']) return 1;
  if (object.userData['isWire']) return 0.28;
  if (object.userData['isSolid']) return 0;
  return material.opacity <= 0 ? 1 : material.opacity;
};

const materialForExport = (material: THREE.Material, object: THREE.Object3D): THREE.Material => {
  const opacity = opacityForExport(material, object);
  const common = {
    name: material.name,
    color: colorFromMaterial(material),
    transparent: opacity < 1,
    opacity,
    side: material.side,
    alphaTest: material.alphaTest,
    depthWrite: material.depthWrite,
  };

  const materialFlags = material as THREE.Material & { isMeshBasicMaterial?: boolean };
  if (object instanceof THREE.Line || object instanceof THREE.Points || materialFlags.isMeshBasicMaterial) {
    return new THREE.MeshBasicMaterial(common);
  }

  const source = material as THREE.MeshStandardMaterial;
  return new THREE.MeshStandardMaterial({
    ...common,
    roughness: source.roughness ?? 0.82,
    metalness: source.metalness ?? 0,
  });
};

const prepareObjectForExport = (object: THREE.Object3D): THREE.Object3D => {
  (object as THREE.Object3D & { pivot?: THREE.Vector3 | null }).pivot = null;
  object.traverse((child) => {
    (child as THREE.Object3D & { pivot?: THREE.Vector3 | null }).pivot = null;
    const mesh = child as THREE.Mesh;
    if (!mesh.material) return;
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => materialForExport(material, child))
      : materialForExport(mesh.material, child);
  });
  return object;
};

const exportGltf = (object: THREE.Object3D): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          reject(new Error('Unexpected binary GLB export result.'));
          return;
        }
        resolve(result as Record<string, unknown>);
      },
      (error) => reject(error),
      { binary: false, trs: false, onlyVisible: false }
    );
  });

const loadArchBuilders = async (): Promise<{
  buildInterior: InteriorBuilder;
  makeProjectGroup: ProjectBuilder;
}> => {
  const interiorModulePath = '../../apps/arch-web/src/components/InteriorViewer.tsx';
  const projectModulePath = '../../apps/arch-web/src/lib/projectModels.ts';
  const [interiorModule, projectModule] = await Promise.all([
    import(interiorModulePath) as Promise<{ buildInterior: InteriorBuilder }>,
    import(projectModulePath) as Promise<{ makeProjectGroup: ProjectBuilder }>,
  ]);
  return {
    buildInterior: interiorModule.buildInterior,
    makeProjectGroup: projectModule.makeProjectGroup,
  };
};

const exportEntries = (
  buildInterior: InteriorBuilder,
  makeProjectGroup: ProjectBuilder
): ExportEntry[] => [
  {
    key: 'hero',
    filename: 'milkbar-hero-background.gltf',
    create: createHeroBackgroundModel,
  },
  {
    key: 'interior',
    filename: 'milkbar-every-line-interior.gltf',
    create: () => buildInterior(['living', 'bedroom', 'studio', 'amenity']),
  },
  ...projectCodes.map((code, index) => ({
    key: code.toLowerCase(),
    filename: `milkbar-project-${code.toLowerCase()}.gltf`,
    create: () => makeProjectGroup(index),
  })),
];

async function main(): Promise<void> {
  const outDir = path.resolve(parseOutDir());
  await mkdir(outDir, { recursive: true });
  const { buildInterior, makeProjectGroup } = await loadArchBuilders();

  const written: Array<{ key: string; filepath: string }> = [];
  for (const entry of exportEntries(buildInterior, makeProjectGroup)) {
    const object = prepareObjectForExport(entry.create());
    const gltf = await exportGltf(object);
    const filepath = path.join(outDir, entry.filename);
    await writeFile(filepath, `${JSON.stringify(gltf)}\n`, 'utf8');
    written.push({ key: entry.key, filepath });
  }

  written.forEach((entry) => console.log(`${entry.key}: ${entry.filepath}`));
  console.log('');
  console.log('Upload command:');
  console.log(`npm run storage:upload:milkbar-models -- \\`);
  console.log(`  --hero=${path.join(outDir, 'milkbar-hero-background.gltf')} \\`);
  console.log(`  --interior=${path.join(outDir, 'milkbar-every-line-interior.gltf')} \\`);
  projectCodes.forEach((code, index) => {
    const suffix = index === projectCodes.length - 1 ? ' \\' : ' \\';
    console.log(`  --project=${code}=${path.join(outDir, `milkbar-project-${code.toLowerCase()}.gltf`)}${suffix}`);
  });
  console.log('  --push-cloud');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
