"use client";

import { useCallback } from "react";
import {
  COLUMN_ALLOWED_BLOCK_TYPES,
  ROW_ALLOWED_BLOCK_TYPES,
  getSectionDefinition,
  getBlockDefinition,
} from "../components/page-builder/section-registry";

export interface DropValidationResult {
  isValid: boolean;
  reason?: string;
}

// Block types that can be nested inside other blocks (container blocks)
const CONTAINER_BLOCK_TYPES = new Set(["ImageWithText", "Hero", "RichText", "Block", "TextAtom"]);

// Section types that can be converted to blocks
const CONVERTIBLE_SECTION_TYPES = new Set([
  "ImageWithText",
  "Hero",
  "RichText",
  "Block",
  "TextElement",
  "ImageElement",
  "TextAtom",
  "ButtonElement",
]);

/**
 * Hook for validating drag-and-drop operations in the CMS page builder.
 * Provides functions to check if a block can be dropped in various targets.
 */
export function useDropValidation(): {
  canDropInRow: (blockType: string) => DropValidationResult;
  canDropInColumn: (blockType: string) => DropValidationResult;
  canDropInSection: (blockType: string, sectionType: string) => DropValidationResult;
  canDropInNestedBlock: (blockType: string, parentBlockType: string) => DropValidationResult;
  canConvertSectionToBlock: (sectionType: string) => DropValidationResult;
  isContainerBlock: (blockType: string) => boolean;
} {
  /**
   * Check if a block type can be dropped directly into a Row
   */
  const canDropInRow = useCallback((blockType: string): DropValidationResult => {
    if (ROW_ALLOWED_BLOCK_TYPES.includes(blockType)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      reason: `"${blockType}" cannot be placed directly in a Row. Allowed types: Column, TextElement, ImageElement, Button, etc.`,
    };
  }, []);

  /**
   * Check if a block type can be dropped into a Column
   */
  const canDropInColumn = useCallback((blockType: string): DropValidationResult => {
    if (COLUMN_ALLOWED_BLOCK_TYPES.includes(blockType)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      reason: `"${blockType}" cannot be placed in a Column. Allowed types: Heading, Text, TextElement, ImageElement, Button, etc.`,
    };
  }, []);

  /**
   * Check if a block type can be dropped into a specific section type
   */
  const canDropInSection = useCallback(
    (blockType: string, sectionType: string): DropValidationResult => {
      const sectionDef = getSectionDefinition(sectionType);
      if (!sectionDef) {
        return { isValid: false, reason: `Unknown section type: ${sectionType}` };
      }

      if (sectionDef.allowedBlockTypes.includes(blockType)) {
        return { isValid: true };
      }

      return {
        isValid: false,
        reason: `"${blockType}" cannot be placed in "${sectionDef.label}" section.`,
      };
    },
    []
  );

  /**
   * Check if a block type can be dropped into a nested block (container block)
   */
  const canDropInNestedBlock = useCallback(
    (blockType: string, parentBlockType: string): DropValidationResult => {
      // First check if the parent is a container block
      if (!CONTAINER_BLOCK_TYPES.has(parentBlockType)) {
        return {
          isValid: false,
          reason: `"${parentBlockType}" is not a container block and cannot hold child elements.`,
        };
      }

      // Check the block definition for allowed types
      const blockDef = getBlockDefinition(parentBlockType);
      if (!blockDef) {
        return { isValid: false, reason: `Unknown block type: ${parentBlockType}` };
      }

      // For blocks that use the section definition's allowed types
      const sectionDef = getSectionDefinition(parentBlockType);
      if (sectionDef && sectionDef.allowedBlockTypes.includes(blockType)) {
        return { isValid: true };
      }

      // For TextAtom, only TextAtomLetter is allowed
      if (parentBlockType === "TextAtom") {
        if (blockType === "TextAtomLetter") {
          return { isValid: true };
        }
        return {
          isValid: false,
          reason: `TextAtom can only contain TextAtomLetter elements.`,
        };
      }

      // Default container block types allow common elements
      const commonAllowed = ["Heading", "Text", "TextElement", "ImageElement", "Button", "AppEmbed"];
      if (commonAllowed.includes(blockType)) {
        return { isValid: true };
      }

      return {
        isValid: false,
        reason: `"${blockType}" cannot be placed inside "${parentBlockType}".`,
      };
    },
    []
  );

  /**
   * Check if a section can be converted to a block (for dropping sections into columns)
   */
  const canConvertSectionToBlock = useCallback(
    (sectionType: string): DropValidationResult => {
      if (CONVERTIBLE_SECTION_TYPES.has(sectionType)) {
        return { isValid: true };
      }
      return {
        isValid: false,
        reason: `"${sectionType}" sections cannot be converted to blocks.`,
      };
    },
    []
  );

  /**
   * Check if a block type is a container that can hold other blocks
   */
  const isContainerBlock = useCallback((blockType: string): boolean => {
    return CONTAINER_BLOCK_TYPES.has(blockType);
  }, []);

  return {
    canDropInRow,
    canDropInColumn,
    canDropInSection,
    canDropInNestedBlock,
    canConvertSectionToBlock,
    isContainerBlock,
  };
}
