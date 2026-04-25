import { describe, expect, it } from 'vitest';

import type { MailparserParsedMail } from '../mail-types';
import {
  isLikelyFilemakerMailBounceMessage,
  isLikelyFilemakerMailComplaintMessage,
  parseFilemakerMailComplaintReport,
  parseFilemakerMailDsnReport,
} from '../mail-dsn';

const buildParsed = (
  overrides: Partial<MailparserParsedMail> = {}
): MailparserParsedMail =>
  ({
    from: {
      value: [],
      html: '',
      text: '',
    },
    subject: '',
    text: '',
    attachments: [],
    ...overrides,
  }) as unknown as MailparserParsedMail;

describe('isLikelyFilemakerMailBounceMessage', () => {
  it('detects bounces from mailer-daemon / postmaster senders', () => {
    expect(
      isLikelyFilemakerMailBounceMessage(
        buildParsed({
          from: {
            value: [{ address: 'MAILER-DAEMON@example.com', name: null }],
          } as MailparserParsedMail['from'],
        })
      )
    ).toBe(true);

    expect(
      isLikelyFilemakerMailBounceMessage(
        buildParsed({
          from: {
            value: [{ address: 'postmaster@gmail.com', name: null }],
          } as MailparserParsedMail['from'],
        })
      )
    ).toBe(true);
  });

  it('detects bounces by DSN subject patterns', () => {
    expect(
      isLikelyFilemakerMailBounceMessage(
        buildParsed({ subject: 'Undeliverable: Your message to bob@acme.com' })
      )
    ).toBe(true);
    expect(
      isLikelyFilemakerMailBounceMessage(buildParsed({ subject: 'Delivery Status Notification (Failure)' }))
    ).toBe(true);
    expect(isLikelyFilemakerMailBounceMessage(buildParsed({ subject: 'Weekly digest' }))).toBe(false);
  });

  it('detects bounces by message/delivery-status attachment', () => {
    expect(
      isLikelyFilemakerMailBounceMessage(
        buildParsed({
          attachments: [
            {
              contentType: 'message/delivery-status',
              content: Buffer.from(''),
            },
          ] as MailparserParsedMail['attachments'],
        })
      )
    ).toBe(true);
  });
});

describe('parseFilemakerMailDsnReport', () => {
  it('extracts bounced recipient, diagnostic code, and 5.x.x permanent status', () => {
    const report = parseFilemakerMailDsnReport(
      buildParsed({
        text: `This is an automatically generated Delivery Status Notification.\n\nFinal-Recipient: rfc822; bob@acme.com\nAction: failed\nStatus: 5.1.1\nDiagnostic-Code: smtp; 550 5.1.1 <bob@acme.com>: Recipient address rejected: User unknown`,
      })
    );

    expect(report.bouncedAddresses).toContain('bob@acme.com');
    expect(report.status).toBe('5.1.1');
    expect(report.diagnosticCode).toContain('User unknown');
    expect(report.isPermanent).toBe(true);
  });

  it('flags 4.x.x statuses as transient (not permanent)', () => {
    const report = parseFilemakerMailDsnReport(
      buildParsed({
        text: `Final-Recipient: rfc822; jane@acme.com\nStatus: 4.2.1\nDiagnostic-Code: 452 4.2.1 Try again later.`,
      })
    );
    expect(report.bouncedAddresses).toContain('jane@acme.com');
    expect(report.isPermanent).toBe(false);
  });

  it('falls back to scanning the body when no Final-Recipient header is present', () => {
    const report = parseFilemakerMailDsnReport(
      buildParsed({
        from: {
          value: [{ address: 'mailer-daemon@example.com', name: null }],
        } as MailparserParsedMail['from'],
        text: 'The message to employee@acme.com could not be delivered.',
      })
    );
    expect(report.bouncedAddresses).toContain('employee@acme.com');
    expect(report.bouncedAddresses).not.toContain('mailer-daemon@example.com');
  });

  it('reads a DSN report from a message/delivery-status attachment', () => {
    const report = parseFilemakerMailDsnReport(
      buildParsed({
        attachments: [
          {
            contentType: 'message/delivery-status',
            content: Buffer.from(
              'Reporting-MTA: dns; mx.example.com\nFinal-Recipient: rfc822; nope@acme.com\nStatus: 5.0.0\nDiagnostic-Code: smtp; 550 user unknown'
            ),
          },
        ] as MailparserParsedMail['attachments'],
      })
    );
    expect(report.bouncedAddresses).toContain('nope@acme.com');
    expect(report.status).toBe('5.0.0');
    expect(report.isPermanent).toBe(true);
  });
});

describe('isLikelyFilemakerMailComplaintMessage', () => {
  it('detects ARF reports by message/feedback-report attachment', () => {
    expect(
      isLikelyFilemakerMailComplaintMessage(
        buildParsed({
          attachments: [
            {
              contentType: 'message/feedback-report',
              content: Buffer.from('Feedback-Type: abuse\n'),
            },
          ] as MailparserParsedMail['attachments'],
        })
      )
    ).toBe(true);
  });

  it('detects ARF by complaint subject + Feedback-Type header in body', () => {
    expect(
      isLikelyFilemakerMailComplaintMessage(
        buildParsed({
          subject: 'Email Feedback Report for IP 1.2.3.4',
          text: 'Feedback-Type: abuse\nUser-Agent: SomeISP-FBL/1.0\n',
        })
      )
    ).toBe(true);
  });

  it('returns false for normal mail', () => {
    expect(
      isLikelyFilemakerMailComplaintMessage(
        buildParsed({ subject: 'Hello there', text: 'Just saying hi' })
      )
    ).toBe(false);
  });
});

describe('parseFilemakerMailComplaintReport', () => {
  it('extracts complainant address, feedback type, and user agent', () => {
    const report = parseFilemakerMailComplaintReport(
      buildParsed({
        attachments: [
          {
            contentType: 'message/feedback-report',
            content: Buffer.from(
              'Feedback-Type: abuse\nUser-Agent: SomeISP-FBL/1.0\nVersion: 1\nOriginal-Rcpt-To: complainer@yahoo.com\n'
            ),
          },
        ] as MailparserParsedMail['attachments'],
      })
    );

    expect(report.complainedAddresses).toContain('complainer@yahoo.com');
    expect(report.feedbackType).toBe('abuse');
    expect(report.userAgent).toBe('SomeISP-FBL/1.0');
  });

  it('falls back to Final-Recipient when Original-Rcpt-To is absent', () => {
    const report = parseFilemakerMailComplaintReport(
      buildParsed({
        text: 'Feedback-Type: abuse\nFinal-Recipient: rfc822; user@example.com\n',
      })
    );
    expect(report.complainedAddresses).toContain('user@example.com');
  });
});
