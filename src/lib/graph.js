/**
 * graph.js — pure graph algorithms (no React):
 *   shortestPath      BFS path finder over the undirected relationship graph
 *   computeLineage    which nodes belong to a family-tree view
 *   layoutFamilyTree  layered (generational) layout for the family-tree view
 *   layoutAvatars     radial layout around Vishnu / Shiva / the Devi
 */
import { EDGE_TYPES } from '../data/meta.js';

/* ------------------------------------------------------------------ */
/* Path finder                                                         */
/* ------------------------------------------------------------------ */
/**
 * Breadth-first search, treating every relationship as traversable in both
 * directions. Returns an array of steps [{ from, to, link, dir }] or null.
 *
 * @param {Map} adjacency   id → [{ link, other, dir }]
 * @param {(link) => boolean} [allowLink]  optional predicate (for filters)
 * @param {(id) => boolean}   [allowNode]
 * @param {boolean} [skipEvents]  don't route *through* event nodes (they
 *        connect nearly everyone and make paths trivial)
 */
export function shortestPath(adjacency, from, to, { allowLink, allowNode, skipEvents, nodeById } = {}) {
  if (!adjacency.has(from) || !adjacency.has(to)) return null;
  if (from === to) return [];
  const prev = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur !== from && skipEvents && nodeById?.get(cur)?.category === 'event') continue;
    for (const step of adjacency.get(cur)) {
      const nxt = step.other;
      if (prev.has(nxt)) continue;
      if (allowLink && !allowLink(step.link)) continue;
      if (allowNode && !allowNode(nxt)) continue;
      prev.set(nxt, { from: cur, link: step.link, dir: step.dir });
      if (nxt === to) return unwind(prev, to);
      queue.push(nxt);
    }
  }
  return null;
}

function unwind(prev, to) {
  const steps = [];
  let cur = to;
  while (prev.get(cur)) {
    const p = prev.get(cur);
    steps.unshift({ from: p.from, to: cur, link: p.link, dir: p.dir });
    cur = p.from;
  }
  return steps;
}

/* ------------------------------------------------------------------ */
/* Lineages                                                            */
/* ------------------------------------------------------------------ */
const DESCENT = new Set(['parent', 'ancestor-of']);

/**
 * members = descendants of roots (≤ maxDepth generations, via parent /
 * ancestor-of edges) + their spouses + the other parents of each descendant.
 */
export function computeLineage(lineage, adjacency) {
  const { roots, maxDepth = 6, stopAt = [], withSpouseParents = false } = lineage;
  const stop = new Set(stopAt);
  const descendants = new Set();
  let frontier = roots.filter((r) => adjacency.has(r));
  frontier.forEach((r) => descendants.add(r));

  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next = [];
    for (const id of frontier) {
      if (stop.has(id) && !roots.includes(id)) continue;
      for (const { link, other, dir } of adjacency.get(id)) {
        if (dir === 'out' && DESCENT.has(link.type) && !descendants.has(other)) {
          descendants.add(other);
          next.push(other);
        }
      }
    }
    frontier = next;
  }

  const members = new Set(descendants);
  for (const id of descendants) {
    for (const { link, other, dir } of adjacency.get(id)) {
      if (link.type === 'spouse') {
        members.add(other);
        if (withSpouseParents) {
          for (const s of adjacency.get(other)) {
            if (s.dir === 'in' && s.link.type === 'parent') members.add(s.other);
          }
        }
      }
      // co-parents of descendants (e.g. Vyasa for Dhritarashtra, Surya for Karna)
      if (dir === 'in' && link.type === 'parent' && !roots.includes(id)) members.add(other);
    }
  }
  return members;
}

/* ------------------------------------------------------------------ */
/* Family-tree layout                                                  */
/* ------------------------------------------------------------------ */
/**
 * Layered layout: generation = longest parent chain from a root; spouses share
 * a row; rows are ordered by DFS, then refined with barycentre sweeps so
 * children sit under their parents. Returns Map id → { x, y }.
 */
