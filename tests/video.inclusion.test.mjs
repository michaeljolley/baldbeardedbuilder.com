import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync(
  'supabase/migrations/20260808000000_video_page_inclusion.sql',
  'utf8'
);
const pages = fs.readFileSync('src/lib/video-pages.ts', 'utf8');
const content = fs.readFileSync('src/lib/content.ts', 'utf8');

test('video inclusion defaults on and remains author-controlled', () => {
  assert.match(migration, /included boolean not null default true/i);
  assert.match(pages, /\.select\('video_id, included, summary, published_at'\)/);
});

test('an explicitly excluded video never enters the shared item catalogue', () => {
  assert.match(content, /if \(page\?\.included === false\) continue;/);
});
