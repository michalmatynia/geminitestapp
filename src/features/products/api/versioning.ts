import { NextRequest } from 'next/server';

import type { ProductWithImages } from '@/shared/contracts/products';

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

    const headerVersion = this.extractVersionFromHeader(req);
    if (headerVersion) return headerVersion;

    const queryVersion = this.extractVersionFromQuery(req);
    if (queryVersion) return queryVersion;

    return this.CURRENT_VERSION;
  }

  static isVersionSupported(version: RequestedApiVersion): version is ApiVersion {
    return this.SUPPORTED_VERSIONS.includes(version as ApiVersion);
  }

  static getVersionMeta(_version: ApiVersion): VersionedResponse<unknown>['meta'] {
    return undefined;
  }

  private static extractVersionFromPath(url: string): RequestedApiVersion | null {
    const match = url.match(/\/api\/(v[1-3])\//);
    return match ? (match[1] as RequestedApiVersion) : null;
  }

  private static extractVersionFromHeader(req: NextRequest): RequestedApiVersion | null {
    const accept = req.headers.get('accept') || '';
    const match = accept.match(/version=([1-3])/);
    return match ? (`v${match[1]}` as RequestedApiVersion) : null;
  }

  private static extractVersionFromQuery(req: NextRequest): RequestedApiVersion | null {
    const url = new URL(req.url);
    const version = url.searchParams.get('version');
    if (version && ['v1', 'v2', 'v3'].includes(version)) {
      return version as RequestedApiVersion;
    }
    return null;
  }
}

export class ProductTransformer {
  static transformForVersion<T extends Partial<ProductWithImages> & Record<string, unknown>>(
    data: T,
    _version: ApiVersion
  ): unknown {
    return this.transformToV2(data);
  }

  private static transformToV2(
    data: Partial<ProductWithImages> & Record<string, unknown>
  ): Record<string, unknown> {
    return {
      id: data.id,
      sku: data.sku,
      baseProductId: data.baseProductId,
      names: {
        en: data.name_en,
        pl: data.name_pl,
        de: data.name_de,
      },
      descriptions: {
        en: data.description_en,
        pl: data.description_pl,
        de: data.description_de,
      },
      pricing: {
        price: data.price,
        priceGroupId: data.defaultPriceGroupId,
        comment: data.priceComment,
      },
      inventory: {
        stock: data.stock,
        sku: data.sku,
        ean: data.ean,
        gtin: data.gtin,
      },
      supplier: {
        name: data.supplierName,
        link: data.supplierLink,
      },
      dimensions: {
        length: data.sizeLength,
        width: data.sizeWidth,
        height: data.length,
        weight: data.weight,
      },
      media: {
        images: data.imageLinks || [],
        base64Images: data.imageBase64s || [],
      },
      metadata: {
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    };
  }
}

export function createVersionedResponse<T>(
  data: T,
  version: ApiVersion,
  status: number = 200
): Response {
  const transformedData = ProductTransformer.transformForVersion(
    data as Partial<ProductWithImages> & Record<string, unknown>,
    version
  );
  const meta = ApiVersionManager.getVersionMeta(version);

  const response: VersionedResponse<typeof transformedData> = {
    version,
    data: transformedData,
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

    if (!ApiVersionManager.isVersionSupported(requestedVersion)) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported API version',
          supportedVersions: ['v2'],
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
