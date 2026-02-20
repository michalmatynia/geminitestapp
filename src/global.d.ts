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

declare module 'pdf-parse' {
  function PDFParse(dataBuffer: Buffer | Uint8Array, options?: any): Promise<any>;
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
      permissions?: string[];
    };
  }

  interface User {
    isElevated?: boolean;
    permissions?: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    isElevated?: boolean;
    permissions?: string[];
  }
}
