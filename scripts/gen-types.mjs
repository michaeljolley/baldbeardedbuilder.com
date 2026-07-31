/*
  Regenerates src/lib/supabase/database.types.ts from the live project schema.

  Run it after every migration. The generated file is committed so that a build, a CI run
  or a fresh clone never needs a Supabase login, and so that a schema change shows up as a
  reviewable diff rather than as a type error somebody discovers at runtime.

  Needs a logged in Supabase CLI: npx supabase login

  The project ref is not hard coded any more, and that is deliberate. v2 is moving to a
  brand new project. The old ref, bvyerlczpakdlfvybkev, still serves the live site and
  bbb.dev, and it is scheduled to have the v2 schema removed from it entirely. A hard
  coded ref here would keep pointing at it, and the failure would be quiet: types
  regenerate cleanly, every v2 table disappears from them, and the first sign of trouble
  is a wall of type errors that look like somebody deleted the schema.

  So it comes from the environment and there is no default.
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src', 'lib', 'supabase', 'database.types.ts');

const projectId = process.env.SUPABASE_PROJECT_REF;

if (!projectId) {
  console.error('types: set SUPABASE_PROJECT_REF to the v2 project ref first.');
  console.error('types: it is not defaulted, because the old ref still serves the live site.');
  process.exit(1);
}

if (projectId === 'bvyerlczpakdlfvybkev') {
  console.error('types: that is the legacy project, which v2 no longer uses.');
  console.error('types: see the header of supabase/migrations/20260101000000_baseline.sql.');
  process.exit(1);
}

const header = `/*
  GENERATED FILE. Do not edit by hand.

  Source of truth is the live Supabase schema, which is itself the product of everything
  in supabase/migrations. Regenerate with:

    pnpm types

  If the diff surprises you, somebody changed the schema in Studio instead of writing a
  migration, and that change will vanish the next time the project is rebuilt.
*/

`;

const raw = execSync(
  `npx -y supabase@latest gen types typescript --project-id ${projectId} --schema public`,
  { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] }
);

if (!raw.includes('export type Database')) {
  throw new Error('Supabase returned no Database type. Are you logged in?');
}

fs.writeFileSync(out, header + raw.replace(/\r\n/g, '\n').trimStart());

const tables = [...raw.matchAll(/^      (\w+): \{$/gm)].length;
console.log(`types: wrote ${path.relative(root, out)} (${(raw.length / 1024).toFixed(1)} KB, ~${tables} relations)`);
