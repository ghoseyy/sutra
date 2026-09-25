/**
 * PathFinder — shortest chain of relationships between two characters,
 * with every step explained.
 */
import { nodeById } from '../data/index.js';
import { localizeNode, localizeEdgeLabel } from '../data/i18n/index.js';
import { useLang } from '../i18n/LanguageContext.jsx';
import SearchBar from './SearchBar.jsx';
import LineSample from './LineSample.jsx';

const SUGGESTIONS = [
  ['brahma', 'ravana'],
  ['surya', 'krishna'],
  ['hanuman', 'bhima'],
  ['vritra', 'arjuna'],
  ['agni', 'draupadi'],
  ['ganga', 'parashurama'],
];

export default function PathFinder({ path, setPath, onSelect, onClose }) {
  const { lang, t, edgeDirection } = useLang();
  const { from, to, result, skipEvents } = path;
  const swap = () => setPath((p) => ({ ...p, from: p.to, to: p.from }));
  const localName = (id) => localizeNode(nodeById.get(id), lang).name;

  return (
    <div className="panel path-finder">
      <div className="filters__head">
        <h2>{t('pathFinder')}</h2>
        <button className="icon-btn" onClick={onClose} aria-label={t('close')}>×</button>
      </div>
      <p className="muted small">{t('pathFinderHint')}</p>

      <div className="pf-inputs">
        <SearchBar compact placeholder={t('searchPlaceholderFrom')} value={from} onSelect={(id) => setPath((p) => ({ ...p, from: id }))} />
        <button className="icon-btn" onClick={swap} aria-label={t('swap')} title={t('swap')}>⇅</button>
        <SearchBar compact placeholder={t('searchPlaceholderTo')} value={to} onSelect={(id) => setPath((p) => ({ ...p, to: id }))} />
      </div>

      <label className="toggle toggle--standalone small">
        <input type="checkbox" checked={skipEvents} onChange={() => setPath((p) => ({ ...p, skipEvents: !p.skipEvents }))} />
        <span className="toggle__label">{t('dontRouteEvents')}</span>
      </label>
      <label className="toggle toggle--standalone small">
        <input type="checkbox" checked={path.respectFilters} onChange={() => setPath((p) => ({ ...p, respectFilters: !p.respectFilters }))} />
        <span className="toggle__label">{t('onlyVisibleTypes')}</span>
      </label>

      {!from || !to ? (
        <div className="pf-suggest">
          <span className="muted small">{t('tryLabel')}</span>
          {SUGGESTIONS.filter(([a, b]) => nodeById.has(a) && nodeById.has(b)).map(([a, b]) => (
            <button key={a + b} className="pill" onClick={() => setPath((p) => ({ ...p, from: a, to: b }))}>
              {localName(a)} → {localName(b)}
            </button>
          ))}
        </div>
      ) : result === null ? (
        <p className="pf-empty">{t('noConnectionFound')}</p>
      ) : (
        <>
          <p className="pf-summary">
            {t(result.length === 1 ? 'stepsBetween' : 'stepsBetween_plural', { count: result.length, from: localName(from), to: localName(to) })}
          </p>
          <ol className="pf-steps">
            <li className="pf-node"><button onClick={() => onSelect(from)}>
              <span className="dot" style={{ '--c': `var(--cat-${nodeById.get(from).category})` }} />{localName(from)}
            </button></li>
            {result.map((s) => {
              const other = nodeById.get(s.to);
              const [outPhrase, inPhrase] = edgeDirection(s.link.type);
              const verb = s.dir === 'out' ? outPhrase : inPhrase;
              const { label } = localizeEdgeLabel(s.link, lang);
              return [
                <li key={s.link.id + 'e'} className="pf-edge">
                  <LineSample type={s.link.type} width={22} />
                  <span><em>{verb}</em> — {label}</span>
                </li>,
                <li key={s.link.id + 'n'} className="pf-node"><button onClick={() => onSelect(s.to)}>
                  <span className="dot" style={{ '--c': `var(--cat-${other.category})` }} />{localName(s.to)}
                </button></li>,
              ];
            })}
          </ol>
          <button className="btn btn--small btn--ghost" onClick={() => setPath((p) => ({ ...p, from: null, to: null }))}>{t('clearPath')}</button>
        </>
      )}
    </div>
  );
}
