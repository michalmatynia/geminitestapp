// src/global.d.ts
import 'react';

declare module 'react' {
  interface CSSProperties {
    '--ai-paths-flow-duration'?: string;
    '--ai-paths-flow-opacity'?: string;
    '--ai-paths-flow-dash'?: string;
    '--ai-paths-flow-glow'?: string;
    // Add other custom properties if needed
  }
}
