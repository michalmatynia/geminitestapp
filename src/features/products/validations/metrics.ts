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
  private readonly maxMetrics: number = 1000;

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
    const cutoff: number = Date.now() - timeWindowMs;
    const recentMetrics: ValidationMetric[] = this.metrics.filter((m: ValidationMetric) => m.timestamp > cutoff);

    if (recentMetrics.length === 0) {
      return {
        totalValidations: 0,
        successRate: 0,
        averageDuration: 0,
        commonErrors: [],
        performanceByValidation: {}
      };
    }

    const totalValidations: number = recentMetrics.length;
    const successfulValidations: number = recentMetrics.filter((m: ValidationMetric) => m.success).length;
    const successRate: number = successfulValidations / totalValidations;
    const averageDuration: number = recentMetrics.reduce((sum: number, m: ValidationMetric) => sum + m.duration, 0) / totalValidations;

    // Aggregate field errors
    const fieldErrorCounts: Record<string, number> = {};
    recentMetrics.forEach((metric: ValidationMetric) => {
      Object.entries(metric.fieldErrors).forEach(([field, count]: [string, number]) => {
        fieldErrorCounts[field] = (fieldErrorCounts[field] || 0) + count;
      });
    });

    const commonErrors: { field: string; count: number }[] = Object.entries(fieldErrorCounts)
      .map(([field, count]: [string, number]) => ({ field, count }))
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .slice(0, 10);

    // Performance by validation type
    const performanceByValidation: Record<string, { count: number; avgDuration: number; successRate: number }> = {};
    recentMetrics.forEach((metric: ValidationMetric) => {
      if (!performanceByValidation[metric.name]) {
        performanceByValidation[metric.name] = { count: 0, avgDuration: 0, successRate: 0 };
      }
      performanceByValidation[metric.name]!.count++;
    });

    Object.keys(performanceByValidation).forEach((name: string) => {
      const nameMetrics: ValidationMetric[] = recentMetrics.filter((m: ValidationMetric) => m.name === name);
      const stats = performanceByValidation[name]!;
      stats.avgDuration = nameMetrics.reduce((sum: number, m: ValidationMetric) => sum + m.duration, 0) / nameMetrics.length;
      stats.successRate = nameMetrics.filter((m: ValidationMetric) => m.success).length / nameMetrics.length;
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

export function withMetrics<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
  name: string
): (...args: Args) => Promise<R> {
  return (async (...args: Args): Promise<R> => {
    const start: number = performance.now();
    let success: boolean = false;
    let errorCount: number = 0;
    const fieldErrors: Record<string, number> = {};

    try {
      const result: R = await fn(...args);
      const resultAny = result as unknown as {
        success?: unknown;
        errors?: unknown;
      };
      success = resultAny?.success === true;
      
      // If result has validation errors, count them
      if (resultAny && resultAny.success === false && Array.isArray(resultAny.errors)) {
        const errs: Array<{ field?: unknown }> = resultAny.errors as Array<{ field?: unknown }>;
        errorCount = errs.length;
        errs.forEach((error: { field?: unknown }) => {
          const field: string = typeof error.field === "string" ? error.field : "unknown";
          fieldErrors[field] = (fieldErrors[field] || 0) + 1;
        });
      }
      
      return result;
    } catch (error: unknown) {
      errorCount = 1;
      fieldErrors.unknown = 1;
      throw error;
    } finally {
      const duration: number = performance.now() - start;
      validationMetrics.record({
        name,
        duration,
        success,
        errorCount,
        fieldErrors
      });
    }
  });
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