export function layoutFamilyTree(memberIds, links, { dx = 150, dy = 130 } = {}) {
  const M = new Set(memberIds);
  const descent = links.filter((l) => DESCENT.has(l.type) && M.has(l.source) && M.has(l.target));
  const spouses = links.filter((l) => l.type === 'spouse' && M.has(l.source) && M.has(l.target));

  const parentsOf = new Map([...M].map((id) => [id, []]));
  const childrenOf = new Map([...M].map((id) => [id, []]));
  const spousesOf = new Map([...M].map((id) => [id, []]));
  for (const l of descent) {
    parentsOf.get(l.target).push(l.source);
    childrenOf.get(l.source).push(l.target);
  }
  for (const l of spouses) {
    spousesOf.get(l.source).push(l.target);
    spousesOf.get(l.target).push(l.source);
  }

  // 1. generations (iterate to a fixed point; capped in case of bad data)
  const gen = new Map([...M].map((id) => [id, 0]));
  for (let iter = 0; iter < 60; iter++) {
    let changed = false;
    for (const l of descent) {
      const want = Math.min(gen.get(l.source) + 1, 60);
      if (gen.get(l.target) < want) { gen.set(l.target, want); changed = true; }
    }
    for (const l of spouses) {
      // Only pull a spouse down when they have no parents in the tree,
      // otherwise marriages across generations would distort the rows.
      const a = l.source, b = l.target;
      const ga = gen.get(a), gb = gen.get(b);
      if (ga === gb) continue;
      const [lo, hi] = ga < gb ? [a, b] : [b, a];
      if (parentsOf.get(lo).length === 0) { gen.set(lo, gen.get(hi)); changed = true; }
    }
    // A parent with no ancestors in the tree (a divine father, a sage by
    // niyoga) sits just above their eldest child rather than in the top row.
    for (const id of M) {
      const kids = childrenOf.get(id);
      if (parentsOf.get(id).length || !kids.length) continue;
      const want = Math.min(...kids.map((c) => gen.get(c))) - 1;
      if (gen.get(id) < want) { gen.set(id, want); changed = true; }
    }
    if (!changed) break;
  }
  // compress empty generations
  const levels = [...new Set(gen.values())].sort((a, b) => a - b);
  const rank = new Map(levels.map((g, i) => [g, i]));
  for (const [id, g] of gen) gen.set(id, rank.get(g));

  // 2. initial order: DFS from roots, spouses placed next to each other
  const order = [];
  const visited = new Set();
  const roots = [...M].filter((id) => parentsOf.get(id).length === 0)
    .sort((a, b) => childrenOf.get(b).length - childrenOf.get(a).length);
  const visit = (id) => {
    if (visited.has(id)) return;
    visited.add(id);
    order.push(id);
    for (const s of spousesOf.get(id)) {
      if (!visited.has(s) && gen.get(s) === gen.get(id) && parentsOf.get(s).length === 0) {
        visited.add(s);
        order.push(s);
      }
    }
    for (const c of childrenOf.get(id)) visit(c);
  };
  roots.forEach(visit);
  [...M].forEach(visit);

  const rows = [];
  for (const id of order) {
    const g = gen.get(id);
    (rows[g] ||= []).push(id);
  }
  const x = new Map();
  rows.forEach((row) => row.forEach((id, i) => x.set(id, (i - (row.length - 1) / 2) * dx)));

  // Place a row so each cluster (spouse group) sits as close as possible to
  // its desired x, without overlapping neighbours.
  const placeRow = (row, desired) => {
    const clusters = [];
    const inCluster = new Set();
    for (const id of row) {
      if (inCluster.has(id)) continue;
      const cl = [id];
      inCluster.add(id);
      for (const s of spousesOf.get(id)) {
        if (!inCluster.has(s) && row.includes(s)) { cl.push(s); inCluster.add(s); }
      }
      const key = cl.reduce((acc, m) => acc + desired(m), 0) / cl.length;
      clusters.push({ members: cl, key });
    }
    clusters.sort((a, b) => a.key - b.key);
    let cursor = -Infinity;
    const placed = [];
    for (const cl of clusters) {
      const width = (cl.members.length - 1) * dx;
      const start = Math.max(cl.key - width / 2, cursor + dx);
      cl.members.forEach((m, i) => x.set(m, start + i * dx));
      cursor = start + width;
      placed.push(...cl.members);
    }
    // re-centre the row around the mean desired position
    const shift = placed.reduce((a, m) => a + desired(m) - x.get(m), 0) / (placed.length || 1);
    placed.forEach((m) => x.set(m, x.get(m) + shift));
    row.splice(0, row.length, ...placed);
  };

  const mean = (ids, fallback) => (ids.length ? ids.reduce((a, p) => a + x.get(p), 0) / ids.length : fallback);
  for (let sweep = 0; sweep < 4; sweep++) {
    for (let g = 1; g < rows.length; g++) {
      if (rows[g]) placeRow(rows[g], (id) => mean(parentsOf.get(id), x.get(id)));
    }
    for (let g = rows.length - 2; g >= 0; g--) {
      if (rows[g]) placeRow(rows[g], (id) => mean(childrenOf.get(id), x.get(id)));
    }
  }
  if (rows[rows.length - 1]) {
    const last = rows.length - 1;
    placeRow(rows[last], (id) => mean(parentsOf.get(id), x.get(id)));
  }

  const pos = new Map();
  for (const id of M) pos.set(id, { x: x.get(id) ?? 0, y: gen.get(id) * dy });
  return pos;
}

