type ValidationMetric = {
  name: string;
  timestamp: number;
  duration: number;
  success: boolean;
  errorCount: number;
  fieldErrors: Record<string, number>;
};

class ValidationMetrics {
  private metrics: ValidationMetric[] = [];
  private readonly maxMetrics = 1000;

  record(metric: Omit<ValidationMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now()
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getStats(timeWindowMs: number = 300000): {
    totalValidations: number;
    successRate: number;
    averageDuration: number;
    commonErrors: Array<{ field: string; count: number }>;
    performanceByValidation: Record<string, { count: number; avgDuration: number; successRate: number }>;
  } {
    const cutoff = Date.now() - timeWindowMs;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalValidations: 0,
        successRate: 0,
        averageDuration: 0,
        commonErrors: [],
        performanceByValidation: {}
      };
    }

    const totalValidations = recentMetrics.length;
    const successfulValidations = recentMetrics.filter(m => m.success).length;
    const successRate = successfulValidations / totalValidations;
    const averageDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalValidations;

    // Aggregate field errors
    const fieldErrorCounts: Record<string, number> = {};
    recentMetrics.forEach(metric => {
      Object.entries(metric.fieldErrors).forEach(([field, count]) => {
        fieldErrorCounts[field] = (fieldErrorCounts[field] || 0) + count;
      });
    });

    const commonErrors = Object.entries(fieldErrorCounts)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Performance by validation type
    const performanceByValidation: Record<string, { count: number; avgDuration: number; successRate: number }> = {};
    recentMetrics.forEach(metric => {
      if (!performanceByValidation[metric.name]) {
        performanceByValidation[metric.name] = { count: 0, avgDuration: 0, successRate: 0 };
      }
      performanceByValidation[metric.name]!.count++;
    });

    Object.keys(performanceByValidation).forEach(name => {
      const nameMetrics = recentMetrics.filter(m => m.name === name);
      const stats = performanceByValidation[name]!;
      stats.avgDuration = nameMetrics.reduce((sum, m) => sum + m.duration, 0) / nameMetrics.length;
      stats.successRate = nameMetrics.filter(m => m.success).length / nameMetrics.length;
    });

    return {
      totalValidations,
      successRate,
      averageDuration,
      commonErrors,
      performanceByValidation
    };
  }

  exportMetrics(): ValidationMetric[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const validationMetrics = new ValidationMetrics();

export function withMetrics<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  name: string
): T {
  return (async (...args: Parameters<T>) => {
    const start = performance.now();
    let success = false;
    let errorCount = 0;
    const fieldErrors: Record<string, number> = {};

    try {
      const result = await fn(...args);
      success = true;
      
      // If result has validation errors, count them
      if (result && !result.success && result.errors) {
        errorCount = result.errors.length;
        result.errors.forEach((error: any) => {
          fieldErrors[error.field] = (fieldErrors[error.field] || 0) + 1;
        });
      }
      
      return result;
    } catch (error) {
      errorCount = 1;
      fieldErrors.unknown = 1;
      throw error;
    } finally {
      const duration = performance.now() - start;
      validationMetrics.record({
        name,
        duration,
        success,
        errorCount,
        fieldErrors
      });
    }
  }) as T;
}

// Health check for validation system
export function getValidationHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: ReturnType<ValidationMetrics['getStats']>;
  issues: string[];
} {
  const stats = validationMetrics.getStats();
  const issues: string[] = [];
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check success rate
  if (stats.successRate < 0.5) {
    status = 'unhealthy';
    issues.push(`Low success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  } else if (stats.successRate < 0.8) {
    status = 'degraded';
    issues.push(`Degraded success rate: ${(stats.successRate * 100).toFixed(1)}%`);
  }

  // Check average duration
  if (stats.averageDuration > 1000) {
    status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    issues.push(`High average validation time: ${stats.averageDuration.toFixed(1)}ms`);
  }

  // Check for common errors
  const mostCommonError = stats.commonErrors[0];
  if (mostCommonError && mostCommonError.count > stats.totalValidations * 0.3) {
    status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
    issues.push(`High error rate for field: ${mostCommonError.field}`);
  }

  return { status, metrics: stats, issues };
}