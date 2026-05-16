import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const textureKeys = [
  'map',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'aoMap',
  'alphaMap',
] as const;

export async function loadGltfModel(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  loader.setCrossOrigin('anonymous');
  const gltf = await loader.loadAsync(url);
  const root = new THREE.Group();
  root.add(gltf.scene);
  return root;
}

export function fitObjectToBox(
  object: THREE.Object3D,
  targetSize: number,
  targetCenter = new THREE.Vector3()
): void {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z);
  if (maxAxis > 0) {
    object.scale.multiplyScalar(targetSize / maxAxis);
  }

  const nextBox = new THREE.Box3().setFromObject(object);
  const center = nextBox.getCenter(new THREE.Vector3());
  object.position.add(targetCenter.clone().sub(center));
}

export function prepareLoadedModel(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isExternalModel = true;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const cloned = materials.map((material) => {
      const next = material.clone();
      next.transparent = true;
      return next;
    });
    mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
  });
}

export function disposeObject3D(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();

    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    materials.forEach((material) => {
      const record = material as THREE.Material & Record<string, unknown>;
      textureKeys.forEach((key) => {
        const texture = record[key] as THREE.Texture | undefined;
        texture?.dispose();
      });
      material.dispose();
    });
  });
}
