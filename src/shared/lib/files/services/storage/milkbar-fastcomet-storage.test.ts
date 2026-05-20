/**
 * @vitest-environment node
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  getMilkbarFastCometPublicHtmlMirrorPath,
  MILKBAR_FASTCOMET_PUBLIC_HTML_ROOT,
} from './milkbar-fastcomet-public-html-mirror';
import { resolveMilkbarFastCometStorageProfile } from './milkbar-fastcomet-storage';

const originalEnv = {
  MILKBAR_FASTCOMET_PUBLIC_BASE_URL: process.env['MILKBAR_FASTCOMET_PUBLIC_BASE_URL'],
  MILKBAR_FASTCOMET_BASE_URL: process.env['MILKBAR_FASTCOMET_BASE_URL'],
  MILKBAR_FASTCOMET_UPLOAD_URL: process.env['MILKBAR_FASTCOMET_UPLOAD_URL'],
  MILKBAR_FASTCOMET_DELETE_URL: process.env['MILKBAR_FASTCOMET_DELETE_URL'],
  MILKBAR_FASTCOMET_SERVER: process.env['MILKBAR_FASTCOMET_SERVER'],
  MILKBAR_FASTCOMET_PORT: process.env['MILKBAR_FASTCOMET_PORT'],
  MILKBAR_FASTCOMET_RESOLVE_IP: process.env['MILKBAR_FASTCOMET_RESOLVE_IP'],
};

describe('milkbar-fastcomet-storage', () => {
  beforeEach(() => {
    Object.keys(originalEnv).forEach((key) => {
      delete process.env[key];
    });
  });

  afterAll(() => {
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  it('defaults Milkbar uploads to the uploads.milkbardesigners.com storage host', () => {
    const profile = resolveMilkbarFastCometStorageProfile();

    expect(profile).toMatchObject({
      publicBaseUrl: 'https://uploads.milkbardesigners.com',
      fastCometConfig: {
        baseUrl: 'https://uploads.milkbardesigners.com',
        deleteEndpoint: 'https://uploads.milkbardesigners.com/api/uploads/delete/index.php',
        server: 'uploads.milkbardesigners.com',
        uploadEndpoint: 'https://uploads.milkbardesigners.com/api/uploads/index.php',
      },
    });
  });

  it('mirrors Milkbar FastComet files under the uploads subdomain document root', () => {
    expect(MILKBAR_FASTCOMET_PUBLIC_HTML_ROOT).toContain(
      'hosting/fastcomet/uploads.milkbardesigners.com/public_html'
    );
    expect(getMilkbarFastCometPublicHtmlMirrorPath('/uploads/cms/models/model.glb')).toContain(
      'hosting/fastcomet/uploads.milkbardesigners.com/public_html/uploads/cms/models/model.glb'
    );
  });
});
