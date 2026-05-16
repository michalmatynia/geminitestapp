import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  getMilkbarDesignersCmsSnapshot,
  pushMilkbarRuntimeToCloud,
  saveMilkbarDesignersCmsSnapshot,
} from '@/features/page-manager/milkbardesigners/milkbar-cms.server';
import {
  DEFAULT_MILKBAR_PROJECTS,
  DEFAULT_MILKBAR_SERVICES,
} from '@/features/page-manager/milkbardesigners/milkbar-cms.types';
import type {
  MilkbarCmsSnapshot,
  MilkbarLocalizedContent,
  MilkbarProjectCmsRecord,
} from '@/features/page-manager/milkbardesigners/milkbar-cms.types';
import { uploadAsset3D } from '@/features/viewer3d/server';
import { invalidateMongoClientCache } from '@/shared/lib/db/mongo-client';

type UploadTarget =
  | { kind: 'hero'; filePath: string }
  | { kind: 'interior'; filePath: string }
  | { kind: 'project'; projectCode: string; filePath: string };

type ParsedArgs = {
  pushCloud: boolean;
  targets: UploadTarget[];
};

const usage = `
Usage:
  npm run storage:upload:milkbar-models -- \\
    --hero=/absolute/path/hero.glb \\
    --interior=/absolute/path/interior.glb \\
    --project=MBD-001=/absolute/path/project-001.glb \\
    --project=MBD-002=/absolute/path/project-002.glb \\
    --push-cloud

Each file is uploaded with storageProfile=milkbarCms, so files go to FastComet:
  /uploads/cms/models
`;

const parseEqualsValue = (arg: string, flag: string): string | null => {
  if (!arg.startsWith(`${flag}=`)) return null;
  const value = arg.slice(flag.length + 1).trim();
  return value.length > 0 ? value : null;
};

const parseProjectValue = (value: string): UploadTarget => {
  const separatorIndex = value.indexOf('=');
  if (separatorIndex <= 0 || separatorIndex >= value.length - 1) {
    throw new Error('--project must use CODE=/absolute/path/model.glb');
  }
  return {
    kind: 'project',
    projectCode: value.slice(0, separatorIndex).trim().toUpperCase(),
    filePath: value.slice(separatorIndex + 1).trim(),
  };
};

const parseArgs = (args: string[]): ParsedArgs => {
  const targets: UploadTarget[] = [];
  let pushCloud = false;

  for (const arg of args) {
    if (arg === '--push-cloud') {
      pushCloud = true;
      continue;
    }

    const hero = parseEqualsValue(arg, '--hero');
    if (hero !== null) {
      targets.push({ kind: 'hero', filePath: hero });
      continue;
    }

    const interior = parseEqualsValue(arg, '--interior');
    if (interior !== null) {
      targets.push({ kind: 'interior', filePath: interior });
      continue;
    }

    const project = parseEqualsValue(arg, '--project');
    if (project !== null) {
      targets.push(parseProjectValue(project));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { pushCloud, targets };
};

const mimeForFile = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.glb') return 'model/gltf-binary';
  if (ext === '.gltf') return 'model/gltf+json';
  throw new Error(`Unsupported model file extension: ${filePath}`);
};

const modelTags = (target: UploadTarget): string[] => {
  if (target.kind === 'hero') return ['milkbardesigners', 'hero'];
  if (target.kind === 'interior') return ['milkbardesigners', 'interior', 'drawing'];
  return ['milkbardesigners', 'project', target.projectCode.toLowerCase()];
};

const modelName = (target: UploadTarget): string => {
  if (target.kind === 'hero') return 'Milkbar hero background model';
  if (target.kind === 'interior') return 'Milkbar Every line carries intent interior model';
  return `Milkbar project model ${target.projectCode}`;
};

const uploadTarget = async (target: UploadTarget): Promise<{ target: UploadTarget; assetId: string }> => {
  const buffer = await readFile(target.filePath);
  const filename = path.basename(target.filePath);
  const file = new File([buffer], filename, { type: mimeForFile(target.filePath) });
  const asset = await uploadAsset3D(file, {
    name: modelName(target),
    category: 'cms',
    tags: modelTags(target),
    isPublic: true,
    storageProfile: 'milkbarCms',
  });
  return { target, assetId: asset.id };
};

const assignHero = (localizedContent: MilkbarLocalizedContent, assetId: string): void => {
  Object.values(localizedContent).forEach((content) => {
    content.hero = { ...content.hero, modelAssetId: assetId, modelUrl: undefined };
  });
};

const assignInterior = (localizedContent: MilkbarLocalizedContent, assetId: string): void => {
  Object.values(localizedContent).forEach((content) => {
    content.drawing = {
      ...content.drawing,
      interiorModelAssetId: assetId,
      interiorModelUrl: undefined,
    };
  });
};

const assignProject = (
  projects: MilkbarProjectCmsRecord[],
  projectCode: string,
  assetId: string
): MilkbarProjectCmsRecord[] =>
  projects.map((project) =>
    project.code === projectCode
      ? { ...project, modelAssetId: assetId, modelUrl: undefined }
      : project
  );

const applyAssignments = (
  snapshot: MilkbarCmsSnapshot,
  uploaded: Array<{ target: UploadTarget; assetId: string }>
): Pick<MilkbarCmsSnapshot, 'localizedContent' | 'pageSettings' | 'projects' | 'services'> => {
  const localizedContent = structuredClone(snapshot.localizedContent);
  let projects = structuredClone(
    snapshot.projects.length > 0 ? snapshot.projects : DEFAULT_MILKBAR_PROJECTS
  );
  const services = structuredClone(
    snapshot.services.length > 0 ? snapshot.services : DEFAULT_MILKBAR_SERVICES
  );

  uploaded.forEach(({ target, assetId }) => {
    if (target.kind === 'hero') assignHero(localizedContent, assetId);
    if (target.kind === 'interior') assignInterior(localizedContent, assetId);
    if (target.kind === 'project') {
      projects = assignProject(projects, target.projectCode, assetId);
    }
  });

  return {
    localizedContent,
    pageSettings: snapshot.pageSettings,
    projects,
    services,
  };
};

async function main(): Promise<void> {
  const { pushCloud, targets } = parseArgs(process.argv.slice(2));
  if (targets.length === 0) {
    console.error(usage.trim());
    process.exitCode = 1;
    return;
  }

  const uploaded = [];
  for (const target of targets) {
    const result = await uploadTarget(target);
    uploaded.push(result);
    console.log(`${target.kind}: ${result.assetId}`);
  }

  const snapshot = await getMilkbarDesignersCmsSnapshot();
  await saveMilkbarDesignersCmsSnapshot(applyAssignments(snapshot, uploaded));

  if (pushCloud) {
    const result = await pushMilkbarRuntimeToCloud();
    console.log(`pushed cloud runtime at ${result.updatedAt}`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await invalidateMongoClientCache();
  });
