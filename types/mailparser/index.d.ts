declare module 'mailparser' {
  export type AddressEntry = {
    name?: string | null;
    address?: string | null;
  };

  export type AddressObject = {
    value?: AddressEntry[] | null;
  };

  export type Attachment = {
    filename?: string | null;
    contentType?: string | null;
    size?: number | null;
    cid?: string | null;
    contentDisposition?: string | null;
  };

  export type ParsedMail = {
    from?: AddressObject | null;
    to?: AddressObject | null;
    cc?: AddressObject | null;
    bcc?: AddressObject | null;
    replyTo?: AddressObject | null;
    subject?: string | null;
    html?: string | { toString(): string } | null;
    text?: string | null;
    messageId?: string | null;
    date?: Date | null;
    inReplyTo?: string | null;
    references?: string[] | null;
    attachments?: Attachment[] | null;
  };

  export function simpleParser(
    source: string | Buffer | Uint8Array | NodeJS.ReadableStream
  ): Promise<ParsedMail>;
}
