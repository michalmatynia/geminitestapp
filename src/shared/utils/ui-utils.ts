/**
 * UI Utility Functions
 * 
 * Collection of utility functions for UI development and styling.
 * Provides consistent patterns for class name management and
 * Tailwind CSS integration across the application.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind CSS classes with intelligent conflict resolution.
 * 
 * Combines clsx for conditional class handling with tailwind-merge
 * for proper Tailwind class deduplication and conflict resolution.
 * 
 * Example:
 * cn('px-2 py-1', condition && 'px-4', 'text-red-500')
 * // Resolves conflicts and removes duplicates
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
