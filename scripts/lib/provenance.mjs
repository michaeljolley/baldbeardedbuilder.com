/*
  Reads the provenance the build stamped into dist, for gates that want to name their own
  subject in their summary line.

  Deliberately not fatal when the file is missing. A gate's job is to answer its own
  question, and refusing to run because it cannot describe itself would turn a reporting
  improvement into a new way for the suite to go red. It says so instead, which is enough:
  "provenance unknown" in a summary is itself the warning.
*/

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILE = fileURLToPath(new URL('../../dist/build-provenance.json', import.meta.url));

export function readProvenance() {
  try {
    return JSON.parse(readFileSync(FILE, 'utf8'));
  } catch {
    return null;
  }
}

/*
  The phrase every gate ends with. One wording in one place, so a reader who learns to
  check it on one gate can check it on all of them.
*/
export function provenanceSuffix() {
  const p = readProvenance();
  if (!p) return ' Built from an unstamped dist, so this run cannot say which tree it describes.';
  const tree = p.clean ? 'tree clean' : `TREE DIRTY in ${p.dirtyFiles.length} file(s): ${p.dirtyFiles.join(', ')}`;
  return ` Built from ${p.shortSha} on ${p.branch}, ${tree}.`;
}
