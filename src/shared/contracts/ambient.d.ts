import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id?: string;
      role?: string | null;
      permissions?: string[];
      roleLevel?: number | null;
      isElevated?: boolean;
      accountDisabled?: boolean;
      accountBanned?: boolean;
    };
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

declare module 'pdf-parse' {
  export interface PdfParseResult {
    text: string;
    numpages?: number;
    info?: unknown;
    metadata?: unknown;
    version?: string;
  }

  export default function pdfParse(
    data: Buffer | Uint8Array | ArrayBuffer
  ): Promise<PdfParseResult>;
}
