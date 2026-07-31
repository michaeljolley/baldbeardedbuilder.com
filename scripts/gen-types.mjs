/*
  Regenerates src/lib/supabase/database.types.ts from the live project schema.

  Run it after every migration. The generated file is committed so that a build, a CI run
  or a fresh clone never needs a Supabase login, and so that a schema change shows up as a
  reviewable diff rather than as a type error somebody discovers at runtime.

  Needs a logged in Supabase CLI: npx supabase login
*/
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src', 'lib', 'supabase', 'database.types.ts');
const projectId = 'bvyerlczpakdlfvybkev';

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
