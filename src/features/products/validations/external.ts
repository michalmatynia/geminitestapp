import { ValidationError } from "./validators";

export type ExternalValidationProvider = {
  name: string;
  endpoint: string;
  apiKey?: string;
  timeout?: number;
  retries?: number;
};

export type ExternalValidationRequest = {
  data: unknown;
  validationType: 'product_create' | 'product_update' | 'custom';
  rules?: string[];
};

export type ExternalValidationResponse = {
  success: boolean;
  errors: ValidationError[];
  metadata?: Record<string, unknown>;
  provider: string;
};

class ExternalValidationService {
  private providers: Map<string, ExternalValidationProvider> = new Map<string, ExternalValidationProvider>();
  private cache: Map<string, { result: ExternalValidationResponse; timestamp: number }> = new Map<string, { result: ExternalValidationResponse; timestamp: number }>();
  private readonly CACHE_TTL: number = 300000; // 5 minutes

  registerProvider(provider: ExternalValidationProvider): void {
    this.providers.set(provider.name, provider);
  }

  private async callProvider(
    provider: ExternalValidationProvider,
    request: ExternalValidationRequest
  ): Promise<ExternalValidationResponse> {
    const { endpoint, apiKey, timeout = 5000, retries = 2 } = provider;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = (await response.json()) as Partial<ExternalValidationResponse>;
        
        return {
          success: result.success || false,
          errors: (result.errors as ValidationError[]) || [],
          metadata: result.metadata as Record<string, unknown>,
          provider: provider.name,
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < retries) {
          // Exponential backoff
          await new Promise((resolve: (value: void) => void) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    // All retries failed
    return {
      success: false,
      errors: [{
        field: 'external_validation',
        message: `External validation failed: ${lastError?.message}`,
        code: 'external_service_error',
        severity: 'medium'
      }],
      provider: provider.name,
    };
  }

  private getCacheKey(providerName: string, request: ExternalValidationRequest): string {
    return `${providerName}:${JSON.stringify(request)}`;
  }

  async validate(
    providerName: string,
    request: ExternalValidationRequest,
    useCache: boolean = true
  ): Promise<ExternalValidationResponse> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      return {
        success: false,
        errors: [{
          field: 'provider',
          message: `Unknown validation provider: ${providerName}`,
          code: 'unknown_provider',
          severity: 'medium'
        }],
        provider: providerName,
      };
    }

    // Check cache
    if (useCache) {
      const cacheKey = this.getCacheKey(providerName, request);
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.result;
      }
    }

    // Call external provider
    const result = await this.callProvider(provider, request);

    // Cache successful results
    if (useCache && result.success) {
      const cacheKey = this.getCacheKey(providerName, request);
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
    }

    return result;
  }

  async validateWithMultipleProviders(
    providerNames: string[],
    request: ExternalValidationRequest,
    strategy: 'all' | 'any' | 'majority' = 'any'
  ): Promise<ExternalValidationResponse> {
    const results = await Promise.all(
      providerNames.map((name: string) => this.validate(name, request))
    );

    const successful = results.filter((r: ExternalValidationResponse) => r.success);
    const allErrors = results.flatMap((r: ExternalValidationResponse) => r.errors);

    let success: boolean;
    switch (strategy) {
      case 'all':
        success = successful.length === results.length;
        break;
      case 'any':
        success = successful.length > 0;
        break;
      case 'majority':
        success = successful.length > results.length / 2;
        break;
    }

    return {
      success,
      errors: success ? [] : allErrors,
      metadata: {
        strategy,
        providers: providerNames,
        results: results.map((r: ExternalValidationResponse) => ({ provider: r.provider, success: r.success }))
      },
      provider: 'multi-provider',
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

export const externalValidationService = new ExternalValidationService();

// Built-in provider configurations
export const VALIDATION_PROVIDERS = {
  BUSINESS_RULES: {
    name: 'business-rules',
    endpoint: '/api/validation/business-rules',
    timeout: 3000,
  },
  DATA_QUALITY: {
    name: 'data-quality',
    endpoint: '/api/validation/data-quality',
    timeout: 5000,
  },
  COMPLIANCE: {
    name: 'compliance',
    endpoint: '/api/validation/compliance',
    timeout: 10000,
    retries: 3,
  },
} as const;

// Initialize default providers
(Object.values(VALIDATION_PROVIDERS) as unknown as ExternalValidationProvider[]).forEach((provider: ExternalValidationProvider) => {
  externalValidationService.registerProvider(provider);
});

// Wrapper function for easy integration
export async function validateWithExternalService(
  data: unknown,
  providers: string[] = ['business-rules'],
  strategy: 'all' | 'any' | 'majority' = 'any'
): Promise<ValidationError[]> {
  const request: ExternalValidationRequest = {
    data,
    validationType: 'product_create',
  };

  const result = await externalValidationService.validateWithMultipleProviders(
    providers,
    request,
    strategy
  );

  return result.errors;
}