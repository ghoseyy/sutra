/**
 * Filters — toggle node categories, relationship types and eras.
 * State lives in App; this component only renders and reports toggles.
 * Sections are collapsible <details> — only Categories starts open, since the
 * full relationship and era lists are long and most visits only need one.
 */
import { CATEGORIES, EDGE_TYPES, EDGE_GROUPS, ERAS, ERA_GROUPS } from '../data/meta.js';
import { useLang } from '../i18n/LanguageContext.jsx';
import LineSample from './LineSample.jsx';

function Section({ title, all, none, onAll, onNone, defaultOpen, children }) {
  return (
    <details className="filter-section" open={defaultOpen || undefined}>
      <summary className="filter-section__head">
        <span className="filter-section__title">{title}</span>
        <span className="filter-section__bulk" onClick={(e) => e.stopPropagation()}>
          <button onClick={onAll}>{all}</button> · <button onClick={onNone}>{none}</button>
        </span>
      </summary>
      <div className="filter-section__body">{children}</div>
    </details>
  );
}

export default function Filters({ filters, setFilters, counts, onClose }) {
  const { t, categoryLabel, eraLabel, eraGroupLabel, edgeLabel, edgeGroupLabel, edgeStyleLabel } = useLang();
  const toggle = (key, value) => setFilters((f) => {
    const next = new Set(f[key]);
    next.has(value) ? next.delete(value) : next.add(value);
    return { ...f, [key]: next };
  });
  const setAll = (key, values) => setFilters((f) => ({ ...f, [key]: new Set(values) }));
  const toggleMany = (key, values) => setFilters((f) => {
    const next = new Set(f[key]);
    const allOn = values.every((v) => next.has(v));
    values.forEach((v) => (allOn ? next.delete(v) : next.add(v)));
    return { ...f, [key]: next };
  });

  return (
    <div className="panel filters">
      <div className="filters__head">
        <h2>{t('filters')}</h2>
        {onClose && <button className="icon-btn" onClick={onClose} aria-label={t('close')}>×</button>}
      </div>

      <Section title={t('categories')} all={t('all')} none={t('none')} defaultOpen
        onAll={() => setAll('categories', Object.keys(CATEGORIES))} onNone={() => setAll('categories', [])}>
        <ul className="toggle-list">
          {Object.entries(CATEGORIES).map(([id, c]) => (
            <li key={id}>
              <label className="toggle">
                <input type="checkbox" checked={filters.categories.has(id)} onChange={() => toggle('categories', id)} />
                <span className={`swatch ${c.shape === 'diamond' ? 'swatch--diamond' : ''}`} style={{ '--c': `var(--cat-${id})` }} />
                <span className="toggle__label">{categoryLabel(id)}</span>
                <span className="toggle__count">{counts.categories[id] || 0}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={t('relationships')} all={t('all')} none={t('none')}
        onAll={() => setAll('edgeTypes', Object.keys(EDGE_TYPES))} onNone={() => setAll('edgeTypes', [])}>
        {Object.entries(EDGE_GROUPS).map(([gid, g]) => {
          const types = Object.keys(EDGE_TYPES).filter((ty) => EDGE_TYPES[ty].group === gid);
          return (
            <div key={gid} className="edge-group">
              <button className="edge-group__title" onClick={() => toggleMany('edgeTypes', types)}>
                {edgeGroupLabel(gid)} <span className="muted">({edgeStyleLabel(g.style)})</span>
              </button>
              <ul className="toggle-list">
                {types.map((ty) => (
                  <li key={ty}>
                    <label className="toggle">
                      <input type="checkbox" checked={filters.edgeTypes.has(ty)} onChange={() => toggle('edgeTypes', ty)} />
                      <LineSample type={ty} />
                      <span className="toggle__label">{edgeLabel(ty)}</span>
                      <span className="toggle__count">{counts.edgeTypes[ty] || 0}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Section>

      <Section title={t('eraOrigin')} all={t('all')} none={t('none')}
        onAll={() => setAll('eras', ERAS.map((e) => e.id))} onNone={() => setAll('eras', [])}>
        <div className="era-groups">
          {Object.entries(ERA_GROUPS).map(([gid]) => {
            const ids = ERAS.filter((e) => e.group === gid).map((e) => e.id);
            const on = ids.every((id) => filters.eras.has(id));
            return (
              <button key={gid} className={`pill ${on ? 'is-on' : ''}`} onClick={() => toggleMany('eras', ids)}>{eraGroupLabel(gid)}</button>
            );
          })}
        </div>
        <ul className="toggle-list">
          {ERAS.map((e) => (
            <li key={e.id}>
              <label className="toggle" title={e.texts}>
                <input type="checkbox" checked={filters.eras.has(e.id)} onChange={() => toggle('eras', e.id)} />
                <span className="toggle__label">{eraLabel(e.id)} <span className="muted">{e.dates}</span></span>
                <span className="toggle__count">{counts.eras[e.id] || 0}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <label className="toggle toggle--standalone">
        <input type="checkbox" checked={filters.hideIsolated}
          onChange={() => setFilters((f) => ({ ...f, hideIsolated: !f.hideIsolated }))} />
        <span className="toggle__label">{t('hideIsolated')}</span>
      </label>
    </div>
  );
}
