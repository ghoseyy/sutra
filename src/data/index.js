/**
 * data/index.js — loads and merges every section file in ./sections.
 *
 * To extend the dataset, add nodes/edges to a section JSON (or drop a new
 * NN-name.json file in ./sections). Nothing else needs to change: this module
 * picks files up automatically via Vite's import.meta.glob.
 */
import { EDGE_TYPES, ERA_INDEX } from './meta.js';

const modules = import.meta.glob('./sections/*.json', { eager: true, import: 'default' });

const nodeById = new Map();
const rawEdges = [];

// Sort by filename so merges are deterministic (01-…, 02-…, …).
for (const file of Object.keys(modules).sort()) {
  const section = modules[file];
  for (const n of section.nodes || []) {
    if (nodeById.has(n.id)) {
      console.warn(`[data] duplicate node "${n.id}" in ${file} — keeping the first definition`);
      continue;
    }
    nodeById.set(n.id, { ...n, section: section.section });
  }
  for (const e of section.edges || []) rawEdges.push({ ...e, section: section.section });
}

/* ---------- Edges: validate endpoints, drop duplicates ---------- */
const seen = new Map();
export const links = [];
for (const e of rawEdges) {
  const t = EDGE_TYPES[e.type];
  if (!t || !nodeById.has(e.source) || !nodeById.has(e.target) || e.source === e.target) {
    if (import.meta.env.DEV) console.warn('[data] skipping invalid edge', e);
    continue;
  }
  // Symmetric relationships are the same regardless of direction.
  const key = t.directed
    ? `${e.source}|${e.target}|${e.type}`
    : `${[e.source, e.target].sort().join('|')}|${e.type}`;
  if (seen.has(key)) {
    // Keep the first label but record extra variation notes from other sections.
    const kept = seen.get(key);
    if (e.variation && !kept.variation) kept.variation = e.variation;
    continue;
  }
  const link = {
    id: `e${links.length}`,
    source: e.source,
    target: e.target,
    type: e.type,
    label: e.label,
    disputed: !!e.disputed,
    variation: e.variation || null,
  };
  seen.set(key, link);
  links.push(link);
}

/* ---------- Adjacency + importance ---------- */
// adjacency: id → [{ link, other, dir: 'out' | 'in' }]
export const adjacency = new Map([...nodeById.keys()].map((id) => [id, []]));
for (const l of links) {
  adjacency.get(l.source).push({ link: l, other: l.target, dir: 'out' });
  adjacency.get(l.target).push({ link: l, other: l.source, dir: 'in' });
}

export const nodes = [...nodeById.values()].map((n) => {
  const degree = adjacency.get(n.id).length;
  n.degree = degree;
  n.eraIndex = ERA_INDEX[n.era] ?? 0;
  // Radius grows with the square root of degree so hubs stand out
  // without swallowing the canvas.
  n.radius = n.category === 'event' ? 4 + Math.sqrt(degree) * 1.1 : 2.6 + Math.sqrt(degree) * 1.35;
  return n;
});

export { nodeById };

/* ---------- Search index ---------- */
export const searchIndex = nodes.map((n) => ({
  id: n.id,
  haystack: [n.name, n.devanagari, ...(n.aliases || [])].join(' | ').toLowerCase(),
}));

export const stats = {
  nodes: nodes.length,
  links: links.length,
};
