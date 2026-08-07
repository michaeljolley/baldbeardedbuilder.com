/*
  These execute the profile form rules. Until this file existed they had never run
  anywhere: they sat inside `saveAccount`, behind `if (!supabaseWritable) return ...`, and
  there are no v2 keys, so every test, build and accessibility run took the early return.

  `safeUrl` is the one that matters most. It is what stops a javascript: url becoming a
  link on a public profile, and it was reachable by nothing.
*/

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HANDLE_RE,
  HANDLE_ERROR,
  HANDLE_MIN,
  HANDLE_MAX,
  LINKS_MAX,
  LABEL_MAX,
  BIO_MAX,
  DISPLAY_NAME_MAX,
  normalizeHandle,
  handleProblem,
  safeUrl,
  labelFor,
  linksFrom,
  textField
} from '../src/lib/profile-fields.ts';

/* A tiny stand in for FormData.get, which returns null for a field nobody posted. */
const form = (fields) => (name) => (name in fields ? fields[name] : null);

test('a javascript url never becomes a profile link', () => {
  for (const attack of [
    'javascript:alert(1)',
    'JavaScript:alert(document.cookie)',
    '  javascript:alert(1)  ',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'mailto:someone@example.com',
    'chrome://settings'
  ]) {
    assert.equal(safeUrl(attack), null, `${attack} was allowed through`);
  }
});

test('a scheme is refused for being a scheme, not for failing to parse', () => {
  /*
    This is the one that found the defect. The old rule pasted https onto the front of
    whatever arrived, so javascript: was refused only because `alert(1)` is not a valid
    port, while file:/// parsed happily into a link to a host called `file`. Both draw null
    now, and this case proves it is the scheme test doing it: the remainder here is a
    perfectly valid host and path, so nothing downstream has any reason to object.
  */
  assert.equal(safeUrl('javascript://example.com/x'), null);
  assert.equal(safeUrl('file://example.com/x'), null);
});

test('a host with a port is not mistaken for a scheme', () => {
  assert.equal(safeUrl('example.com:8080'), 'https://example.com:8080/');
  assert.equal(safeUrl('example.com:8080/path'), 'https://example.com:8080/path');
});

test('an ordinary link survives, with or without the scheme typed out', () => {
  assert.equal(safeUrl('https://example.com'), 'https://example.com/');
  assert.equal(safeUrl('http://example.com'), 'http://example.com/');
  assert.equal(safeUrl('example.com'), 'https://example.com/');
  assert.equal(safeUrl('  example.com/blog  '), 'https://example.com/blog');
});

test('an empty link is nothing rather than an error', () => {
  assert.equal(safeUrl(''), null);
  assert.equal(safeUrl('   '), null);
});

test('an unlabelled link draws its hostname, without the www', () => {
  assert.equal(labelFor('https://www.example.com/x', ''), 'example.com');
  assert.equal(labelFor('https://example.com/x', ''), 'example.com');
  assert.equal(labelFor('https://example.com/x', 'My blog'), 'My blog');
});

test('the handle rule and the sentence describing it agree', () => {
  /*
    The copy says 3 to 32 characters. If somebody widens the regular expression and leaves
    the sentence alone, a person reads a limit that is not the limit. That is the defect
    this branch keeps finding, so it is asserted rather than trusted.
  */
  assert.match(HANDLE_ERROR, new RegExp(`${HANDLE_MIN} to ${HANDLE_MAX} characters`));

  assert.equal(handleProblem('a'.repeat(HANDLE_MIN - 1)), HANDLE_ERROR);
  assert.equal(handleProblem('a'.repeat(HANDLE_MIN)), null);
  assert.equal(handleProblem('a'.repeat(HANDLE_MAX)), null);
  assert.equal(handleProblem('a'.repeat(HANDLE_MAX + 1)), HANDLE_ERROR);
});

test('a hyphen may sit inside a handle and not at either end', () => {
  assert.equal(handleProblem('bald-bearded-builder'), null);
  assert.equal(handleProblem('-bbb'), HANDLE_ERROR);
  assert.equal(handleProblem('bbb-'), HANDLE_ERROR);
  assert.equal(handleProblem('b--b'), null);
});

test('a handle is lower cased and trimmed before it is judged', () => {
  assert.equal(normalizeHandle('  BaldBearded  '), 'baldbearded');
  assert.equal(handleProblem(normalizeHandle(' BBB ')), null);
  assert.equal(handleProblem(normalizeHandle(null)), HANDLE_ERROR);
});

test('a handle with a space or a slash in it is refused', () => {
  for (const bad of ['bald bearded', 'bald/bearded', 'bald.bearded', 'bald_bearded', 'bäld']) {
    assert.equal(handleProblem(bad), HANDLE_ERROR, `${bad} was allowed`);
  }
  assert.ok(HANDLE_RE.test('bbb'));
});

test('links come back in the order they were posted', () => {
  const links = linksFrom(
    form({
      link_url_0: 'https://one.example',
      link_label_0: 'One',
      link_url_1: 'two.example',
      link_label_1: 'Two'
    })
  );
  assert.deepEqual(links, [
    { label: 'One', url: 'https://one.example/' },
    { label: 'Two', url: 'https://two.example/' }
  ]);
});

test('a gap in the middle of the link rows does not stop the ones after it', () => {
  const links = linksFrom(
    form({
      link_url_0: 'https://one.example',
      link_url_2: 'https://three.example'
    })
  );
  assert.equal(links.length, 2);
  assert.equal(links[1].url, 'https://three.example/');
});

test('a label with no url is not a link', () => {
  assert.deepEqual(linksFrom(form({ link_label_0: 'My blog' })), []);
});

test('an unsafe url is dropped rather than saved with its label', () => {
  const links = linksFrom(
    form({
      link_url_0: 'javascript:alert(1)',
      link_label_0: 'Totally normal',
      link_url_1: 'https://fine.example'
    })
  );
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://fine.example/');
});

test('no form can post more links than the limit', () => {
  const fields = {};
  for (let i = 0; i < LINKS_MAX + 3; i++) fields[`link_url_${i}`] = `https://n${i}.example`;
  assert.equal(linksFrom(form(fields)).length, LINKS_MAX);
});

test('a long label is cut to the limit rather than refused', () => {
  const links = linksFrom(
    form({ link_url_0: 'https://example.com', link_label_0: 'x'.repeat(LABEL_MAX + 20) })
  );
  assert.equal(links[0].label.length, LABEL_MAX);
});

test('an empty form gives no links and empty text', () => {
  assert.deepEqual(linksFrom(form({})), []);
  assert.equal(textField(null, BIO_MAX), '');
  assert.equal(textField(undefined, DISPLAY_NAME_MAX), '');
});

test('a bio is trimmed then cut, so trailing spaces do not eat the allowance', () => {
  assert.equal(textField('  hello  ', BIO_MAX), 'hello');
  assert.equal(textField('y'.repeat(BIO_MAX + 50), BIO_MAX).length, BIO_MAX);
  assert.equal(textField('n'.repeat(DISPLAY_NAME_MAX + 50), DISPLAY_NAME_MAX).length, DISPLAY_NAME_MAX);
});
