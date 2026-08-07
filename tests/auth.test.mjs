import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();
const signin = fs.readFileSync(path.join(ROOT, 'src', 'pages', 'auth', 'signin.ts'), 'utf8');

test('GitHub OAuth returns to the canonical trailing-slash callback URL', () => {
  assert.match(signin, /`\/auth\/callback\/\?next=\$\{encodeURIComponent\(next\)\}`/);
  assert.doesNotMatch(signin, /`\/auth\/callback\?next=/);
});

/*
  20260805000000_base_table_grants.sql revokes every table privilege in public from anon
  and authenticated, and the argument for doing that is a claim about this source tree:
  serverClient is only ever used for the auth handshake, so nothing reads public as the
  visitor. When the claim was written it was already false. Middleware was selecting from
  profiles that way, so it returned permission denied, and because only data was
  destructured, a signed in reader silently rendered as a signed out one.

  The grant is the right call and the claim is the thing that rotted, so this checks the
  claim. If a serverClient ever needs a .from again, the grant has to be revisited in the
  same change, not discovered later from a page that looks logged out.
*/
function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|astro|mjs)$/.test(entry.name) ? [full] : [];
  });
}

test('no serverClient reads the public schema, which is what the grants migration assumes', () => {
  const offenders = [];

  for (const file of sourceFiles(path.join(ROOT, 'src'))) {
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('serverClient(')) continue;

    const relative = path.relative(ROOT, file).split(path.sep).join('/');

    /* serverClient(...).from(...) with no variable in between. */
    if (/serverClient\([^)]*\)\s*\.\s*(from|rpc)\s*\(/.test(source)) {
      offenders.push(`${relative} chains .from or .rpc straight off serverClient()`);
    }

    /* And the usual shape, where the client is held in a variable first. */
    for (const [, name] of source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?serverClient\(/g)) {
      if (new RegExp(`\\b${name}\\s*\\.\\s*(from|rpc)\\s*\\(`).test(source)) {
        offenders.push(`${relative} calls ${name}.from or ${name}.rpc`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `These read public as anon or authenticated, which the base table grants revoked:\n${offenders.join('\n')}`
  );
});
