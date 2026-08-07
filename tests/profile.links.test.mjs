/*
  A builder profile is a page full of somebody else's urls. Every one of them used to
  replace the profile in the same tab, so following a link meant losing the page you came
  to read. These assert the profile's outbound anchors leave the current tab alone, and
  that they still carry noopener so the opened page cannot reach back through window.opener.
*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const profile = fs.readFileSync(
  path.join(process.cwd(), 'src', 'pages', 'builders', '[handle].astro'),
  'utf8'
);

/* Anchors whose href is a profile supplied url rather than a route on this site. */
const outbound = [...profile.matchAll(/<a\b[^>]*>/gs)].filter(
  (match) => /href=\{`https:\/\//.test(match[0]) || /href=\{l\.url\}/.test(match[0])
);

test('a profile carries the outbound links this expects', () => {
  assert.equal(
    outbound.length,
    2,
    'the GitHub button and the user supplied links are the outbound anchors; if that changed, this test needs to change with it'
  );
});

test('outbound profile links open in a new browsing context', () => {
  for (const [tag] of outbound) {
    assert.match(tag, /\btarget="_blank"/, `a profile link stays in the current tab: ${tag}`);
    assert.match(tag, /\brel="[^"]*\bnoopener\b[^"]*"/, `a profile link is missing noopener: ${tag}`);
  }
});

test('user supplied profile links stay untrusted', () => {
  const [, userLinks] = outbound;
  assert.match(userLinks[0], /\brel="[^"]*\bnofollow\b[^"]*"/);
  assert.match(userLinks[0], /\brel="[^"]*\bugc\b[^"]*"/);
});
