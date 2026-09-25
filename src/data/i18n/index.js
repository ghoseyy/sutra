/**
 * i18n/index.js — lazily loads translated content (Nepali / Hindi) and exposes
 * a localize() function that overlays it onto the canonical English node/edge
 * objects from data/index.js. English fields are the fallback for anything a
 * translation is missing (a section not yet translated, a late addition, or
 * simply not loaded yet).
 *
 * Translation JSON is NOT eager-imported: bundling all three languages'
 * ~2 MB of node/edge text upfront would nearly triple the app's initial
 * download for the ~85% of users who only ever read one language. Instead,
 * each language's files load as one chunk the first time it's selected
 * (see ensureLanguageLoaded), and stay cached after that.
 */
const LOADERS = {
  ne: import.meta.glob('./ne/*.json'),
  hi: import.meta.glob('./hi/*.json'),
};

// Which languages actually have any translation files — known at build time
// from the glob's keys, without loading any of them.
export const AVAILABLE_LANGS = ['en', ...Object.keys(LOADERS).filter((l) => Object.keys(LOADERS[l]).length > 0)];

function mergeSections(modules) {
  const nodes = new Map();
  const edges = new Map();
  for (const file of Object.keys(modules).sort()) {
    const s = modules[file];
    for (const [id, n] of Object.entries(s.nodes || {})) nodes.set(id, n);
    for (const [key, e] of Object.entries(s.edges || {})) edges.set(key, e);
  }
  return { nodes, edges };
}

const cache = {};       // lang → { nodes, edges } once loaded
const pending = {};     // lang → in-flight load promise

/** Loads (once) and caches a language's translation files. Resolves immediately for 'en'. */
export function ensureLanguageLoaded(lang) {
  if (lang === 'en' || cache[lang]) return Promise.resolve();
  const loaders = LOADERS[lang];
  if (!loaders) return Promise.resolve();
  if (!pending[lang]) {
    const files = Object.keys(loaders).sort();
    pending[lang] = Promise.all(files.map((f) => loaders[f]()))
      .then((mods) => {
        cache[lang] = mergeSections(Object.fromEntries(files.map((f, i) => [f, mods[i].default])));
      })
      .catch((err) => {
        console.error(`[i18n] failed to load "${lang}"`, err);
        delete pending[lang]; // allow a retry on the next call
      });
  }
  return pending[lang];
}

export function isLanguageLoaded(lang) { return lang === 'en' || !!cache[lang]; }

/** English node/edge fields that a translation may override. */
const NODE_FIELDS = ['name', 'aliases', 'description', 'story', 'symbols', 'weapons', 'vahana', 'abode', 'sources', 'variations'];

/**
 * Returns a node object for display: English fields overlaid with the
 * translation's fields where present (field by field, so a partially
 * translated node — or a language still loading — still shows English for
 * whatever isn't available yet). `devanagari` (the Sanskrit name) is never
 * overwritten — it is the same across languages and shown as a secondary
 * line in ne/hi.
 */
export function localizeNode(node, lang) {
  if (lang === 'en' || !node) return node;
  const t = cache[lang]?.nodes.get(node.id);
  if (!t) return node;
  const out = { ...node };
  for (const f of NODE_FIELDS) if (t[f] !== undefined && t[f] !== null) out[f] = t[f];
  return out;
}

export function localizeEdgeLabel(link, lang) {
  if (lang === 'en') return { label: link.label, variation: link.variation };
  const t = cache[lang]?.edges.get(`${link.source}|${link.target}|${link.type}`);
  if (!t) return { label: link.label, variation: link.variation };
  return { label: t.label ?? link.label, variation: t.variation ?? link.variation };
}

/** Coverage fraction (0–1) for a language, for a "translation in progress" hint. */
export function translationCoverage(lang, totalNodes) {
  if (lang === 'en') return 1;
  const have = cache[lang]?.nodes.size ?? 0;
  return totalNodes ? Math.min(1, have / totalNodes) : 0;
}
