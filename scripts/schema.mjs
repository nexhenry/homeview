// HomeView's option schema (schema/options.json): lookups, a validator, and the writers for the docs
// (Markdown tables, examples/full.yaml). Used by scripts/gen-docs.mjs and test/schema.test.mjs.
// No dependencies; Node 18+.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
export const SCHEMA_FILE = join(ROOT, 'schema', 'options.json');
export const loadSchema = (file = SCHEMA_FILE) => JSON.parse(readFileSync(file, 'utf8'));

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
/** A row the docs show: not a TODO (a branch not merged yet), not an alias. */
export const shown = (n) => !n.todo && !n.alias_of;
export const tokens = (n) => String(n.type || 'any').split('|').map((t) => t.trim()).filter(Boolean);

/** The node for a list's items (a ref resolved to schema.defs). */
export function itemOf(schema, node) {
  const it = node?.item;
  if (!it) return null;
  if (it.ref) {
    const d = schema.defs?.[it.ref];
    if (!d) throw new Error(`schema: unknown ref "${it.ref}"`);
    return { ...d, ref: it.ref };
  }
  return it;
}
/** A key of an object node; an alias resolves to the key it stands for. */
export function keyOf(node, name) {
  const k = (node?.keys || []).find((x) => x.name === name);
  return k?.alias_of ? keyOf(node, k.alias_of) : k || null;
}
export const option = (schema, name) => schema.options.find((o) => o.name === name) || null;
/** The node that holds an object's keys: its own keys, or a def's (keys_ref: show_when → condition). */
export function keysNode(schema, node) {
  if (node?.keys) return node;
  if (node?.keys_ref) {
    const d = schema.defs?.[node.keys_ref];
    if (!d) throw new Error(`schema: unknown keys_ref "${node.keys_ref}"`);
    return d;
  }
  return null;
}

/**
 * A node by path: `home`, `home.chips[]` (a list's item), `rooms.<>` (a map's entry),
 * `def:section`, `energy.outage`, `warnings[]`.
 */
export function nodeAt(schema, path) {
  const segs = path.split('.');
  let node = null;
  segs.forEach((seg, i) => {
    const list = seg.endsWith('[]');
    const name = list ? seg.slice(0, -2) : seg;
    if (i === 0) node = name.startsWith('def:') ? schema.defs?.[name.slice(4)] : option(schema, name);
    else if (name === '<>') node = node?.entry || null;
    else if (name) node = keyOf(node, name);
    if (node && list) node = itemOf(schema, node);
    if (!node) throw new Error(`schema: no node at "${path}" (stopped at "${seg}")`);
  });
  return node;
}

/** Every row the docs show under a node: [{ path, node }] (the node first, then its keys …). */
/** The later of two versions ("unreleased" is the latest). */
export function laterVersion(a, b) {
  if (!a) return b; if (!b) return a;
  if (a === 'unreleased' || b === 'unreleased') return 'unreleased';
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i] ? a : b;
  return a;
}
/** Every row the docs show under a node: [{ path, node, since }] (the node first, then its keys …). A
 *  key's since is never older than its option's (warnings: came after the alert rules it shares). */
