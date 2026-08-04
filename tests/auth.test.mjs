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
