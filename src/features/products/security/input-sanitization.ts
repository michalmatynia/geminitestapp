// import DOMPurify from 'isomorphic-dompurify';

type SanitizationOptions = {
  allowHtml?: boolean;
  maxLength?: number;
  allowedTags?: string[];
  stripWhitespace?: boolean;
};

export class InputSanitizer {
  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|`)/g,
    /(\bOR\b|\bAND\b).*?[=<>]/gi
  ];

  private static readonly XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi
  ];

  static sanitizeString(input: string, options: SanitizationOptions = {}): string {
    if (typeof input !== 'string') return '';

    let sanitized = input;

    // Strip whitespace if requested
    if (options.stripWhitespace) {
      sanitized = sanitized.trim();
    }

    // Enforce max length
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }

    // Handle HTML content
    if (options.allowHtml) {
      // DOMPurify not available - simple HTML sanitization
      sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    } else {
      // Remove all HTML tags
      sanitized = sanitized.replace(/<[^>]*>/g, '');
      
      // Remove potential XSS patterns
      this.XSS_PATTERNS.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
    }

    // Remove SQL injection patterns
    this.SQL_INJECTION_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Encode special characters
    sanitized = this.encodeSpecialChars(sanitized);

    return sanitized;
  }

  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldOptions: Partial<Record<keyof T, SanitizationOptions>> = {}
  ): T {
    const sanitized = {} as T;

    for (const [key, value] of Object.entries(obj)) {
      const options = fieldOptions[key as keyof T] || {};

      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeString(value, options) as T[keyof T];
      } else if (Array.isArray(value)) {
        sanitized[key as keyof T] = value.map(item => 
          typeof item === 'string' ? this.sanitizeString(item, options) : item
        ) as T[keyof T];
      } else if (value && typeof value === 'object') {
        sanitized[key as keyof T] = this.sanitizeObject(value, {}) as T[keyof T];
      } else {
        sanitized[key as keyof T] = value;
      }
    }

    return sanitized;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
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
export const ProductSanitizationRules = {
  sku: { maxLength: 50, stripWhitespace: true },
  name_en: { maxLength: 200, stripWhitespace: true },
  name_pl: { maxLength: 200, stripWhitespace: true },
  name_de: { maxLength: 200, stripWhitespace: true },
  description_en: { maxLength: 2000, allowHtml: true, allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em'] },
  description_pl: { maxLength: 2000, allowHtml: true, allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em'] },
  description_de: { maxLength: 2000, allowHtml: true, allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em'] },
  supplierName: { maxLength: 100, stripWhitespace: true },
  supplierLink: { maxLength: 500, stripWhitespace: true },
  priceComment: { maxLength: 500, stripWhitespace: true }
};

// Middleware for automatic sanitization
export function withInputSanitization<T extends Record<string, any>>(
  data: T,
  rules: Partial<Record<keyof T, SanitizationOptions>> = {}
): T {
  return InputSanitizer.sanitizeObject(data, rules);
}

// Validation helpers
export function validateProductInput(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.sku && !InputSanitizer.validateSku(data.sku)) {
    errors.push('Invalid SKU format');
  }

  if (data.supplierLink && !InputSanitizer.validateUrl(data.supplierLink)) {
    errors.push('Invalid supplier URL');
  }

  if (data.price && (typeof data.price !== 'number' || data.price < 0)) {
    errors.push('Invalid price value');
  }

  if (data.stock && (typeof data.stock !== 'number' || data.stock < 0)) {
    errors.push('Invalid stock value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}