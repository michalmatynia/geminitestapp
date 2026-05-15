import 'server-only';

import {
  MILKBAR_FASTCOMET_BASE_URL,
  MILKBAR_FASTCOMET_DELETE_ENDPOINT,
  MILKBAR_FASTCOMET_RESOLVE_IP,
  MILKBAR_FASTCOMET_SERVER,
  MILKBAR_FASTCOMET_UPLOAD_ENDPOINT,
} from '@/shared/lib/files/constants';
import type { FastCometStorageOverrides } from './file-storage-service';

type MilkbarFastCometStorageProfile = {
  publicBaseUrl: string;
  fastCometConfig: FastCometStorageOverrides;
};

const readEnv = (key: string): string | null => {
  const value = process.env[key]?.trim() ?? '';
  return value.length > 0 ? value : null;
};

const readEnvNumber = (key: string): number | null => {
  const parsed = Number(process.env[key]);
  if (!Number.isFinite(parsed)) return null;
  const value = Math.floor(parsed);
  return value >= 1 && value <= 65_535 ? value : null;
};

export const resolveMilkbarFastCometStorageProfile = (): MilkbarFastCometStorageProfile => {
  const publicBaseUrl =
    readEnv('MILKBAR_FASTCOMET_PUBLIC_BASE_URL') ??
    readEnv('MILKBAR_FASTCOMET_BASE_URL') ??
    MILKBAR_FASTCOMET_BASE_URL;
  const port = readEnvNumber('MILKBAR_FASTCOMET_PORT');

  return {
    publicBaseUrl,
    fastCometConfig: {
      baseUrl: publicBaseUrl,
      uploadEndpoint: readEnv('MILKBAR_FASTCOMET_UPLOAD_URL') ?? MILKBAR_FASTCOMET_UPLOAD_ENDPOINT,
      deleteEndpoint: readEnv('MILKBAR_FASTCOMET_DELETE_URL') ?? MILKBAR_FASTCOMET_DELETE_ENDPOINT,
      server: readEnv('MILKBAR_FASTCOMET_SERVER') ?? MILKBAR_FASTCOMET_SERVER,
      ...(port !== null ? { port } : {}),
      resolveIp: readEnv('MILKBAR_FASTCOMET_RESOLVE_IP') ?? MILKBAR_FASTCOMET_RESOLVE_IP,
    },
  };
};
