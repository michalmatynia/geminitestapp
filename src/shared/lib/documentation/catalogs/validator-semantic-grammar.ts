/**
 * Validator Semantic Grammar Catalog
 * 
 * Semantic grammar definitions for validator import system.
 * Provides:
 * - Validator import manifest
 * - Semantic grammar schema definitions
 * - Import options configuration
 * - Type definitions for imports
 * - Grammar validation rules
 */

import validatorImportManifest from '@docs/validator/semantic-grammar/manifest.json';
import validatorImportOptions from '@docs/validator/semantic-grammar/options/validator-import-options.v1.json';
import validatorImportSchema from '@docs/validator/semantic-grammar/schema/validator-import.v1.json';
import validatorImportTypes from '@docs/validator/semantic-grammar/types/validator-import-types.v1.json';

export const VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_MANIFEST = validatorImportManifest;
export const VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_SCHEMA = validatorImportSchema;
export const VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_OPTIONS = validatorImportOptions;
export const VALIDATOR_IMPORT_SEMANTIC_GRAMMAR_TYPES = validatorImportTypes;
