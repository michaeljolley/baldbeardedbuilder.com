/*
  Sending notification email through Resend.

  Delivery has three locks: a production deploy context, an explicit enable flag and an
  API key. A key accidentally exposed to a preview is therefore not enough to mail real
  users. Disabled environments leave the queue untouched in notifications.ts.
*/

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  /** The URL a mail client hits for one click unsubscribe, per RFC 8058. */
  unsubscribeUrl?: string;
}

export interface MailResult {
  ok: boolean;
  /** Sanitized for storage and logs. Never contains an address or provider response body. */
  error?: string;
  retryAfterSeconds?: number;
}

const KEY = import.meta.env.RESEND_API_KEY;
const FROM = import.meta.env.MAIL_FROM ?? 'Bald Bearded Builder <hello@baldbeardedbuilder.com>';
const REPLY_TO = import.meta.env.MAIL_REPLY_TO ?? 'hello@baldbeardedbuilder.com';
const DELIVERY_REQUESTED = import.meta.env.MAIL_DELIVERY_ENABLED === 'true';
const PRODUCTION = import.meta.env.CONTEXT === 'production';

export const mailDeliveryEnabled = Boolean(KEY && DELIVERY_REQUESTED && PRODUCTION);

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);

  const date = Date.parse(value);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, Math.ceil((date - Date.now()) / 1000));
}

function providerError(status: number): string {
  if (status === 401 || status === 403) return 'resend_auth';
  if (status === 429) return 'resend_rate_limited';
  if (status === 422) return 'resend_rejected';
  if (status >= 500) return 'resend_unavailable';
  return `resend_http_${status}`;
}

export async function sendMail(mail: Mail): Promise<MailResult> {
  if (!mailDeliveryEnabled || !KEY) return { ok: false, error: 'delivery_disabled' };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': mail.idempotencyKey
  };

  const body: Record<string, unknown> = {
    from: FROM,
    to: [mail.to],
    reply_to: [REPLY_TO],
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  };

  if (mail.unsubscribeUrl) {
    body.headers = {
      'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000)
    });

    if (!response.ok) {
      return {
        ok: false,
        error: providerError(response.status),
        retryAfterSeconds: retryAfterSeconds(response.headers.get('retry-after'))
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof DOMException && error.name === 'TimeoutError'
        ? 'resend_timeout'
        : 'resend_network'
    };
  }
}
