// Core domain interfaces
export interface IValidator<T> {
  validate(data: unknown): Promise<ValidationResult<T>>;
  validateField(field: string, value: unknown): Promise<FieldValidationResult>;
}

export interface IValidationCache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  invalidate(pattern?: string): void;
}

export interface IValidationMetrics {
  record(metric: ValidationMetric): void;
  getStats(): ValidationStats;
}

export interface IValidationRuleEngine {
  executeRules(context: RuleExecutionContext): RuleExecutionResult;
  addRule(rule: ValidationRule): void;
  removeRule(ruleId: string): boolean;
}

// Core domain types
export type ValidationResult<T> = {
  success: true;
  data: T;
  warnings?: ValidationError[];
  metadata: ValidationMetadata;
} | {
  success: false;
  errors: ValidationError[];
  warnings?: ValidationError[];
  metadata: ValidationMetadata;
};

export type FieldValidationResult = {
  field: string;
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
};

export type ValidationError = {
  field: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
};

export type ValidationMetadata = {
  validationTime: number;
  rulesApplied: string[];
  cacheHit: boolean;
  source: 'schema' | 'config' | 'external' | 'rule';
};

export type ValidationMetric = {
  name: string;
  duration: number;
  success: boolean;
  errorCount: number;
};

export type ValidationStats = {
  totalValidations: number;
  successRate: number;
  averageDuration: number;
};

export type ValidationRule = {
  id: string;
  name: string;
  priority: number;
  active: boolean;
  execute(data: any): ValidationError[];
};

export type RuleExecutionContext = {
  data: any;
  skipRules?: string[];
};

export type RuleExecutionResult = {
  errors: ValidationError[];
  warnings: ValidationError[];
  rulesExecuted: string[];
};