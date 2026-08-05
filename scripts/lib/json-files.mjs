import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

export function readJsonFile(file, { fallback, allowEmpty = false } = {}) {
  if (!fs.existsSync(file)) return fallback;

  const source = fs.readFileSync(file, 'utf8');
  if (source.trim() === '') {
    if (allowEmpty) return fallback;
    throw new SyntaxError(`Cannot parse ${file}: the file is empty`);
  }

  try {
    return JSON.parse(source);
  } catch (cause) {
    throw new SyntaxError(`Cannot parse ${file}: ${cause.message}`, { cause });
  }
}

export function writeJsonFileAtomic(file, value) {
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', {
      encoding: 'utf8',
      flag: 'wx'
    });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}