/* ------------------------------------------------------------------ */
/* Avatar view                                                         */
/* ------------------------------------------------------------------ */
const IDENTITY = new Set(['avatar-of', 'form-of']);

/**
 * Radial layout: each hub in the centre of its own "flower"; avatars and
 * forms on the first ring, forms-of-forms on outer rings near their parent.
 * Returns { positions: Map id → {x,y}, hubOf: Map id → hub }.
 */
export function layoutAvatars(hubs, adjacency, { maxDepth = 3 } = {}) {
  const centres = {
    [hubs[0]]: { x: -520, y: -180 },
    [hubs[1]]: { x: 520, y: -180 },
    [hubs[2]]: { x: 0, y: 560 },
  };
  const positions = new Map();
  const hubOf = new Map();
  const tree = new Map(); // id → children ids
  hubs.forEach((h) => { hubOf.set(h, h); positions.set(h, centres[h]); tree.set(h, []); });

  // BFS level by level across all hubs so a node joins the nearest hub.
  let frontier = hubs.filter((h) => adjacency.has(h));
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next = [];
    for (const id of frontier) {
      for (const { link, other, dir } of adjacency.get(id)) {
        if (dir !== 'in' || !IDENTITY.has(link.type) || hubOf.has(other)) continue;
        hubOf.set(other, hubOf.get(id));
        tree.get(id).push(other);
        tree.set(other, []);
        next.push(other);
      }
    }
    frontier = next;
  }

  // Assign angles: each subtree gets an arc proportional to its leaf count.
  const leaves = (id) => {
    const kids = tree.get(id) || [];
    return kids.length ? kids.reduce((a, k) => a + leaves(k), 0) : 1;
  };
  const place = (id, a0, a1, depth, centre) => {
    const kids = tree.get(id) || [];
    const total = kids.reduce((a, k) => a + leaves(k), 0);
    let a = a0;
    for (const k of kids) {
      const span = ((a1 - a0) * leaves(k)) / total;
      const mid = a + span / 2;
      const r = 150 + depth * 130 + (depth === 0 ? Math.max(0, kids.length - 12) * 6 : 0);
      positions.set(k, { x: centre.x + Math.cos(mid) * r, y: centre.y + Math.sin(mid) * r });
      place(k, a, a + span, depth + 1, centre);
      a += span;
    }
  };
  hubs.forEach((h) => place(h, -Math.PI, Math.PI, 0, centres[h]));
  return { positions, hubOf };
}
