import { ValidationError } from "./validators";

export type RuleCondition = {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'regex' | 'exists' | 'custom';
  value?: any;
  customFn?: (fieldValue: any, data: any) => boolean;
};

export type ValidationRule = {
  id: string;
  name: string;
  description?: string;
  priority: number;
  active: boolean;
  conditions: RuleCondition[];
  conditionLogic: 'and' | 'or';
  actions: RuleAction[];
  metadata?: Record<string, any>;
};

export type RuleAction = {
  type: 'error' | 'warning' | 'transform' | 'custom';
  field?: string;
  message?: string;
  code?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  transformFn?: (value: any, data: any) => any;
  customFn?: (data: any) => ValidationError[];
};

export type RuleExecutionContext = {
  data: any;
  metadata?: Record<string, any>;
  skipRules?: string[];
};

export type RuleExecutionResult = {
  ruleId: string;
  executed: boolean;
  conditionsMet: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  transformations: Record<string, any>;
};

class ValidationRuleEngine {
  private rules = new Map<string, ValidationRule>();
  private executionHistory: Array<{ timestamp: number; ruleId: string; result: RuleExecutionResult }> = [];

  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  updateRule(ruleId: string, updates: Partial<ValidationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.rules.set(ruleId, { ...rule, ...updates });
    return true;
  }

  getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): ValidationRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  private evaluateCondition(condition: RuleCondition, data: any): boolean {
    const fieldValue = this.getFieldValue(data, condition.field);

    switch (condition.operator) {
      case 'eq':
        return fieldValue === condition.value;
      case 'ne':
        return fieldValue !== condition.value;
      case 'gt':
        return fieldValue > condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'nin':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      case 'regex':
        return condition.value instanceof RegExp && condition.value.test(String(fieldValue));
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'custom':
        return condition.customFn ? condition.customFn(fieldValue, data) : false;
      default:
        return false;
    }
  }

  private getFieldValue(data: any, fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  private evaluateConditions(rule: ValidationRule, data: any): boolean {
    if (rule.conditions.length === 0) return true;

    const results = rule.conditions.map(condition => this.evaluateCondition(condition, data));

    return rule.conditionLogic === 'and' 
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  private executeActions(rule: ValidationRule, data: any): {
    errors: ValidationError[];
    warnings: ValidationError[];
    transformations: Record<string, any>;
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const transformations: Record<string, any> = {};

    for (const action of rule.actions) {
      switch (action.type) {
        case 'error':
          errors.push({
            field: action.field || 'rule',
            message: action.message || `Rule ${rule.name} failed`,
            code: action.code || 'rule_violation'
          });
          break;

        case 'warning':
          warnings.push({
            field: action.field || 'rule',
            message: action.message || `Rule ${rule.name} warning`,
            code: action.code || 'rule_warning'
          });
          break;

        case 'transform':
          if (action.field && action.transformFn) {
            const currentValue = this.getFieldValue(data, action.field);
            transformations[action.field] = action.transformFn(currentValue, data);
          }
          break;

        case 'custom':
          if (action.customFn) {
            const customErrors = action.customFn(data);
            errors.push(...customErrors);
          }
          break;
      }
    }

    return { errors, warnings, transformations };
  }

  executeRules(context: RuleExecutionContext): {
    errors: ValidationError[];
    warnings: ValidationError[];
    transformations: Record<string, any>;
    results: RuleExecutionResult[];
  } {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];
    const allTransformations: Record<string, any> = {};
    const results: RuleExecutionResult[] = [];

    const activeRules = this.getAllRules().filter(rule => 
      rule.active && !context.skipRules?.includes(rule.id)
    );

    for (const rule of activeRules) {
      const conditionsMet = this.evaluateConditions(rule, context.data);
      
      const result: RuleExecutionResult = {
        ruleId: rule.id,
        executed: true,
        conditionsMet,
        errors: [],
        warnings: [],
        transformations: {}
      };

      if (conditionsMet) {
        const actionResults = this.executeActions(rule, context.data);
        
        result.errors = actionResults.errors;
        result.warnings = actionResults.warnings;
        result.transformations = actionResults.transformations;

        allErrors.push(...actionResults.errors);
        allWarnings.push(...actionResults.warnings);
        Object.assign(allTransformations, actionResults.transformations);
      }

      results.push(result);
      
      // Store execution history
      this.executionHistory.push({
        timestamp: Date.now(),
        ruleId: rule.id,
        result
      });
    }

    // Keep only recent history
    this.executionHistory = this.executionHistory.slice(-1000);

    return {
      errors: allErrors,
      warnings: allWarnings,
      transformations: allTransformations,
      results
    };
  }

  getExecutionHistory(ruleId?: string, limit: number = 100): Array<{ timestamp: number; ruleId: string; result: RuleExecutionResult }> {
    let history = this.executionHistory;
    
    if (ruleId) {
      history = history.filter(entry => entry.ruleId === ruleId);
    }

    return history.slice(-limit);
  }

  exportRules(): ValidationRule[] {
    return this.getAllRules();
  }

  importRules(rules: ValidationRule[]): void {
    rules.forEach(rule => this.addRule(rule));
  }
}

export const validationRuleEngine = new ValidationRuleEngine();

// Predefined product validation rules
export const PRODUCT_VALIDATION_RULES: ValidationRule[] = [
  {
    id: 'required-sku',
    name: 'SKU Required',
    description: 'SKU is mandatory for all products',
    priority: 100,
    active: true,
    conditions: [
      { field: 'sku', operator: 'exists' }
    ],
    conditionLogic: 'and',
    actions: [
      {
        type: 'error',
        field: 'sku',
        message: 'SKU is required',
        code: 'missing_sku'
      }
    ]
  },
  {
    id: 'price-validation',
    name: 'Price Validation',
    description: 'Price must be positive',
    priority: 90,
    active: true,
    conditions: [
      { field: 'price', operator: 'exists' },
      { field: 'price', operator: 'gt', value: 0 }
    ],
    conditionLogic: 'and',
    actions: [
      {
        type: 'error',
        field: 'price',
        message: 'Price must be greater than 0',
        code: 'invalid_price'
      }
    ]
  },
  {
    id: 'premium-product-description',
    name: 'Premium Product Description',
    description: 'Products over $500 need detailed description',
    priority: 80,
    active: true,
    conditions: [
      { field: 'price', operator: 'gt', value: 500 }
    ],
    conditionLogic: 'and',
    actions: [
      {
        type: 'warning',
        field: 'description_en',
        message: 'Premium products should have detailed descriptions',
        code: 'premium_description_recommended'
      }
    ]
  }
];

// Initialize default rules
PRODUCT_VALIDATION_RULES.forEach(rule => {
  validationRuleEngine.addRule(rule);
});