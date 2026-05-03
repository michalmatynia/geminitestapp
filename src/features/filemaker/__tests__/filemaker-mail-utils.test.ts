import { describe, expect, it } from 'vitest';

import {
  buildFilemakerMailForwardHtmlSeed,
  buildFilemakerMailPlainText,
  buildFilemakerMailReplyHtmlSeed,
  buildFilemakerMailSnippet,
  ensureFilemakerForwardSubject,
  ensureFilemakerMailPlainTextAlternative,
  ensureFilemakerReplySubject,
  evaluateFilemakerMailAccountDmarcAlignment,
  FILEMAKER_MAIL_EMPTY_TEXT_FALLBACK,
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
    expect(ensureFilemakerForwardSubject('Launch update')).toBe('Fwd: Launch update');
    expect(ensureFilemakerForwardSubject('Fwd: Launch update')).toBe('Fwd: Launch update');
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

  it('builds sanitized forward html seeds for html and text messages', () => {
    const htmlSeed = buildFilemakerMailForwardHtmlSeed({
      from: { address: 'sender@example.com', name: 'Sender' },
      to: [{ address: 'support@example.com', name: 'Support' }],
      cc: [{ address: 'team@example.com', name: 'Team' }],
      sentAt: '2026-03-28T09:00:00.000Z',
      subject: 'Launch update',
      htmlBody: '<p>Hello</p><script>alert(1)</script>',
      textBody: null,
    });

    expect(htmlSeed).toContain('data-filemaker-forward-quote="true"');
    expect(htmlSeed).toContain('Forwarded message');
    expect(htmlSeed).toContain('<p>Hello</p>');
    expect(htmlSeed).not.toContain('<script>');

    const textSeed = buildFilemakerMailForwardHtmlSeed({
      from: { address: 'sender@example.com', name: null },
      to: [],
      cc: [],
      sentAt: null,
      subject: '',
      htmlBody: null,
      textBody: 'Plain text body',
    });

    expect(textSeed).toContain('Plain text body');
    expect(textSeed).toContain('Unknown time');
    expect(textSeed).toContain('(no subject)');
  });

  describe('ensureFilemakerMailPlainTextAlternative', () => {
    it('returns the text as-is when non-empty', () => {
      expect(ensureFilemakerMailPlainTextAlternative('Hello', '<p>Hello</p>')).toBe('Hello');
    });

    it('derives text from HTML when text is empty', () => {
      const result = ensureFilemakerMailPlainTextAlternative('', '<p>Hello <strong>world</strong></p>');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('falls back to a default notice when both text and derived HTML text are empty', () => {
      expect(
        ensureFilemakerMailPlainTextAlternative('', '<img src="tracker.png"/>')
      ).toBe(FILEMAKER_MAIL_EMPTY_TEXT_FALLBACK);
    });

    it('returns undefined when both inputs are empty', () => {
      expect(ensureFilemakerMailPlainTextAlternative('', '')).toBeUndefined();
      expect(ensureFilemakerMailPlainTextAlternative(null, null)).toBeUndefined();
    });
  });

  describe('evaluateFilemakerMailAccountDmarcAlignment', () => {
    it('flags fully unconfigured DKIM as dkim_disabled', () => {
      const result = evaluateFilemakerMailAccountDmarcAlignment({
        emailAddress: 'noreply@acme.com',
      });
      expect(result.warnings).toEqual(['dkim_disabled']);
      expect(result.isAligned).toBe(false);
    });

    it('flags partial DKIM configuration', () => {
      const result = evaluateFilemakerMailAccountDmarcAlignment({
        emailAddress: 'noreply@acme.com',
        dkimDomain: 'acme.com',
        dkimKeySelector: 'mail',
        hasDkimPrivateKey: false,
      });
      expect(result.warnings).toContain('dkim_partially_configured');
    });

    it('passes when DKIM domain matches the From organisational domain', () => {
      const result = evaluateFilemakerMailAccountDmarcAlignment({
        emailAddress: 'noreply@mail.acme.com',
        dkimDomain: 'acme.com',
        dkimKeySelector: 'mail',
        hasDkimPrivateKey: true,
      });
      expect(result.isAligned).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('flags when DKIM domain is on a different organisational domain', () => {
      const result = evaluateFilemakerMailAccountDmarcAlignment({
        emailAddress: 'noreply@acme.com',
        dkimDomain: 'sendgrid.net',
        dkimKeySelector: 'mail',
        hasDkimPrivateKey: true,
      });
      expect(result.warnings).toContain('dkim_domain_misaligned');
    });

    it('flags Reply-To on a different organisational domain', () => {
      const result = evaluateFilemakerMailAccountDmarcAlignment({
        emailAddress: 'noreply@acme.com',
        replyToEmail: 'support@elsewhere.io',
        dkimDomain: 'acme.com',
        dkimKeySelector: 'mail',
        hasDkimPrivateKey: true,
      });
      expect(result.warnings).toContain('reply_to_domain_misaligned');
    });
  });
});
