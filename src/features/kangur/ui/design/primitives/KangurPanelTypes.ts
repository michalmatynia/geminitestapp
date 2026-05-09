/**
 * Kangur Panel Component Types
 * 
 * Type definitions for Kangur UI panel components.
 * Provides:
 * - Base panel component prop types
 * - HTML div element attribute inheritance
 * - Type safety for panel implementations
 * - Consistent panel interface contracts
 */

import type * as React from 'react';

/** Props interface for Kangur panel components extending standard div attributes */
export type KangurPanelProps = React.HTMLAttributes<HTMLDivElement>;
