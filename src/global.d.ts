// src/global.d.ts
import type { JSX as ReactJSX } from 'react';
import 'react';

declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
    interface ElementClass extends ReactJSX.ElementClass {}
    interface ElementAttributesProperty extends ReactJSX.ElementAttributesProperty {}
    interface ElementChildrenAttribute extends ReactJSX.ElementChildrenAttribute {}
    type LibraryManagedAttributes<C, P> = ReactJSX.LibraryManagedAttributes<C, P>;
    interface IntrinsicAttributes extends ReactJSX.IntrinsicAttributes {}
    interface IntrinsicClassAttributes<T> extends ReactJSX.IntrinsicClassAttributes<T> {}
    interface IntrinsicElements extends ReactJSX.IntrinsicElements {}
  }
}

declare module 'react' {
  interface CSSProperties {
    '--ai-paths-flow-duration'?: string;
    '--ai-paths-flow-opacity'?: string;
    '--ai-paths-flow-dash'?: string;
    '--ai-paths-flow-glow'?: string;
    // Add other custom properties if needed
  }
}

declare module 'pdf-parse' {
  function PDFParse(dataBuffer: Buffer | Uint8Array, options?: unknown): Promise<unknown>;
  export = PDFParse;
}

declare module 'next-auth' {
  interface Session {
    user?: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isElevated?: boolean;
      role?: string | null;
      roleLevel?: number | null;
      roleAssigned?: boolean;
      permissions?: string[];
      accountDisabled?: boolean;
      accountBanned?: boolean;
    };
  }

  interface User {
    isElevated?: boolean;
    role?: string | null;
    roleLevel?: number | null;
    roleAssigned?: boolean;
    permissions?: string[];
    accountDisabled?: boolean;
    accountBanned?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    isElevated?: boolean;
    role?: string | null;
    roleLevel?: number | null;
    roleAssigned?: boolean;
    permissions?: string[];
    accountDisabled?: boolean;
    accountBanned?: boolean;
  }
}
