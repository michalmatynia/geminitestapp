import { describe, expect, it } from 'vitest';

import {
  buildFilemakerMailPlainText,
  buildFilemakerMailReplyHtmlSeed,
  buildFilemakerMailSnippet,
  ensureFilemakerReplySubject,
  formatFilemakerMailboxAllowlist,
  formatFilemakerMailParticipants,
  normalizeFilemakerMailSubject,
  parseFilemakerMailboxAllowlistInput,
  parseFilemakerMailParticipantsInput,
  resolveFilemakerReplyRecipients,
} from '@/features/filemaker/mail-utils';

describe('filemaker mail utils', () => {
  it('normalizes subjects and reply prefixes', () => {
    expect(normalizeFilemakerMailSubject(' Re:  Fwd:  Launch update ')).toBe('Launch update');
    expect(normalizeFilemakerMailSubject('   ')).toBe('(no subject)');
    expect(ensureFilemakerReplySubject('Launch update')).toBe('Re: Launch update');
    expect(ensureFilemakerReplySubject('Re: Launch update')).toBe('Re: Launch update');
  });

  it('parses, dedupes, and formats participants', () => {
    const participants = parseFilemakerMailParticipantsInput(
      ' Jane Doe <JANE@example.com> , team@example.com, jane@example.com '
    );

    expect(participants).toEqual([
      { address: 'jane@example.com', name: 'Jane Doe' },
      { address: 'team@example.com', name: null },
    ]);
    expect(formatFilemakerMailParticipants(participants)).toBe(
      'Jane Doe <jane@example.com>, team@example.com'
    );
  });

  it('parses and formats mailbox allowlists', () => {
    const allowlist = parseFilemakerMailboxAllowlistInput(' INBOX, Sent , INBOX , Archive ');

    expect(allowlist).toEqual(['INBOX', 'Sent', 'Archive']);
    expect(formatFilemakerMailboxAllowlist(allowlist)).toBe('INBOX, Sent, Archive');
  });

  it('builds plain text and snippets from html content', () => {
    const html = '<p>Hello <strong>World</strong></p><p>Second line</p>';

    expect(buildFilemakerMailPlainText(html)).toContain('Hello World');
    expect(buildFilemakerMailSnippet(null, html)).toContain('Hello World');
  });

  it('uses replyTo over from when resolving reply recipients', () => {
    expect(
      resolveFilemakerReplyRecipients({
        from: { address: 'sender@example.com', name: 'Sender' },
        replyTo: [{ address: 'reply@example.com', name: 'Reply' }],
      })
    ).toEqual([{ address: 'reply@example.com', name: 'Reply' }]);

    expect(
      resolveFilemakerReplyRecipients({
        from: { address: 'sender@example.com', name: 'Sender' },
        replyTo: [],
      })
    ).toEqual([{ address: 'sender@example.com', name: 'Sender' }]);
  });

  it('builds sanitized reply html seeds for html and text messages', () => {
    const htmlSeed = buildFilemakerMailReplyHtmlSeed({
      from: { address: 'sender@example.com', name: 'Sender' },
      sentAt: '2026-03-28T09:00:00.000Z',
      htmlBody: '<p>Hello</p><script>alert(1)</script>',
      textBody: null,
    });

    expect(htmlSeed).toContain('data-filemaker-reply-quote="true"');
    expect(htmlSeed).toContain('<p>Hello</p>');
    expect(htmlSeed).not.toContain('<script>');

    const textSeed = buildFilemakerMailReplyHtmlSeed({
      from: { address: 'sender@example.com', name: null },
      sentAt: null,
      htmlBody: null,
      textBody: 'Plain text body',
    });

    expect(textSeed).toContain('Plain text body');
    expect(textSeed).toContain('Unknown time');
  });
});
