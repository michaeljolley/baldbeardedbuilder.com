import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const homepage = fs.readFileSync(path.join(root, 'src', 'pages', 'index.astro'), 'utf8');
const archive = path.join(root, 'src', 'pages', 'all.astro');

test('homepage catalogue links open the complete archive', () => {
  assert.match(homepage, /href="\/all\/">All &rarr;<\/a>/);
  assert.match(homepage, /href="\/all\/">Everything I've made &rarr;<\/a>/);
  assert.ok(fs.existsSync(archive), 'the homepage links to /all/, but that archive page is missing');
});
