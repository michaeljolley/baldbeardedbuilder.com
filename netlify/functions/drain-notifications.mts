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

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(25_000)
  });

  if (!response.ok) {
    throw new Error(`[email-drain] endpoint returned ${response.status}`);
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
