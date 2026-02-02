import { 
  IValidationCache, 
  IValidationMetrics, 
  IValidationRuleEngine,
  ValidationMetric,
  ValidationStats,
  ValidationRule,
  RuleExecutionContext,
  RuleExecutionResult
} from './interfaces';

// Cache implementation
export class ValidationCache implements IValidationCache {
  private cache = new Map<string, { value: any; expires: number }>();
  private readonly defaultTTL = 300000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
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
  private readonly maxMetrics = 1000;

  record(metric: ValidationMetric): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    } as ValidationMetric & { timestamp: number });

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

    const successful = this.metrics.filter(m => m.success).length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalValidations: this.metrics.length,
      successRate: successful / this.metrics.length,
      averageDuration: totalDuration / this.metrics.length
    };
  }
}

// Rule engine implementation
export class ValidationRuleEngine implements IValidationRuleEngine {
  private rules = new Map<string, ValidationRule>();

  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  executeRules(context: RuleExecutionContext): RuleExecutionResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    const rulesExecuted: string[] = [];

    // Get active rules, sorted by priority
    const activeRules = Array.from(this.rules.values())
      .filter(rule => rule.active && !context.skipRules?.includes(rule.id))
      .sort((a, b) => b.priority - a.priority);

    for (const rule of activeRules) {
      try {
        const ruleErrors = rule.execute(context.data);
        
        // Separate errors and warnings based on severity
        ruleErrors.forEach(error => {
          if (error.severity === 'low') {
            warnings.push(error);
          } else {
            errors.push(error);
          }
        });

        rulesExecuted.push(rule.id);
      } catch (error) {
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

    return {
      errors,
      warnings,
      rulesExecuted
    };
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

  static createDependencies() {
    return {
      cache: this.createCache(),
      metrics: this.createMetrics(),
      ruleEngine: this.createRuleEngine()
    };
  }
}