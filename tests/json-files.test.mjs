import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJsonFile, writeJsonFileAtomic } from '../scripts/lib/json-files.mjs';

function withTempDir(run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'json-files-'));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('readJsonFile returns the fallback for a missing file', () => {
  withTempDir((dir) => {
    const fallback = { entries: {} };
    assert.equal(readJsonFile(path.join(dir, 'missing.json'), { fallback }), fallback);
  });
});

test('readJsonFile can recover from an empty generated file', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'generated.json');
    const fallback = { entries: {} };
    fs.writeFileSync(file, '');

    assert.equal(readJsonFile(file, { fallback, allowEmpty: true }), fallback);
  });
});

test('readJsonFile rejects empty or malformed hand-edited files with context', () => {
  withTempDir((dir) => {
    const empty = path.join(dir, 'empty.json');
    const malformed = path.join(dir, 'malformed.json');
    fs.writeFileSync(empty, '');
    fs.writeFileSync(malformed, '{"overrides":');

    assert.throws(() => readJsonFile(empty), /empty\.json: the file is empty/);
    assert.throws(() => readJsonFile(malformed), /malformed\.json: Unexpected end of JSON input/);
  });
});

test('writeJsonFileAtomic replaces JSON without leaving a temporary file', () => {
  withTempDir((dir) => {
    const file = path.join(dir, 'generated.json');
    fs.writeFileSync(file, '{"old":true}\n');

    writeJsonFileAtomic(file, { entries: { one: true } });

    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { entries: { one: true } });
    assert.deepEqual(fs.readdirSync(dir), ['generated.json']);
  });
});
