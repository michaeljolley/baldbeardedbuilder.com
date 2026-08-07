import type { Config } from '@netlify/functions';

interface DrainResult {
  enabled: boolean;
  considered: number;
  sent: number;
  skipped: number;
  failed: number;
  deadLetterIds: number[];
}

function requiredEnvironment(name: string): string {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`[email-drain] missing ${name}`);
  return value;
}

function isDrainResult(value: unknown): value is DrainResult {
  if (typeof value !== 'object' || value === null) return false;

  return (
    'enabled' in value &&
    typeof value.enabled === 'boolean' &&
    'considered' in value &&
    typeof value.considered === 'number' &&
    'sent' in value &&
    typeof value.sent === 'number' &&
    'skipped' in value &&
    typeof value.skipped === 'number' &&
    'failed' in value &&
    typeof value.failed === 'number' &&
    'deadLetterIds' in value &&
    Array.isArray(value.deadLetterIds) &&
    value.deadLetterIds.every((id) => typeof id === 'number')
  );
}

export default async (): Promise<void> => {
  const baseUrl = requiredEnvironment('URL');
  const secret = requiredEnvironment('NOTIFY_SECRET');
  const endpoint = new URL('/api/notifications/', baseUrl);

  /*
    Origin is not decoration. Astro's checkOrigin guard is on by default and rejects any
    on demand POST whose origin does not match the site, before the route sees it, with a
    403 and the body "Cross-site POST form submissions are forbidden". A server to server
    fetch sends no origin at all, so every scheduled run failed at the edge and the queue
    never drained. Setting it here rather than turning the guard off keeps the protection
    on the forms that actually need it.

    JSON is sent for the same reason from the other direction: the guard only inspects
    form-like content types, so an explicit one puts this request outside the shape it
    cares about even if the origin ever stops matching.
  */
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      Origin: endpoint.origin,
      'Content-Type': 'application/json'
    },
    body: '{}',
    signal: AbortSignal.timeout(25_000)
  });

  if (!response.ok) {
    /*
      The status alone sent somebody reading the route's own auth branch, which returns
      404 and never 403. The body says which layer refused: Astro's CSRF guard answers in
      prose, the route answers "no". It is this site's own response, so it carries no
      address and no provider text, and it is capped anyway.
    */
    const detail = await response.text().catch(() => '');
    const reason = detail.trim().slice(0, 200);

    throw new Error(
      `[email-drain] endpoint returned ${response.status}${reason ? `: ${reason}` : ''}`
    );
  }

  const result: unknown = await response.json();
  if (!isDrainResult(result)) throw new Error('[email-drain] endpoint returned an invalid result');

  if (!result.enabled) {
    console.log('[email-drain] delivery disabled');
    return;
  }

  console.log(
    `[email-drain] considered=${result.considered} sent=${result.sent} skipped=${result.skipped}`
  );

  if (result.failed > 0) {
    console.log(`[email-drain] retrying=${result.failed}`);
  }

  if (result.deadLetterIds.length > 0) {
    throw new Error(
      `[email-drain] failed=${result.failed} dead_letters=${result.deadLetterIds.join(',') || 'none'}`
    );
  }
};

export const config: Config = {
  schedule: '*/5 * * * *'
};
