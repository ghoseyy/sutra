/**
 * SearchBar — autocomplete over names, Devanagari names and aliases.
 * Used in the header (jump to a character) and in the PathFinder.
 */
import { useMemo, useRef, useState, useId } from 'react';
import { nodes, nodeById } from '../data/index.js';
import { localizeNode } from '../data/i18n/index.js';
import { useLang } from '../i18n/LanguageContext.jsx';

/** Localized nodes + a lowercase haystack (name, English name, devanagari, aliases). */
function useLocalizedIndex(lang, dataVersion) {
  return useMemo(() => nodes.map((n) => {
    const loc = localizeNode(n, lang);
    const haystack = [loc.name, n.name, loc.devanagari, ...(loc.aliases || [])].join(' | ').toLowerCase();
    return { n: loc, haystack };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dataVersion only forces a recompute
  }), [lang, dataVersion]);
}

function rank(index, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const { n, haystack } of index) {
    const name = n.name.toLowerCase();
    let score = -1;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.split(/[\s(]+/).some((w) => w.startsWith(q))) score = 60;
    else if (haystack.includes(q)) score = 40;
    if (score >= 0) out.push({ n, score: score + Math.min(n.degree, 40) / 10 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8).map((r) => r.n);
}

export default function SearchBar({ placeholder, onSelect, value, compact }) {
  const { lang, t, categoryLabel, dataVersion } = useLang();
  const index = useLocalizedIndex(lang, dataVersion);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listId = useId();
  const results = useMemo(() => rank(index, query), [index, query]);

  const choose = (n) => {
    onSelect(n.id);
    setQuery(value !== undefined ? n.name : '');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => (c + 1) % results.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => (c - 1 + results.length) % results.length); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[cursor]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  // Controlled display (PathFinder shows the chosen name in the field).
  const shown = open || value === undefined ? query : (value ? localizeNode(nodeById.get(value), lang)?.name ?? '' : query);

  return (
    <div className={`search ${compact ? 'search--compact' : ''}`}>
      <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={shown}
        placeholder={placeholder ?? t('searchPlaceholder', { count: nodes.length })}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(0); }}
        onFocus={() => { setOpen(true); if (value !== undefined) setQuery(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />
      {open && results.length > 0 && (
        <ul className="search__list" id={listId} role="listbox">
          {results.map((n, i) => (
            <li
              key={n.id}
              role="option"
              aria-selected={i === cursor}
              className={i === cursor ? 'is-active' : ''}
              onMouseDown={(e) => { e.preventDefault(); choose(n); }}
              onMouseEnter={() => setCursor(i)}
            >
              <span className="dot" style={{ '--c': `var(--cat-${n.category})` }} />
              <span className="search__name">{n.name}</span>
              <span className="search__dev">{n.devanagari}</span>
              <span className="search__cat">{categoryLabel(n.category)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
