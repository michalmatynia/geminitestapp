#!/usr/bin/env python3
import os
import sys
from pathlib import Path

base_dir = Path('/Users/michalmatynia/Desktop/NPM/2026/Gemini new Pull/geminitestapp/src/shared/contracts')

directories = [
    'ui/component-props',
    'hooks',
    'context',
    'kangur-repositories',
    'workers',
    'forms'
]

index_content = {
    'ui/component-props': '''/**
 * UI Component Props
 *
 * Centralized prop type interfaces for reusable UI components.
 * These ensure consistency across the admin UI and shared design system.
 *
 * Export patterns:
 * - One interface per component
 * - Named as [ComponentName]Props
 * - Include optional/required prop distinctions
 *
 * Examples:
 * import { DialogProps, FormFieldProps } from '@/shared/contracts/ui/component-props';
 */

// Component prop contracts live in this directory
// Export them with: export { DialogProps } from './dialog';
''',
    'hooks': '''/**
 * Custom Hook Types
 *
 * Type contracts for React hooks, including options and return types.
 * 
 * Naming pattern:
 * - [HookName] for hook return interface
 * - [HookName]Options for hook options/config
 *
 * Examples:
 * import { UseProductsHook, UseProductsOptions } from '@/shared/contracts/hooks';
 */

// Hook contracts live in this directory
// Export them with: export { UseProductsHook, UseProductsOptions } from './use-products';
''',
    'context': '''/**
 * React Context Type Contracts
 *
 * Value type interfaces for React Context providers.
 *
 * Naming pattern:
 * - [ContextName]ContextValue or [ContextName]Context
 *
 * Examples:
 * import { UserSettingsContext, ThemeContext } from '@/shared/contracts/context';
 */

// Context value contracts live in this directory
// Export them with: export { UserSettingsContext } from './user-settings';
''',
    'kangur-repositories': '''/**
 * Kangur Data Repository Contracts
 *
 * Type interfaces for data access repositories used across Kangur features.
 *
 * Naming pattern:
 * - [Resource]Repository interface
 * - Includes CRUD methods with typed return values
 *
 * Examples:
 * import { ProductRepository, UserRepository } from '@/shared/contracts/kangur-repositories';
 */

// Repository contracts live in this directory
// Export them with: export { ProductRepository } from './product-repository';
''',
    'workers': '''/**
 * Background Job & Queue Message Types
 *
 * Job payload and result contracts for BullMQ workers and async operations.
 *
 * Naming pattern:
 * - [ActionName]Job or [ActionName]Request for payloads
 * - [ActionName]JobResult or [ActionName]Response for results
 *
 * Examples:
 * import { ProcessProductAiJob, ProcessProductAiJobResult } from '@/shared/contracts/workers';
 */

// Worker job contracts live in this directory
// Export them with: export { ProcessProductAiJob, ProcessProductAiJobResult } from './product-ai-job';
''',
    'forms': '''/**
 * Form Input & Output Schemas
 *
 * Zod schemas and inferred types for form submissions, API requests, and validation.
 * 
 * Naming pattern:
 * - [ActionName][Resource]Schema for Zod schema
 * - [ActionName][Resource]Request for inferred input type
 * - [Resource]Response for output/response types
 *
 * Examples:
 * import { createProductSchema, CreateProductRequest, ProductResponse } from '@/shared/contracts/forms';
 */

// Form input/output contracts live in this directory
// Export them with: export { createProductSchema, CreateProductRequest, ProductResponse } from './create-product';
'''
}

try:
    created_dirs = []
    created_files = []
    
    for directory in directories:
        full_path = base_dir / directory
        index_path = full_path / 'index.ts'
        
        # Create directory
        if not full_path.exists():
            full_path.mkdir(parents=True, exist_ok=True)
            created_dirs.append(directory)
            print(f"✓ Created directory: {directory}")
        
        # Create index.ts
        if not index_path.exists():
            index_path.write_text(index_content[directory])
            created_files.append(f"{directory}/index.ts")
            print(f"✓ Created index.ts: {directory}/index.ts")
        else:
            print(f"✓ Already exists: {directory}/index.ts")
    
    print(f"\n✅ All directories and index files created successfully!")
    print(f"\nCreated {len(created_dirs)} directories:")
    for d in created_dirs:
        print(f"  - {d}")
    print(f"\nCreated {len(created_files)} index.ts files:")
    for f in created_files:
        print(f"  - {f}")
        
except Exception as e:
    print(f"❌ Error: {e}", file=sys.stderr)
    sys.exit(1)
