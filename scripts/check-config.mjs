// Checks a HomeView config against schema/options.json: unknown or misspelt keys at any depth, values
// of the wrong kind, words that aren't one of an option's words. Reads JSON: the strategy itself,
// { strategy: … }, or a storage dashboard's file (.storage/lovelace.<dashboard>: data.config.strategy).
//   node scripts/check-config.mjs <file.json>        (- = stdin)
// Exit 0 = nothing found, 1 = problems listed. Nothing is changed.
import { readFileSync } from 'node:fs';
import { loadSchema, validateConfig, isObj } from './schema.mjs';

const file = process.argv[2];
if (!file) { console.error('usage: node scripts/check-config.mjs <config.json | .storage/lovelace.<dashboard> | ->'); process.exit(2); }
const raw = JSON.parse(readFileSync(file === '-' ? 0 : file, 'utf8'));
const strat = raw?.data?.config?.strategy ?? raw?.strategy ?? raw;
if (!isObj(strat)) { console.error('check-config: no strategy config in that file'); process.exit(2); }
const issues = validateConfig(loadSchema(), strat);
for (const i of issues) console.log(`${i.path}: ${i.problem}`);
console.log(issues.length ? `check-config: ${issues.length} problem(s)` : 'check-config: no problems');
process.exit(issues.length ? 1 : 0);
