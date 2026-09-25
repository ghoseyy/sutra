#!/usr/bin/env node
/**
 * Dataset validator.
 *
 *   node scripts/validate-data.mjs                     → validate every section + cross-checks
 *   node scripts/validate-data.mjs path/to/section.json → validate one section file
 *
 * Exits with code 1 when errors are found (warnings don't fail).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, ERAS, EDGE_TYPES } from '../src/data/meta.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(fs.readFileSync(path.join(root, 'src/data/registry.json'), 'utf8'));
const regById = new Map(registry.entries.map((e) => [e.id, e]));
const eraIds = new Set(ERAS.map((e) => e.id));
const SYMMETRIC = new Set(Object.entries(EDGE_TYPES).filter(([, t]) => !t.directed).map(([k]) => k));

const errors = [];
const warnings = [];
const err = (f, m) => errors.push(`${f}: ${m}`);
const warn = (f, m) => warnings.push(`${f}: ${m}`);

const wordCount = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const isStrArr = (a) => Array.isArray(a) && a.every((x) => typeof x === 'string');

function validateSection(file, knownIds) {
  const short = path.basename(file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    err(short, `invalid JSON — ${e.message}`);
    return null;
  }
  if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    err(short, 'must contain "nodes" and "edges" arrays');
    return null;
  }
  const sectionId = data.section || short.replace(/\.json$/, '');
  const ids = new Set();

  for (const n of data.nodes) {
    const f = `${short} › ${n.id ?? '(no id)'}`;
    if (!n.id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(n.id)) err(f, 'id missing or not kebab-case');
    if (ids.has(n.id)) err(f, 'duplicate id in section');
    ids.add(n.id);
    const reg = regById.get(n.id);
    if (!reg) warn(f, 'not in registry.json (new node? add it to scripts/registry.txt)');
    else if (reg.chunk !== sectionId) warn(f, `registry assigns it to ${reg.chunk}`);
    for (const k of ['name', 'devanagari', 'description', 'story']) {
      if (typeof n[k] !== 'string' || !n[k].trim()) err(f, `"${k}" missing`);
    }
    if (!CATEGORIES[n.category]) err(f, `unknown category "${n.category}"`);
    if (!eraIds.has(n.era)) err(f, `unknown era "${n.era}"`);
    for (const k of ['aliases', 'symbols', 'weapons', 'sources', 'variations']) {
      if (!isStrArr(n[k])) err(f, `"${k}" must be an array of strings`);
    }
    if (!n.sources?.length) err(f, 'needs at least one source');
    if (n.vahana !== null && typeof n.vahana !== 'string') err(f, '"vahana" must be string or null');
    if (n.abode !== null && typeof n.abode !== 'string') err(f, '"abode" must be string or null');
    const wc = wordCount(n.story);
    if (wc < 70 || wc > 170) warn(f, `story is ${wc} words (target 80–150)`);
    if (n.devanagari && !/[ऀ-ॿ]/.test(n.devanagari)) err(f, 'devanagari contains no Devanagari characters');
  }

  data.edges.forEach((e, i) => {
    const f = `${short} › edge[${i}] ${e.source}→${e.target}`;
    if (!EDGE_TYPES[e.type]) err(f, `unknown type "${e.type}"`);
    if (!e.label || typeof e.label !== 'string') err(f, 'label missing');
    for (const end of ['source', 'target']) {
      if (!knownIds.has(e[end]) && !ids.has(e[end])) err(f, `${end} "${e[end]}" is not a known id`);
    }
    if (e.source === e.target) err(f, 'self-loop');
    if (!ids.has(e.source) && !ids.has(e.target)) warn(f, 'neither endpoint belongs to this section');
    if (e.type === 'participated-in' && regById.get(e.target)?.category !== 'event') {
      err(f, 'participated-in must target an event node');
    }
  });
  return { file: short, data, ids };
}

const regIds = new Set(regById.keys());
const arg = process.argv[2];

if (arg) {
  const res = validateSection(path.resolve(arg), regIds);
  if (res) {
    const deg = new Map();
    for (const e of res.data.edges) {
      deg.set(e.source, (deg.get(e.source) || 0) + 1);
      deg.set(e.target, (deg.get(e.target) || 0) + 1);
    }
    for (const id of res.ids) if ((deg.get(id) || 0) < 2) warn(res.file, `${id} has fewer than 2 edges in this section`);
    const expected = registry.entries.filter((e) => e.chunk === res.data.section).map((e) => e.id);
    const missing = expected.filter((id) => !res.ids.has(id));
    if (missing.length) err(res.file, `registry ids missing from section: ${missing.join(', ')}`);
    console.log(`${res.file}: ${res.data.nodes.length} nodes, ${res.data.edges.length} edges`);
  }
} else {
  const dir = path.join(root, 'src/data/sections');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  // First pass collects every id so cross-section edges resolve.
  const allIds = new Set(regIds);
  for (const f of files) {
    try {
      JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).nodes?.forEach((n) => allIds.add(n.id));
    } catch { /* reported below */ }
  }
  const results = files.map((f) => validateSection(path.join(dir, f), allIds)).filter(Boolean);

  const owner = new Map();
  for (const r of results) for (const id of r.ids) {
    if (owner.has(id)) err('global', `"${id}" defined in both ${owner.get(id)} and ${r.file}`);
    owner.set(id, r.file);
  }
  const missing = [...regIds].filter((id) => !owner.has(id));
  if (missing.length) warn('global', `${missing.length} registry ids have no node yet: ${missing.slice(0, 40).join(', ')}${missing.length > 40 ? '…' : ''}`);

  const edges = results.flatMap((r) => r.data.edges);
  for (const e of edges) {
    if (!owner.has(e.source) || !owner.has(e.target)) err('global', `dangling edge ${e.source}→${e.target} (${e.type})`);
  }
  // Contradictions: a directed edge that also exists reversed.
  const key = (e) => `${e.source}|${e.target}|${e.type}`;
  const keys = new Set(edges.map(key));
  for (const e of edges) {
    if (!SYMMETRIC.has(e.type) && ['parent', 'avatar-of', 'form-of', 'guru', 'vahana', 'ancestor-of'].includes(e.type)
      && keys.has(`${e.target}|${e.source}|${e.type}`) && e.source < e.target) {
      warn('global', `contradictory ${e.type} edges between ${e.source} and ${e.target}`);
    }
  }
  const unique = new Set(edges.map((e) => SYMMETRIC.has(e.type)
    ? `${[e.source, e.target].sort().join('|')}|${e.type}` : key(e)));
  console.log(`${results.length} sections · ${owner.size} nodes · ${edges.length} edges (${unique.size} unique)`);
}

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.slice(0, 200).forEach((w) => console.log('  ⚠ ' + w));
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  errors.forEach((e) => console.log('  ✖ ' + e));
  process.exit(1);
}
console.log('\n✔ no errors');
