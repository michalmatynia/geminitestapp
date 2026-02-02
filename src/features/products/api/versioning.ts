import { NextRequest } from 'next/server';
import type { ProductWithImages } from '@/shared/types/domain/products';

export type ApiVersion = 'v1' | 'v2' | 'v3';

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
  private static readonly SUPPORTED_VERSIONS: ApiVersion[] = ['v1', 'v2'];
  private static readonly DEPRECATED_VERSIONS: ApiVersion[] = ['v1'];

  static extractVersion(req: NextRequest): ApiVersion {
    // Check URL path first (/api/v2/products)
    const pathVersion = this.extractVersionFromPath(req.url);
    if (pathVersion) return pathVersion;

    // Check Accept header (Accept: application/vnd.api+json;version=2)
    const headerVersion = this.extractVersionFromHeader(req);
    if (headerVersion) return headerVersion;

    // Check query parameter (?version=v2)
    const queryVersion = this.extractVersionFromQuery(req);
    if (queryVersion) return queryVersion;

    // Default to current version
    return this.CURRENT_VERSION;
  }

  static isVersionSupported(version: ApiVersion): boolean {
    return this.SUPPORTED_VERSIONS.includes(version);
  }

  static isVersionDeprecated(version: ApiVersion): boolean {
    return this.DEPRECATED_VERSIONS.includes(version);
  }

  static getVersionMeta(version: ApiVersion): VersionedResponse<unknown>['meta'] {
    if (this.isVersionDeprecated(version)) {
      return {
        deprecated: true,
        deprecationDate: this.getDeprecationDate(version),
        migrationGuide: `/docs/migration/${version}-to-${this.CURRENT_VERSION}`,
      };
    }

    return undefined;
  }

  private static extractVersionFromPath(url: string): ApiVersion | null {
    const match = url.match(/\/api\/(v[1-3])\//);
    return match ? match[1] as ApiVersion : null;
  }

  private static extractVersionFromHeader(req: NextRequest): ApiVersion | null {
    const accept = req.headers.get('accept') || '';
    const match = accept.match(/version=([1-3])/);
    return match ? `v${match[1]}` as ApiVersion : null;
  }

  private static extractVersionFromQuery(req: NextRequest): ApiVersion | null {
    const url = new URL(req.url);
    const version = url.searchParams.get('version');
    if (version && ['v1', 'v2', 'v3'].includes(version)) {
      return version as ApiVersion;
    }
    return null;
  }

  private static getDeprecationDate(version: ApiVersion): string {
    const dates: Record<ApiVersion, string> = {
      'v1': '2024-12-31',
      'v2': '',
      'v3': ''
    };
    return dates[version];
  }
}

// Version-specific transformers
export class ProductTransformer {
  static transformForVersion<T extends Partial<ProductWithImages> & Record<string, unknown>>(
    data: T,
    version: ApiVersion
  ): unknown {
    switch (version) {
      case 'v1':
        return this.transformToV1(data);
      case 'v2':
        return this.transformToV2(data);
      case 'v3':
        return this.transformToV3(data);
      default:
        return data;
    }
  }

  private static transformToV1(data: Partial<ProductWithImages> & Record<string, unknown>): Record<string, unknown> {
    // V1 format - legacy structure
    return {
      id: data.id,
      sku: data.sku,
      name: data.name_en, // Single name field
      description: data.description_en, // Single description
      price: data.price,
      stock: data.stock,
      images: data.imageLinks || [],
      created: data.createdAt,
      updated: data.updatedAt
    };
  }

  private static transformToV2(data: Partial<ProductWithImages> & Record<string, unknown>): Record<string, unknown> {
    // V2 format - current structure with multilingual support
    return {
      id: data.id,
      sku: data.sku,
      baseProductId: data.baseProductId,
      names: {
        en: data.name_en,
        pl: data.name_pl,
        de: data.name_de
      },
      descriptions: {
        en: data.description_en,
        pl: data.description_pl,
        de: data.description_de
      },
      pricing: {
        price: data.price,
        priceGroupId: data.defaultPriceGroupId,
        comment: data.priceComment
      },
      inventory: {
        stock: data.stock,
        sku: data.sku,
        ean: data.ean,
        gtin: data.gtin
      },
      supplier: {
        name: data.supplierName,
        link: data.supplierLink
      },
      dimensions: {
        length: data.sizeLength,
        width: data.sizeWidth,
        height: data.length,
        weight: data.weight
      },
      media: {
        images: data.imageLinks || [],
        base64Images: data.imageBase64s || []
      },
      metadata: {
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      }
    };
  }

  private static transformToV3(data: Partial<ProductWithImages> & Record<string, unknown>): Record<string, unknown> {
    // V3 format - future structure with enhanced features
    return {
      ...this.transformToV2(data),
      variants: data.variants || [],
      categories: data.categories || [],
      tags: data.tags || [],
      seo: {
        slug: data.slug,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription
      }
    };
  }
}

// Versioned response wrapper
export function createVersionedResponse<T>(
  data: T,
  version: ApiVersion,
  status: number = 200
): Response {
  const transformedData = ProductTransformer.transformForVersion(data, version);
  const meta = ApiVersionManager.getVersionMeta(version);

  const response: VersionedResponse<typeof transformedData> = {
    version,
    data: transformedData,
    ...(Object.keys(meta).length > 0 && { meta })
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'API-Version': version
  };

  // Add deprecation headers
  if (ApiVersionManager.isVersionDeprecated(version)) {
    headers['Deprecation'] = 'true';
    headers['Sunset'] = meta.deprecationDate;
    headers['Link'] = `<${meta.migrationGuide}>; rel="migration-guide"`;
  }

  return new Response(JSON.stringify(response), {
    status,
    headers
  });
}

// Version middleware
export function withApiVersioning(
  handler: (req: NextRequest, version: ApiVersion, ...args: unknown[]) => Promise<Response>
) {
  return async (req: NextRequest, ...args: unknown[]): Promise<Response> => {
    const version = ApiVersionManager.extractVersion(req);

    // Check if version is supported
    if (!ApiVersionManager.isVersionSupported(version)) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported API version',
          supportedVersions: ['v1', 'v2'],
          requestedVersion: version
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(req, version, ...args);
  };
}