/**
 * SidePanel — details for the selected node: portrait, names, description,
 * legend, attributes, sources, variations and every connection (clickable).
 */
import { useMemo, useState } from 'react';
import { adjacency, nodeById } from '../data/index.js';
import { localizeNode, localizeEdgeLabel } from '../data/i18n/index.js';
import { useLang } from '../i18n/LanguageContext.jsx';
import Portrait from './Portrait.jsx';
import LineSample from './LineSample.jsx';

function Attr({ label, value }) {
  if (!value || (Array.isArray(value) && !value.length)) return null;
  return (
    <div className="attr">
      <dt>{label}</dt>
      <dd>{Array.isArray(value) ? value.join(', ') : value}</dd>
    </div>
  );
}

export default function SidePanel({ nodeId, onClose, onSelect, onFocus, onPathFrom, onOrbit, lineages, onShowLineage }) {
  const { lang, t, categoryLabel, eraLabel, edgeDirection, lineageLabel, dataVersion } = useLang();
  const enNode = nodeById.get(nodeId);
  const node = useMemo(() => localizeNode(enNode, lang), [enNode, lang, dataVersion]);
  const [connFilter, setConnFilter] = useState('');

  /* Group connections by how they read *from this node* ("Parent of", "Child of"…). */
  const groups = useMemo(() => {
    if (!enNode) return [];
    const byLabel = new Map();
    for (const { link, other, dir } of adjacency.get(enNode.id)) {
      const [outPhrase, inPhrase] = edgeDirection(link.type);
      // Symmetric relationships (enemy, ally, spouse, sibling…) read the same
      // in both directions, so both sides belong under one heading; directed
      // ones (parent, slayer…) need separate "Parent of" / "Child of" groups.
      const symmetric = outPhrase === inPhrase;
      const label = dir === 'out' ? outPhrase : inPhrase;
      const key = symmetric ? link.type : `${link.type}|${dir}`;
      if (!byLabel.has(key)) byLabel.set(key, { key, type: link.type, label, items: [] });
      const { label: localizedLabel, variation } = localizeEdgeLabel(link, lang);
      byLabel.get(key).items.push({
        link: { ...link, label: localizedLabel, variation },
        other: localizeNode(nodeById.get(other), lang),
      });
    }
    const order = ['parent', 'ancestor-of', 'spouse', 'sibling', 'enemy', 'slayer', 'curse', 'avatar-of', 'form-of',
      'reincarnation-of', 'guru', 'devotee', 'boon', 'ally', 'vahana', 'created-by', 'member-of', 'participated-in'];
    return [...byLabel.values()]
      .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))
      .map((g) => ({ ...g, items: g.items.sort((a, b) => b.other.degree - a.other.degree) }));
  }, [enNode, lang, dataVersion, edgeDirection]);

  if (!node) return null;
  const q = connFilter.trim().toLowerCase();

  return (
    <aside className="panel side-panel" aria-label={`${node.name} details`}>
      <button className="icon-btn side-panel__close" onClick={onClose} aria-label={t('close')}>×</button>

      <header className="sp-head">
        <Portrait node={node} />
        <div className="sp-titles">
          <h2>{node.name}</h2>
          <div className="sp-dev" lang="sa">{node.devanagari}</div>
          <div className="chips">
            <span className="chip" style={{ '--c': `var(--cat-${node.category})` }}>
              <span className="dot" />{categoryLabel(node.category)}
            </span>
            <span className="chip chip--muted">{eraLabel(node.era)}</span>
            {node.disputed && <span className="chip chip--warn">{t('disputedRegional')}</span>}
          </div>
        </div>
      </header>

      <div className="sp-actions">
        <button className="btn btn--small" onClick={() => onFocus(node.id)}>{t('focusInGraph')}</button>
        <button className="btn btn--small" onClick={() => onOrbit(node.id)}>{t('orbitView')}</button>
        <button className="btn btn--small" onClick={() => onPathFrom(node.id)}>{t('findPathFromHere')}</button>
        {lineages.map((l) => (
          <button key={l.id} className="btn btn--small btn--ghost" onClick={() => onShowLineage(l.id)}>
            {t('tree', { name: lineageLabel(l.id).split(' (')[0] })}
          </button>
        ))}
      </div>

      {node.aliases?.length > 0 && <p className="sp-aliases">{t('alsoKnownAs')} {node.aliases.join(' · ')}</p>}
      <p className="sp-desc">{node.description}</p>

      <section>
        <h3>{node.category === 'event' ? t('theEvent') : t('legendStory')}</h3>
        <p className="sp-story">{node.story}</p>
      </section>

      <dl className="attrs">
        <Attr label={t('symbols')} value={node.symbols} />
        <Attr label={t('weapons')} value={node.weapons} />
        <Attr label={t('vahana')} value={node.vahana} />
        <Attr label={node.category === 'event' ? t('location') : t('abode')} value={node.abode} />
      </dl>

      {node.sources?.length > 0 && (
        <section>
          <h3>{t('sources')}</h3>
          <div className="chips chips--wrap">
            {node.sources.map((s) => <span key={s} className="chip chip--src">{s}</span>)}
          </div>
        </section>
      )}

      {node.variations?.length > 0 && (
        <section>
          <h3>{t('variations')}</h3>
          <ul className="sp-variations">{node.variations.map((v) => <li key={v}>{v}</li>)}</ul>
        </section>
      )}

      <section>
        <div className="sp-conn-head">
          <h3>{t('connections')} <span className="muted">({node.degree})</span></h3>
          {node.degree > 12 && (
            <input className="mini-input" placeholder={t('filterEllipsis')} value={connFilter}
              onChange={(e) => setConnFilter(e.target.value)} />
          )}
        </div>
        {groups.map((g) => {
          const items = q ? g.items.filter((i) => i.other.name.toLowerCase().includes(q) || i.link.label.toLowerCase().includes(q)) : g.items;
          if (!items.length) return null;
          return (
            <div key={g.key} className="conn-group">
              <h4><LineSample type={g.type} width={26} /> {g.label} <span className="muted">{items.length}</span></h4>
              <ul>
                {items.map(({ link, other }) => (
                  <li key={link.id}>
                    <button className="conn" onClick={() => onSelect(other.id)}>
                      <span className="dot" style={{ '--c': `var(--cat-${other.category})` }} />
                      <span className="conn__name">{other.name}</span>
                      {link.disputed && <span className="conn__flag" title={t('disputedRegional')}>?</span>}
                    </button>
                    <div className="conn__label">
                      {link.label}
                      {link.variation && <span className="conn__var"> — {link.variation}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </aside>
  );
}
