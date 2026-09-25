/**
 * LanguageContext — current UI language (en/ne/hi), persisted to localStorage.
 * useLang() gives components { lang, setLang, t, label helpers }.
 *
 * Switching language is instant for interface copy (strings.js is a small,
 * always-bundled static import), but a language's character content (names,
 * stories, relationship labels) loads lazily as its own chunk the first time
 * it's selected — see data/i18n/index.js. `dataVersion` bumps once that
 * chunk resolves, so components that memoize on it (see App.jsx) recompute
 * with the translated text instead of the English fallback they showed
 * while it loaded.
 */
import { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  t as translate, LANGUAGES, CATEGORY_LABELS, ERA_LABELS, ERA_SHORT_LABELS,
  ERA_GROUP_LABELS, EDGE_LABELS, EDGE_DIRECTION_LABELS, EDGE_GROUP_LABELS, EDGE_STYLE_LABELS, LINEAGE_LABELS,
} from './strings.js';
import { AVAILABLE_LANGS, ensureLanguageLoaded, isLanguageLoaded } from '../data/i18n/index.js';

const Ctx = createContext(null);

function readStored() {
  try {
    const v = localStorage.getItem('sutra-lang');
    return AVAILABLE_LANGS.includes(v) ? v : null;
  } catch { return null; }
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => readStored() || 'en');
  const [dataVersion, setDataVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem('sutra-lang', lang); } catch { /* storage unavailable */ }

    if (isLanguageLoaded(lang)) return;
    const id = ++requestId.current;
    setLoading(true);
    ensureLanguageLoaded(lang).then(() => {
      if (requestId.current !== id) return; // a newer language switch superseded this one
      setLoading(false);
      setDataVersion((v) => v + 1);
    });
  }, [lang]);

  const setLang = useCallback((l) => setLangState(AVAILABLE_LANGS.includes(l) ? l : 'en'), []);

  const value = useMemo(() => ({
    lang,
    setLang,
    languages: LANGUAGES.filter((l) => AVAILABLE_LANGS.includes(l.id)),
    dataVersion,   // include in deps of anything memoized on translated content
    dataLoading: loading,
    t: (key, vars) => translate(lang, key, vars),
    categoryLabel: (id) => CATEGORY_LABELS[id]?.[lang] ?? CATEGORY_LABELS[id]?.en ?? id,
    eraLabel: (id) => ERA_LABELS[id]?.[lang] ?? ERA_LABELS[id]?.en ?? id,
    eraShortLabel: (id) => ERA_SHORT_LABELS[id]?.[lang] ?? ERA_SHORT_LABELS[id]?.en ?? id,
    eraGroupLabel: (id) => ERA_GROUP_LABELS[id]?.[lang] ?? ERA_GROUP_LABELS[id]?.en ?? id,
    edgeLabel: (type) => EDGE_LABELS[type]?.[lang] ?? EDGE_LABELS[type]?.en ?? type,
    edgeGroupLabel: (id) => EDGE_GROUP_LABELS[id]?.[lang] ?? EDGE_GROUP_LABELS[id]?.en ?? id,
    edgeStyleLabel: (id) => EDGE_STYLE_LABELS[id]?.[lang] ?? EDGE_STYLE_LABELS[id]?.en ?? id,
    /** [outPhrase, inPhrase] — e.g. ["Slew", "Slain by"] */
    edgeDirection: (type) => EDGE_DIRECTION_LABELS[type]?.[lang] ?? EDGE_DIRECTION_LABELS[type]?.en ?? [type, type],
    lineageLabel: (id) => LINEAGE_LABELS[id]?.[lang] ?? LINEAGE_LABELS[id]?.en ?? id,
  }), [lang, setLang, dataVersion, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
}
