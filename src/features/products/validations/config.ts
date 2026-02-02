import { z } from "zod";
import type { ValidationError } from "./validators";

export type ValidationConfig = {
  strictMode: boolean;
  requiredFields: string[];
  customValidators: Record<string, (value: any) => string | null>;
  fieldConstraints: Record<string, {
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean;
  }>;
  businessRules: Array<{
    name: string;
    condition: (data: any) => boolean;
    validator: (data: any) => ValidationError[];
  }>;
};

const defaultConfig: ValidationConfig = {
  strictMode: false,
  requiredFields: ["sku"],
  customValidators: {},
  fieldConstraints: {
    price: { min: 0 },
    stock: { min: 0 },
    weight: { min: 0 },
    sizeLength: { min: 0 },
    sizeWidth: { min: 0 },
    length: { min: 0 },
  },
  businessRules: [
    {
      name: "supplier_link_required",
      condition: (data) => !!data.supplierName,
      validator: (data) => {
        if (!data.supplierLink) {
          return [{
            field: "supplierLink",
            message: "Supplier link is required when supplier name is provided",
            code: "business_rule_violation",
            severity: "medium"
          }];
        }
        return [];
      }
    },
    {
      name: "multilingual_consistency",
      condition: (data) => data.name_en || data.name_pl || data.name_de,
      validator: (data) => {
        const errors: ValidationError[] = [];
        const hasAnyName = data.name_en || data.name_pl || data.name_de;
        
        if (hasAnyName && !data.name_en) {
          errors.push({
            field: "name_en",
            message: "English name is required when any language name is provided",
            code: "multilingual_rule",
            severity: "medium"
          });
        }
        
        return errors;
      }
    }
  ]
};

let currentConfig = { ...defaultConfig };

export function setValidationConfig(config: Partial<ValidationConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

export function getValidationConfig(): ValidationConfig {
  return { ...currentConfig };
}

export function resetValidationConfig(): void {
  currentConfig = { ...defaultConfig };
}

export function validateWithConfig(data: any, _schema: z.ZodSchema): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Apply custom field validators
  Object.entries(currentConfig.customValidators).forEach(([field, validator]) => {
    if (data[field] !== undefined) {
      const error = validator(data[field]);
      if (error) {
        errors.push({ field, message: error, code: "custom_validation", severity: "medium" });
      }
    }
  });
  
  // Apply field constraints
  Object.entries(currentConfig.fieldConstraints).forEach(([field, constraints]) => {
    const value = data[field];
    if (value !== undefined && value !== null) {
      if (constraints.min !== undefined && value < constraints.min) {
        errors.push({
          field,
          message: `${field} must be at least ${constraints.min}`,
          code: "constraint_violation",
          severity: "medium"
        });
      }
      if (constraints.max !== undefined && value > constraints.max) {
        errors.push({
          field,
          message: `${field} must be at most ${constraints.max}`,
          code: "constraint_violation",
          severity: "medium"
        });
      }
      if (constraints.pattern && typeof value === "string" && !constraints.pattern.test(value)) {
        errors.push({
          field,
          message: `${field} format is invalid`,
          code: "pattern_mismatch",
          severity: "medium"
        });
      }
      if (constraints.custom && !constraints.custom(value)) {
        errors.push({
          field,
          message: `${field} failed custom validation`,
          code: "custom_constraint",
          severity: "medium"
        });
      }
    }
  });
  
  // Apply business rules
  currentConfig.businessRules.forEach(rule => {
    if (rule.condition(data)) {
      errors.push(...rule.validator(data));
    }
  });
  
  return errors;
}