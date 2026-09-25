/** Legend — colours, shapes and line styles. Collapsible. */
import { CATEGORIES, EDGE_TYPES, EDGE_GROUPS } from '../data/meta.js';
import { useLang } from '../i18n/LanguageContext.jsx';
import LineSample from './LineSample.jsx';

export default function Legend({ open, setOpen }) {
  const { t, categoryLabel, edgeLabel, edgeGroupLabel } = useLang();
  return (
    <div className={`panel legend ${open ? 'is-open' : ''}`}>
      <button className="legend__toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        {t('legend')} <span aria-hidden="true">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="legend__body">
          <div className="legend__col">
            <h4>{t('nodesLegend')}</h4>
            <ul>
              {Object.entries(CATEGORIES).map(([id, c]) => (
                <li key={id}>
                  <span className={`swatch ${c.shape === 'diamond' ? 'swatch--diamond' : ''}`} style={{ '--c': `var(--cat-${id})` }} />
                  {categoryLabel(id)}
                </li>
              ))}
            </ul>
            <ul className="legend__notes">
              <li><span className="swatch swatch--ring" /> {t('collectiveGroup')}</li>
              <li><span className="swatch swatch--dashed" /> {t('disputedRegional')}</li>
              <li><span className="swatch swatch--sizes" /> {t('sizeConnections')}</li>
            </ul>
          </div>
          <div className="legend__col">
            {Object.entries(EDGE_GROUPS).map(([gid, g]) => (
              <div key={gid}>
                <h4>{edgeGroupLabel(gid)}</h4>
                <ul>
                  {Object.keys(EDGE_TYPES).filter((ty) => EDGE_TYPES[ty].group === gid).map((ty) => (
                    <li key={ty}><LineSample type={ty} /> {edgeLabel(ty)}</li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="legend__hint">{t('arrowHint')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
