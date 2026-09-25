#!/usr/bin/env node
/**
 * Checks translation files against the English skeletons.
 *   node scripts/validate-i18n.mjs              → every language / section
 *   node scripts/validate-i18n.mjs ne 05-avatars → one file
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'src/data/i18n');
const LANGS = ['ne', 'hi'];
const DEVA = /[ऀ-ॿ]/;
const errors = [];
const warnings = [];

function check(lang, file) {
  const tag = `${lang}/${file}`;
  const src = JSON.parse(fs.readFileSync(path.join(base, '_src', file), 'utf8'));
  const p = path.join(base, lang, file);
  if (!fs.existsSync(p)) { warnings.push(`${tag}: missing (English will be shown)`); return; }
  let tr;
  try { tr = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { errors.push(`${tag}: invalid JSON — ${e.message}`); return; }
  let nodeCount = 0, edgeCount = 0;
  for (const [id, en] of Object.entries(src.nodes)) {
    const t = tr.nodes?.[id];
    if (!t) { errors.push(`${tag}: node ${id} missing`); continue; }
    nodeCount++;
    for (const k of ['name', 'description', 'story']) {
      if (typeof t[k] !== 'string' || !DEVA.test(t[k])) errors.push(`${tag}: ${id}.${k} missing or not in Devanagari`);
    }
    for (const k of ['aliases', 'symbols', 'weapons', 'sources', 'variations']) {
      if (Array.isArray(en[k]) && en[k].length && (!Array.isArray(t[k]) || t[k].length !== en[k].length)) {
        warnings.push(`${tag}: ${id}.${k} has ${t[k]?.length ?? 0} items, English has ${en[k].length}`);
      }
    }
    for (const k of ['vahana', 'abode']) if (en[k] && !t[k]) warnings.push(`${tag}: ${id}.${k} untranslated`);
  }
  for (const [key, en] of Object.entries(src.edges)) {
    const t = tr.edges?.[key];
    if (!t || typeof t.label !== 'string' || !DEVA.test(t.label)) { errors.push(`${tag}: edge ${key} missing label`); continue; }
    if (en.variation && !t.variation) warnings.push(`${tag}: edge ${key} variation untranslated`);
    edgeCount++;
  }
  const extra = Object.keys(tr.nodes || {}).filter((id) => !src.nodes[id]);
  if (extra.length) warnings.push(`${tag}: unknown node ids ${extra.join(', ')}`);
  console.log(`${tag}: ${nodeCount}/${Object.keys(src.nodes).length} nodes, ${edgeCount}/${Object.keys(src.edges).length} edges`);
}

const [lang, section] = process.argv.slice(2);
const files = fs.readdirSync(path.join(base, '_src')).filter((f) => f.endsWith('.json')).sort();
if (lang) check(lang, section.endsWith('.json') ? section : `${section}.json`);
else for (const l of LANGS) for (const f of files) check(l, f);

if (warnings.length) { console.log(`\n${warnings.length} warning(s):`); warnings.slice(0, 80).forEach((w) => console.log('  ⚠ ' + w)); }
if (errors.length) { console.log(`\n${errors.length} error(s):`); errors.slice(0, 120).forEach((e) => console.log('  ✖ ' + e)); process.exit(1); }
console.log('\n✔ no errors');
