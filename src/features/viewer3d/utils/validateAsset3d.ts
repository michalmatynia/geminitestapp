export const SUPPORTED_3D_FORMATS = {
  ".glb": { mimetype: "model/gltf-binary", description: "GL Transmission Format Binary" },
  ".gltf": { mimetype: "model/gltf+json", description: "GL Transmission Format" },
} as const;

export type Supported3DExtension = keyof typeof SUPPORTED_3D_FORMATS;

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function validate3DFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum size: 100MB` };
  }

  const ext = "." + file.name.toLowerCase().split(".").pop();
  if (!Object.keys(SUPPORTED_3D_FORMATS).includes(ext)) {
    return {
      valid: false,
      error: `Unsupported format. Supported: ${Object.keys(SUPPORTED_3D_FORMATS).join(", ")}`,
    };
  }

  return { valid: true };
}

export function isValid3DAsset(file: File): boolean {
  const ext = "." + file.name.toLowerCase().split(".").pop();
  const allowedExtensions = Object.keys(SUPPORTED_3D_FORMATS);
  const allowedMimetypes = ["model/gltf-binary", "model/gltf+json", "application/octet-stream"];

  return allowedExtensions.includes(ext) || allowedMimetypes.includes(file.type);
}
