import { logClientError } from '@/shared/utils/observability/client-error-logger';
// import DOMPurify from 'isomorphic-dompurify';

export type SanitizationOptions = {
  allowHtml?: boolean;
  maxLength?: number;
  allowedTags?: string[];
  stripWhitespace?: boolean;
};

export class InputSanitizer {
  private static readonly SQL_INJECTION_PATTERNS: RegExp[] = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|`)/g,
    /(\bOR\b|\bAND\b).*?[=<>]/gi,
  ];

  private static readonly XSS_PATTERNS: RegExp[] = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
  ];

  static sanitizeString(input: string, options: SanitizationOptions = {}): string {
    if (typeof input !== 'string') return '';

    let sanitized = input;

    // Strip whitespace if requested
    if (options.stripWhitespace === true) {
      sanitized = sanitized.trim();
    }

    // Enforce max length
    if (typeof options.maxLength === 'number' && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Handle HTML content
    if (options.allowHtml === true) {
      // DOMPurify not available - simple HTML sanitization
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    } else {
      // Remove all HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');

      // Remove potential XSS patterns
      this.XSS_PATTERNS.forEach((pattern: RegExp) => {
        sanitized = sanitized.replace(pattern, '');
      });
    }

    // Remove SQL injection patterns
    this.SQL_INJECTION_PATTERNS.forEach((pattern: RegExp) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Encode special characters
    sanitized = this.encodeSpecialChars(sanitized);

    return sanitized;
  }

  static sanitizeObject<T extends Record<string, unknown>>(
    obj: T,
    fieldOptions: Partial<Record<keyof T, SanitizationOptions>> = {}
  ): T {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const options = fieldOptions[key as keyof T] ?? {};

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value, options);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: unknown) =>
          typeof item === 'string' ? this.sanitizeString(item, options) : item
        );
      } else if (value !== null && typeof value === 'object') {
        sanitized[key] = this.sanitizeObject(
          value as Record<string, unknown>,
          {}
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch (error) {
      logClientError(error);
      return false;
    }
  }

  static validateSku(sku: string): boolean {
    // SKU should be alphanumeric with hyphens/underscores, 3-50 chars
    const skuRegex = /^[A-Za-z0-9_-]{3,50}$/;
    return skuRegex.test(sku);
  }

  private static encodeSpecialChars(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}

// Product-specific sanitization rules
export const ProductSanitizationRules: Record<string, SanitizationOptions> = {
  sku: { maxLength: 50, stripWhitespace: true },
  name_en: { maxLength: 200, stripWhitespace: true },
  name_pl: { maxLength: 200, stripWhitespace: true },
  name_de: { maxLength: 200, stripWhitespace: true },
  description_en: {
    maxLength: 2000,
    allowHtml: true,
    allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em'],
  },
  description_pl: {
    maxLength: 2000,
    allowHtml: true,
    allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em'],
  },
  description_de: {
    maxLength: 2000,
    allowHtml: true,
    allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em'],
  },
  supplierName: { maxLength: 100, stripWhitespace: true },
  supplierLink: { maxLength: 500, stripWhitespace: true },
  priceComment: { maxLength: 500, stripWhitespace: true },
};

// Middleware for automatic sanitization
export function withInputSanitization<T extends Record<string, unknown>>(
  data: T,
  rules: Partial<Record<keyof T, SanitizationOptions>> = {}
): T {
  return InputSanitizer.sanitizeObject(data, rules);
}

const validateSkuField = (data: Record<string, unknown>, errors: string[]): void => {
  const sku: string | undefined = typeof data['sku'] === 'string' ? data['sku'] : undefined;
  if (sku !== undefined && sku.length > 0 && !InputSanitizer.validateSku(sku)) {
    errors.push('Invalid SKU format');
  }
};

const validateSupplierLinkField = (data: Record<string, unknown>, errors: string[]): void => {
  const supplierLink: string | undefined =
    typeof data['supplierLink'] === 'string' ? data['supplierLink'] : undefined;
  if (supplierLink !== undefined && supplierLink.length > 0 && !InputSanitizer.validateUrl(supplierLink)) {
    errors.push('Invalid supplier URL');
  }
};

const validateNonNegativeNumberField = (
  data: Record<string, unknown>,
  field: string,
  message: string,
  errors: string[]
): void => {
  const value: unknown = data[field];
  if (value !== undefined && (typeof value !== 'number' || value < 0)) {
    errors.push(message);
  }
};

// Validation helpers
export function validateProductInput(data: Record<string, unknown>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  validateSkuField(data, errors);
  validateSupplierLinkField(data, errors);
  validateNonNegativeNumberField(data, 'price', 'Invalid price value', errors);
  validateNonNegativeNumberField(data, 'stock', 'Invalid stock value', errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}
