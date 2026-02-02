import { 
  IValidationCache, 
  IValidationMetrics, 
  IValidationRuleEngine,
  ValidationMetric,
  ValidationStats,
  ValidationRule,
  RuleExecutionContext,
  RuleExecutionResult,
  ValidationError
} from './interfaces';

// Cache implementation
export class ValidationCache implements IValidationCache {
  private cache: Map<string, { value: unknown; expires: number }> = new Map<string, { value: unknown; expires: number }>();
  private readonly defaultTTL: number = 300000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
    
    // Cleanup expired entries periodically
    if (this.cache.size % 100 === 0) {
      this.cleanup();
    }
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key);
      }
    }
  }
}

// Metrics implementation
export class ValidationMetrics implements IValidationMetrics {
  private metrics: ValidationMetric[] = [];
  private readonly maxMetrics: number = 1000;

  record(metric: ValidationMetric): void {
    this.metrics.push({
      ...metric
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getStats(): ValidationStats {
    if (this.metrics.length === 0) {
      return {
        totalValidations: 0,
        successRate: 0,
        averageDuration: 0
      };
    }

    const successful: number = this.metrics.filter((m: ValidationMetric) => m.success).length;
    const totalDuration: number = this.metrics.reduce((sum: number, m: ValidationMetric) => sum + m.duration, 0);

    return {
      totalValidations: this.metrics.length,
      successRate: successful / this.metrics.length,
      averageDuration: totalDuration / this.metrics.length
    };
  }
}

// Rule engine implementation
export class ValidationRuleEngine implements IValidationRuleEngine {
  private rules: Map<string, ValidationRule> = new Map<string, ValidationRule>();

  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  executeRules(context: RuleExecutionContext): RuleExecutionResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const rulesExecuted: string[] = [];

    // Get active rules, sorted by priority
    const activeRules: ValidationRule[] = Array.from(this.rules.values())
      .filter((rule: ValidationRule) => rule.active && !context.skipRules?.includes(rule.id))
      .sort((a: ValidationRule, b: ValidationRule) => b.priority - a.priority);

    for (const rule of activeRules) {
      try {
        const ruleErrors: ValidationError[] = rule.execute(context.data);
        
        // Separate errors and warnings based on severity
        ruleErrors.forEach((error: ValidationError) => {
          if (error.severity === 'low') {
            warnings.push(error);
          }
          else {
            errors.push(error);
          }
        });

        rulesExecuted.push(rule.id);
      } catch (error: unknown) {
        // Rule execution failed - add as warning
        warnings.push({
          field: 'rule',
          message: `Rule ${rule.name} execution failed`,
          code: 'RULE_EXECUTION_ERROR',
          severity: 'low',
          context: { ruleId: rule.id, error: String(error) }
        });
      }
    }

    const result: RuleExecutionResult = {
      errors,
      warnings,
      rulesExecuted
    };

    return result;
  }
}

// Infrastructure factory
export class InfrastructureFactory {
  static createCache(): IValidationCache {
    return new ValidationCache();
  }

  static createMetrics(): IValidationMetrics {
    return new ValidationMetrics();
  }

  static createRuleEngine(): IValidationRuleEngine {
    return new ValidationRuleEngine();
  }

  static createDependencies(): {
    cache: IValidationCache;
    metrics: IValidationMetrics;
    ruleEngine: IValidationRuleEngine;
  } {
    return {
      cache: this.createCache(),
      metrics: this.createMetrics(),
      ruleEngine: this.createRuleEngine()
    };
  }
}