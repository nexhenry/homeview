// Privacy gate for this public repository: fails when tracked text (and, with --notes, a release's
// notes) holds something that identifies a real home:
//   - a private network address (10.x, 192.168.x, 172.16–31.x) or a remote-access host name;
//   - an access token (Home Assistant long-lived token, GitHub token);
//   - an e-mail address (other than noreply@ / example addresses);
//   - a word from a private deny-list: the maintainer's family names, the home's name, its domain,
//     its entity ids … The list is never in this repository. It comes from the environment
//     (HOMEVIEW_DENYLIST: one word or regular expression per line; a CI secret) and/or a file
//     (HOMEVIEW_DENYLIST_FILE). Words match whole words, case-insensitively; lines starting with
//     re: are regular expressions; # starts a comment.
// A match prints as file:line and the rule — never the private word itself (CI logs are public).
//   node scripts/privacy-check.mjs [--notes notes.md] [files …]      (no files: every tracked text file)
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const extra = [];
let files = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--notes') extra.push(args[++i]);
  else files.push(args[i]);
}
const BINARY = /\.(png|jpe?g|gif|webp|ico|gz|zip|woff2?|ttf|otf|pdf)$/i;
if (!files.length) {
  try {
    files = execFileSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
  } catch (e) {   // no git (a container): every file under the repository but .git
    const walk = (d) => readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      if (n === '.git' || n === 'node_modules') return [];
      return statSync(p).isDirectory() ? walk(p) : [relative(root, p)];
    });
    files = walk(root);
  }
}
files = [...files.filter((f) => !BINARY.test(f)).map((f) => ({ name: f, path: join(root, f) })), ...extra.map((f) => ({ name: f, path: f }))];

// generic rules: never a real home's details in a public repository
const RULES = [
  ['a private network address', /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/],
  ['a remote-access host name', /\b[a-z0-9-]+\.(?:duckdns\.org|ui\.nabu\.casa)\b/i],
  ['an access token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/],
  ['an e-mail address', /\b[A-Za-z0-9._%+-]+@(?!(?:users\.)?noreply\.|example\.(?:com|org)\b)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[a-z]{2,}\b/i],
];
// the private deny-list
const deny = [];
const addList = (text) => {
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      deny.push(line.startsWith('re:') ? new RegExp(line.slice(3), 'i') : new RegExp(`(?<![\\p{L}\\p{N}_])${esc(line)}(?![\\p{L}\\p{N}_])`, 'iu'));
    } catch (e) { console.error(`privacy-check: deny-list entry #${deny.length + 1} isn't a valid pattern`); process.exit(2); }
  }
};
addList(process.env.HOMEVIEW_DENYLIST);
if (process.env.HOMEVIEW_DENYLIST_FILE) {
  if (!existsSync(process.env.HOMEVIEW_DENYLIST_FILE)) { console.error('privacy-check: HOMEVIEW_DENYLIST_FILE not found'); process.exit(2); }
  addList(readFileSync(process.env.HOMEVIEW_DENYLIST_FILE, 'utf8'));
}

let hits = 0;
for (const f of files) {
  let text;
  try { text = readFileSync(f.path, 'utf8'); } catch (e) { continue; }
  text.split('\n').forEach((line, i) => {
    for (const [what, re] of RULES) if (re.test(line)) { hits++; console.log(`${f.name}:${i + 1}: ${what}`); }
    deny.forEach((re, k) => { if (re.test(line)) { hits++; console.log(`${f.name}:${i + 1}: private deny-list entry #${k + 1}`); } });
  });
}
const scope = `${files.length} file${files.length === 1 ? '' : 's'}, ${RULES.length} generic rules, ${deny.length} private entr${deny.length === 1 ? 'y' : 'ies'}`;
if (hits) {
  console.log(`privacy-check: ${hits} match${hits === 1 ? '' : 'es'} (${scope}). Remove them before committing or tagging.`);
  process.exit(1);
}
console.log(`privacy-check: clean (${scope})`);