export function rowsFor(schema, node, path, { expandOwnTables = false, refs = true, floor = null } = {}) {
  const since = laterVersion(node.since, floor);
  const o = { expandOwnTables, refs, floor: since };
  const out = [{ path, node, since }];
  for (const k of (node.keys || []).filter(shown)) out.push(...rowsFor(schema, k, `${path}.${k.name}`, o));
  if (node.entry?.keys) for (const k of node.entry.keys.filter(shown)) out.push(...rowsFor(schema, k, `${path}.${node.entry.name}.${k.name}`, o));
  const it = itemOf(schema, node);
  if (it?.keys && (!it.own_table || expandOwnTables) && (refs || !it.ref)) {
    for (const k of it.keys.filter(shown)) out.push(...rowsFor(schema, k, `${path}[].${k.name}`, o));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Validation: what a config report would tell an admin (unknown keys at any depth, wrong kinds)
// ---------------------------------------------------------------------------------------------
const STRINGISH = ['string', 'entity', 'area', 'page', 'color', 'size', 'time', 'icon', 'action', 'any'];
const ENTITY_RE = /^[a-z_]+\.[a-z0-9_]+$/;

/** Problems in a whole strategy config: [{ path, problem }]. */
export function validateConfig(schema, config) {
  const out = [];
  for (const [k, v] of Object.entries(config || {})) {
    const node = option(schema, k);
    if (!node) out.push({ path: k, problem: 'unknown option' });
    else if (node.todo) out.push({ path: k, problem: 'not in this version' });
    else validate(schema, node, v, k, out);
  }
  return out;
}

/** Problems in one value against its node (pushed onto out). */
export function validate(schema, node, value, path, out = []) {
  if (node.alias_of || node.internal) return out;
  const toks = tokens(node);
  const has = (t) => toks.includes(t);
  const say = (problem) => out.push({ path, problem });
  if (typeof value === 'string' && value.startsWith('$')) return out;   // a page file's vars: filled in later
  if (value === null) { if (!has('null') && !has('any')) say('null is not allowed here'); return out; }
  if (has('any')) return out;
  if (typeof value === 'boolean') {
    if (!has('boolean') && !has(String(value))) say(`${value} is not allowed here (${node.type})`);
    return out;
  }
  if (typeof value === 'number') {
    if (!has('number') && !has('color') && !has('size')) say(`a number is not allowed here (${node.type})`);
    return out;
  }
  if (typeof value === 'string') {
    const kinds = toks.filter((t) => STRINGISH.includes(t));
    if (!kinds.length && !(node.values || []).includes(value)) { say(`text is not allowed here (${node.type})`); return out; }
    // a closed list of words: only `string` among the kinds, and values given
    if (node.values && kinds.length && kinds.every((t) => t === 'string') && !node.values.includes(value)) {
      say(`"${value}" is not one of ${node.values.join(', ')}`);
    }
    if (kinds.length && kinds.every((t) => t === 'entity') && !ENTITY_RE.test(value)) say(`"${value}" is not an entity id`);
    return out;
  }
  if (Array.isArray(value)) {
    const lists = toks.filter((t) => t.endsWith('[]') || t === 'list');
    if (!lists.length) { say(`a list is not allowed here (${node.type})`); return out; }
    const item = itemOf(schema, node);
    const scalarOk = lists.some((t) => t === 'list' || !['object[]'].includes(t));
    value.forEach((el, i) => {
      const p = `${path}[${i}]`;
      if (isObj(el)) {
        if (item) validateObject(schema, item, el, p, out);
        else if (!lists.includes('object[]') && !lists.includes('list')) out.push({ path: p, problem: 'an object is not allowed here' });
      } else if (Array.isArray(el)) {
        if (!lists.includes('list')) out.push({ path: p, problem: 'a list is not allowed here' });
      } else if (!scalarOk) out.push({ path: p, problem: 'expected an object' });
      else if (lists.length === 1 && lists[0] === 'entity[]' && typeof el === 'string' && !el.startsWith('$') && !ENTITY_RE.test(el)) {
        out.push({ path: p, problem: `"${el}" is not an entity id` });
      }
    });
    return out;
  }
  if (isObj(value)) {
    if (has('map') && node.entry) {
      for (const [k, v] of Object.entries(value)) validate(schema, node.entry, v, `${path}.${k}`, out);
      return out;
    }
    if (has('object') || has('action')) {
      const kn = keysNode(schema, node);
      if (kn) validateObject(schema, kn, value, path, out);
      return out;
    }
    if (has('map')) return out;   // a map without a known entry shape
    say(`an object is not allowed here (${node.type})`);
  }
  return out;
}
function validateObject(schema, node, value, path, out) {
  if (!node.keys) return out;
  for (const [k, v] of Object.entries(value)) {
    const child = keyOf(node, k);
    if (!child) out.push({ path: `${path}.${k}`, problem: 'unknown key' });
    else if (child.todo) out.push({ path: `${path}.${k}`, problem: 'not in this version' });
    else validate(schema, child, v, `${path}.${k}`, out);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// YAML (no dependencies): values the way a person writes them
// ---------------------------------------------------------------------------------------------
const PLAIN_BAD = /^[\s\-?:,[\]{}#&*!|>'"%@`]|\s$|: | #|^$/;
const YAML_WORDS = /^(true|false|yes|no|on|off|null|~|y|n)$/i;
const NUM_LIKE = /^[-+]?(\d[\d_]*(\.\d*)?|\.\d+)([eE][-+]?\d+)?$|^\d+(:\d+)+$|^0x[0-9a-f]+$|^0o?[0-7]+$|^[-+]?\.(inf|nan)$/i;
export function yScalar(v, inFlow = false) {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  const quote = PLAIN_BAD.test(s) || YAML_WORDS.test(s) || NUM_LIKE.test(s) || /\n/.test(s) || (inFlow && /[,[\]{}]/.test(s));
  return quote ? `'${s.replace(/'/g, "''")}'` : s;
}
// a key as written: HomeView reads a bare on: / off: (YAML 1.1 makes them true / false) like 'on' / 'off'
const yKey = (k) => (PLAIN_BAD.test(k) || NUM_LIKE.test(k) || /[,[\]{}]/.test(k) ? yScalar(k, true) : k);
export function yFlow(v) {
  if (Array.isArray(v)) return `[${v.map(yFlow).join(', ')}]`;
  if (isObj(v)) {
    const e = Object.entries(v);
    return e.length ? `{ ${e.map(([k, x]) => `${yKey(k)}: ${yFlow(x)}`).join(', ')} }` : '{}';
  }
  return yScalar(v, true);
}

const WIDTH = 110, COL = 34;
const mdPlain = (s) => String(s || '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/`([^`]*)`/g, '$1');
function wrap(text, width) {
  // { … } and [ … ] stay on one line
  const words = text.replace(/\{[^{}]*\}|\[[^[\]]*\]/g, (m) => m.replace(/ /g, '\u0000')).split(/\s+/).filter(Boolean)
    .map((w) => w.replace(/\u0000/g, ' '));
  const lines = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > width) { lines.push(cur); cur = w; } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}
/** The comment for a node: its description and its default. */
export function commentText(node, value) {
  const d = mdPlain(node.description).replace(/\.$/, '');
  const same = value !== undefined && node.default !== undefined && yFlow(value) === yFlow(node.default);
  const def = node.required ? 'required' : same ? '' : node.default !== undefined ? `default: ${yFlow(node.default)}`
    : node.auto ? `default: ${mdPlain(node.auto)}` : '';
  return [d, def && `(${def})`].filter(Boolean).join(' ');
}
/** A code line with its comment: beside it when there's room, else above it. */
function line(out, code, comment) {
  if (!comment) { out.push(code); return; }
  const indent = code.match(/^\s*/)[0];
  if (code.length > 48) {
    for (const l of wrap(comment, WIDTH - indent.length - 2)) out.push(`${indent}# ${l}`);
    out.push(code);
    return;
  }
  const col = code.length < COL - 1 ? COL : code.length + 3;
  const lines = wrap(comment, WIDTH - col - 2);
  out.push(`${code.padEnd(col)}# ${lines[0]}`);
  for (const l of lines.slice(1)) out.push(`${' '.repeat(col)}# ${l}`);
}

/** The example of a node, or (an object with keys and no example of its own) its keys' examples. */
const composed = (node) => node.example === undefined && !!node.keys;

export function fullYaml(schema, { header = [] } = {}) {
  const seen = new Set();
  const once = (n) => { if (!n || seen.has(n)) return false; seen.add(n); return true; };
  const out = [...header, 'strategy:'];
  const childOf = (node, k) => {
    const c = keyOf(node, k);
    if (c) return c;
    if (node.entry) return node.entry;
    throw new Error(`schema example: "${k}" isn't a key of ${node.name || node.title}`);
  };
  const alts = (node, key, pre) => {
    for (const a of node.alt || []) line(out, `${pre}# ${key}: ${yFlow(a.example)}`, a.note ? mdPlain(a.note) : '');
  };
  const allSeen = (node, v) => Object.keys(v).every((k) => { try { return seen.has(childOf(node, k)); } catch (e) { return false; } });

  function emit(node, key, value, indent, inComposed = false) {
    const pre = ' '.repeat(indent);
    if (node.todo || node.alias_of) return;
    if (composed(node) && value === undefined) {
      const kids = node.keys.filter(shown).filter((k) => k.example !== undefined || k.alt || composed(k));
      if (!kids.length) { alts(node, key, pre); return; }
      line(out, `${pre}${key}:`, once(node) ? commentText(node) : '');
      for (const k of kids) emit(k, k.name, k.example, indent + 2, true);
      alts(node, key, pre);
      return;
    }
    if (value === undefined) { if (inComposed || node.alt) alts(node, key, pre); return; }
    const comment = once(node) ? commentText(node, value) : '';
    if (isObj(value) && Object.keys(value).length && (node.keys || node.entry)) {
      const flow = `${pre}${key}: ${yFlow(value)}`;
      if (allSeen(node, value) && flow.length <= WIDTH) line(out, flow, comment);
      else {
        line(out, `${pre}${key}:`, comment);
        for (const [k, v] of Object.entries(value)) emit(childOf(node, k), k, v, indent + 2);
      }
    } else if (Array.isArray(value) && value.some((x) => isObj(x))) {
      line(out, `${pre}${key}:`, comment);
      const item = itemOf(schema, node);
      for (const el of value) emitItem(item, el, indent + 2);
    } else if (Array.isArray(value)) {
      const flow = `${pre}${key}: ${yFlow(value)}`;
      if (flow.length <= WIDTH) line(out, flow, comment);
      else { line(out, `${pre}${key}:`, comment); for (const el of value) out.push(`${pre}  - ${yFlow(el)}`); }
    } else line(out, `${pre}${key}: ${isObj(value) ? yFlow(value) : yScalar(value)}`, comment);
    alts(node, key, pre);
  }
  function emitItem(item, el, indent) {
    const pre = ' '.repeat(indent);
    if (!isObj(el)) { out.push(`${pre}- ${yFlow(el)}`); return; }
    const flow = `${pre}- ${yFlow(el)}`;
    if (!item?.keys || (allSeen(item, el) && flow.length <= WIDTH)) { out.push(flow); return; }
    const start = out.length;
    for (const [k, v] of Object.entries(el)) emit(childOf(item, k), k, v, indent + 2);
    // the first key goes on the "- " line (after any comment lines written above it)
    let i = start;
    for (; out[i].trimStart().startsWith('#'); i++) out[i] = `${pre}${out[i].slice(indent + 2)}`;   // comments above: at the "-"
    out[i] = `${pre}- ${out[i].slice(indent + 2)}`;
  }

  for (const g of schema.groups) {
    const opts = schema.options.filter((o) => o.group === g.id && shown(o));
    if (!opts.length) continue;
    out.push('', `  # ${g.title}`);
    for (const o of opts) emit(o, o.name, o.example, 2);
  }
  return `${out.join('\n')}\n`;
}

// ---------------------------------------------------------------------------------------------
// Markdown tables
// ---------------------------------------------------------------------------------------------
// a table cell: pipes escaped; < and > outside `code` as entities (else "<name>" reads as an HTML tag)
const cell = (s) => String(s ?? '').replace(/\n/g, ' ').split(/(`[^`]*`)/)
  .map((part, i) => (i % 2 ? part : part.replace(/</g, '&lt;').replace(/>/g, '&gt;'))).join('').replace(/\|/g, '\\|');
const code = (s) => `\`${String(s).replace(/`/g, "'")}\``;
export const sinceText = (s) => (s === 'unreleased' ? 'next' : s || '');

export function typeText(schema, node) {
  const words = [];
  for (const t of tokens(node)) {
    if (['true', 'false', 'null'].includes(t)) { words.push(code(t)); continue; }
    if (t === 'string' && node.values) { words.push(...node.values.map(code)); continue; }
    if (t.endsWith('[]') || t === 'list') {
      const it = itemOf(schema, node);
      const what = it?.ref ? { section: 'sections', tile: 'tiles', page: 'pages', alert: 'rules', condition: 'conditions', filter: 'ids, globs or filters' }[it.ref] || 'items' : null;
      words.push(what ? `list of ${what}` : t === 'list' ? 'list' : `${t.slice(0, -2)} list`);
      continue;
    }
    if (t === 'object' && node.keys_ref) { words.push({ condition: 'condition', filter: 'filter', confirm: '{ text, only, action }', tile: 'tile keys' }[node.keys_ref] || 'object'); continue; }
    words.push(t);
  }
  if (!tokens(node).includes('string') && node.values) words.push(...node.values.map(code));
  return [...new Set(words)].join(', ');
}
export function defaultText(node) {
  if (node.required) return 'required';
  if (node.default !== undefined) return code(yFlow(node.default));
  return node.auto ? node.auto : '—';
}
/** One table: rows [{ path, node }]; withFor adds the "Tiles" column (tile keys). */
export function table(schema, rows, { first = 'Option', withFor = false } = {}) {
  const head = withFor ? [first, 'Tiles', 'Type', 'Default', 'Since', 'What it does'] : [first, 'Type', 'Default', 'Since', 'What it does'];
  const lines = [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`];
  for (const { path, node, since } of rows) {
    const c = [code(path)];
    if (withFor) c.push(cell(node.for || 'any'));
    c.push(cell(typeText(schema, node)), cell(defaultText(node)), sinceText(since ?? node.since), cell(node.description));
    lines.push(`| ${c.join(' | ')} |`);
  }
  return lines.join('\n');
}

/** README.md's generated block: a table per group. */
export function optionsMarkdown(schema) {
  const parts = [];
  for (const g of schema.groups) {
    const opts = schema.options.filter((o) => o.group === g.id && shown(o));
    if (!opts.length) continue;
    const rows = opts.flatMap((o) => rowsFor(schema, o, o.name));
    parts.push(`### ${g.title}`, '', table(schema, rows), '');
  }
  return parts.join('\n').trimEnd();
}
/** custom_pages/README.md's generated block: page, section, tile and rule keys. */
export function pageKeysMarkdown(schema) {
  const parts = [];
  for (const [id, def] of Object.entries(schema.defs)) {
    const rows = def.keys.filter(shown).flatMap((k) => rowsFor(schema, k, k.name, { refs: false }));   // each def has its own table
    parts.push(`### ${def.title}`, '', table(schema, rows, { first: 'Key', withFor: id === 'tile' }), '');
  }
  return parts.join('\n').trimEnd();
}

/** Replace the text between `<!-- BEGIN GENERATED name … -->` and `<!-- END GENERATED name -->`. */
export function replaceBlock(text, name, body, file = 'file') {
  const block = new RegExp(`(<!-- BEGIN GENERATED ${name}\\b[^>]*-->)[\\s\\S]*?(<!-- END GENERATED ${name} -->)`);
  if (!block.test(text)) throw new Error(`${file}: no "<!-- BEGIN GENERATED ${name} … -->" … "<!-- END GENERATED ${name} -->" block`);
  return text.replace(block, (all, a, b) => `${a}\n\n${body}\n\n${b}`);
}

/** TODO rows and notes: what still has to be filled in after a merge. */
export function todos(schema) {
  const out = [];
  const walk = (node, path) => {
    if (node.todo) out.push(`${path}: ${node.todo}`);
    if (node.todo_note) out.push(`${path} (note): ${node.todo_note}`);
    for (const k of node.keys || []) walk(k, `${path}.${k.name}`);
    if (node.entry) walk(node.entry, `${path}.${node.entry.name}`);
    if (node.item && !node.item.ref) walk(node.item, `${path}[]`);
  };
  for (const o of schema.options) walk(o, o.name);
  for (const [id, d] of Object.entries(schema.defs)) for (const k of d.keys) walk(k, `def:${id}.${k.name}`);
  return out;
}
