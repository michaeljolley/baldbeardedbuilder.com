/*
  Sending mail.

  One interface, two providers, and the second one does not send anything.

  The log provider is the default whenever no API key is set, which covers a fork, a
  contributor, a preview build and every local run. That matters more here than elsewhere
  in the codebase: a notification path that throws on missing configuration turns a
  perfectly ordinary comment into a 500, because the reply that triggers the email is on
  the same request as the comment that caused it.

  Provider choice is Resend, and the reasoning is short. It is a plain REST call, so there
  is no SDK to keep current, it supports the unsubscribe headers RFC 8058 asks for, and
  swapping it is the one function below. Nothing else in the codebase knows the name.
*/

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** The URL a mail client hits for one click unsubscribe, per RFC 8058. */
  unsubscribeUrl?: string;
}

export interface MailResult {
  ok: boolean;
  /** Present when the send failed, and written to the queue row so a stuck queue says why. */
  error?: string;
}

const KEY = import.meta.env.RESEND_API_KEY;
const FROM = import.meta.env.MAIL_FROM ?? 'Bald Bearded Builder <hello@baldbeardedbuilder.com>';

/**
 * True when mail can actually leave the building.
 *
 * Read this before offering anything that promises an email. The queue still fills when
 * this is false, which is deliberate: the events are real, and a project that gains a key
 * later should find its history waiting rather than lost.
 */
export const mailConfigured = Boolean(KEY);

async function sendViaResend(mail: Mail): Promise<MailResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${KEY}`,
    'Content-Type': 'application/json'
  };

  const body: Record<string, unknown> = {
    from: FROM,
    to: [mail.to],
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  };

  /*
    Both headers or neither. List-Unsubscribe on its own gets a mail client to draw the
    button, and then the click opens a browser tab, which is the thing the reader was
    trying to avoid. List-Unsubscribe-Post is what makes it a single silent POST.
  */
  if (mail.unsubscribeUrl) {
    body.headers = {
      'List-Unsubscribe': `<${mail.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { ok: false, error: `resend ${res.status} ${detail.slice(0, 400)}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: `resend request failed: ${String(err).slice(0, 400)}` };
  }
}

function sendViaLog(mail: Mail): MailResult {
  /* eslint-disable-next-line no-console */
  console.log(`[mail] would send to ${mail.to}: ${mail.subject}`);
  return { ok: true };
}

export async function sendMail(mail: Mail): Promise<MailResult> {
  if (!KEY) return sendViaLog(mail);
  return sendViaResend(mail);
}
