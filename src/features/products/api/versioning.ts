import { NextRequest } from 'next/server';

export type ApiVersion = 'v2';
type RequestedApiVersion = 'v1' | 'v2' | 'v3';

export type VersionedResponse<T> = {
  version: ApiVersion;
  data: T;
  meta?: {
    deprecated?: boolean;
    deprecationDate?: string;
    migrationGuide?: string;
  };
};

export class ApiVersionManager {
  private static readonly CURRENT_VERSION: ApiVersion = 'v2';
  private static readonly SUPPORTED_VERSIONS: ApiVersion[] = ['v2'];

  static extractVersion(req: NextRequest): RequestedApiVersion {
    const pathVersion = this.extractVersionFromPath(req.url);
    if (pathVersion) return pathVersion;

    return this.CURRENT_VERSION;
  }

  static isVersionSupported(version: RequestedApiVersion): version is ApiVersion {
    return this.SUPPORTED_VERSIONS.includes(version as ApiVersion);
  }

  static getVersionMeta(_version: ApiVersion): VersionedResponse<unknown>['meta'] {
    return undefined;
  }

  static getSupportedVersions(): ApiVersion[] {
    return [...this.SUPPORTED_VERSIONS];
  }

  private static extractVersionFromPath(url: string): RequestedApiVersion | null {
    const match = url.match(/\/api\/(v[1-3])\//);
    return match ? (match[1] as RequestedApiVersion) : null;
  }
}

export function createVersionedResponse<T>(
  data: T,
  version: ApiVersion,
  status: number = 200
): Response {
  const meta = ApiVersionManager.getVersionMeta(version);

  const response: VersionedResponse<T> = {
    version,
    data,
    ...(meta && Object.keys(meta).length > 0 ? { meta } : {}),
  };

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'API-Version': version,
    },
  });
}

export function withApiVersioning(
  handler: (req: NextRequest, version: ApiVersion, ...args: unknown[]) => Promise<Response>
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<Response> => {
    const requestedVersion = ApiVersionManager.extractVersion(req);
    const supportedVersions = ApiVersionManager.getSupportedVersions();

    if (!ApiVersionManager.isVersionSupported(requestedVersion)) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported API version',
          supportedVersions,
          requestedVersion,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return handler(req, requestedVersion, ...args);
  };
}
