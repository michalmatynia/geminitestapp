import { DefaultSession } from 'next-auth';

declare module 'pdf-parse' {
  export interface PdfParseResult {
    text: string;
    numpages?: number;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer,
    options?: unknown
  ): Promise<PdfParseResult>;
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string | null;
      roleLevel: number | null;
      isElevated: boolean;
      permissions: string[];
      accountDisabled: boolean;
      accountBanned: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string | null;
    roleLevel?: number | null;
    isElevated?: boolean;
    permissions?: string[];
    accountDisabled?: boolean;
    accountBanned?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string | null;
    permissions?: string[];
    roleLevel?: number | null;
    isElevated?: boolean;
    accountDisabled?: boolean;
    accountBanned?: boolean;
  }
}
