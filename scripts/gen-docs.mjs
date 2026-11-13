// Writes the option docs from schema/options.json (the one place the options are kept):
//   README.md               the "All options" tables (between its GENERATED options markers)
//   custom_pages/README.md  the page-file key tables (between its GENERATED page-keys markers)
//   examples/full.yaml      every option with an example value
//
//   node scripts/gen-docs.mjs                 write them
//   node scripts/gen-docs.mjs --check         exit 1 when a file isn't what the schema gives (CI, tests)
//   node scripts/gen-docs.mjs --stamp 0.8.21  at a release: "since": "unreleased" → that version, then write
//   node scripts/gen-docs.mjs --todo          list the TODO rows and notes (what a merge still has to fill in)
// scripts/gen-docs.sh runs it in Docker's node image when Node isn't installed.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, SCHEMA_FILE, loadSchema, fullYaml, optionsMarkdown, pageKeysMarkdown, replaceBlock, todos } from './schema.mjs';

const HEADER = [
  '# Every HomeView option, with an example value. All of them are optional: a dashboard needs only',
  '# `type: custom:homeview`. What each one does, its default and the version it came in: README.md →',
  '# All options (page files: custom_pages/README.md → Every key).',
  '# Generated from schema/options.json by scripts/gen-docs.mjs: change the schema, not this file.',
];

/** { relative path: the text it should have } */
export function generate(schema = loadSchema(), read = (f) => readFileSync(join(ROOT, f), 'utf8')) {
  return {
    'README.md': replaceBlock(read('README.md'), 'options', optionsMarkdown(schema), 'README.md'),
    'custom_pages/README.md': replaceBlock(read('custom_pages/README.md'), 'page-keys', pageKeysMarkdown(schema), 'custom_pages/README.md'),
    'examples/full.yaml': fullYaml(schema, { header: HEADER }),
  };
}

async function main(args) {
  if (args.includes('--todo')) {
    const t = todos(loadSchema());
    console.log(t.length ? t.join('\n') : 'no TODO rows');
    return 0;
  }
  const at = args.indexOf('--stamp');
  if (at !== -1) {
    const v = args[at + 1];
    if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('gen-docs: --stamp needs a version, e.g. --stamp 0.8.21'); return 2; }
    const text = readFileSync(SCHEMA_FILE, 'utf8');
    const n = (text.match(/"since": "unreleased"/g) || []).length;
    writeFileSync(SCHEMA_FILE, text.replace(/"since": "unreleased"/g, `"since": "${v}"`));
    console.log(`gen-docs: ${n} row(s) stamped ${v}`);
  }
  const want = generate();
  const stale = [];
  for (const [f, text] of Object.entries(want)) {
    let cur = null;
    try { cur = readFileSync(join(ROOT, f), 'utf8'); } catch (e) { /* new file */ }
    if (cur === text) continue;
    stale.push(f);
    if (!args.includes('--check')) writeFileSync(join(ROOT, f), text);
  }
  if (args.includes('--check')) {
    if (stale.length) { console.error(`gen-docs: out of date: ${stale.join(', ')} — run scripts/gen-docs.sh`); return 1; }
    console.log('gen-docs: the docs match schema/options.json');
    return 0;
  }
  console.log(stale.length ? `gen-docs: wrote ${stale.join(', ')}` : 'gen-docs: nothing to change');
  const t = todos(loadSchema());
  if (t.length) console.log(`gen-docs: ${t.length} TODO row(s)/note(s) left (not in the docs) — --todo lists them`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
