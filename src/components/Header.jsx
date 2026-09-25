/** Header — title, search, view switcher, lineage picker, language and theme toggle. */
import SearchBar from './SearchBar.jsx';
import { LINEAGES } from '../data/meta.js';
import { useLang } from '../i18n/LanguageContext.jsx';

export default function Header({
  view, setView, lineageId, setLineageId, theme, setTheme,
  onSearch, onToggleFilters, onTogglePath, pathOpen, stats,
}) {
  const { t, lang, setLang, languages, lineageLabel, dataLoading } = useLang();
  const VIEWS = [
    { id: 'network', label: t('viewNetwork') },
    { id: 'family', label: t('viewFamily') },
    { id: 'avatar', label: t('viewAvatar') },
  ];

  return (
    <header className="app-header">
      <div className="brand">
        <svg className="brand__mark" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="1.2" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <ellipse key={i} cx="20" cy="9" rx="3.2" ry="8" fill="none" stroke="currentColor" strokeWidth="1"
              transform={`rotate(${i * 45} 20 20)`} />
          ))}
          <circle cx="20" cy="20" r="3" fill="currentColor" />
        </svg>
        <h1>{t('appTitle')}{lang === 'en' && <span className="brand__dev" lang="sa"> सूत्र</span>}</h1>
      </div>

      {/* On mobile this sits on the brand's own row (far right); on desktop
          it stays with the rest of the controls, further right still. */}
      <div className="header-meta">
        {languages.length > 1 && (
          <span className={`lang-select ${dataLoading ? 'is-loading' : ''}`}>
            <select className="select select--lang" value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('language')}>
              {languages.map((l) => <option key={l.id} value={l.id}>{l.native}</option>)}
            </select>
            {dataLoading && <span className="lang-select__spinner" aria-hidden="true" />}
          </span>
        )}
        <button className="icon-btn theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={theme === 'dark' ? t('lightMode') : t('darkMode')} title={theme === 'dark' ? t('lightMode') : t('darkMode')}>
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>

      <nav className="header-views" aria-label={t('viewsGroup')}>
        <div className="segmented" role="tablist">
          {VIEWS.map((v) => (
            <button key={v.id} role="tab" aria-selected={view === v.id}
              className={view === v.id ? 'is-active' : ''} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
        {view === 'family' && (
          <select className="select" value={lineageId} onChange={(e) => setLineageId(e.target.value)} aria-label={t('lineageSelect')}>
            {LINEAGES.map((l) => <option key={l.id} value={l.id}>{lineageLabel(l.id)}</option>)}
          </select>
        )}
        <button className={`icon-btn ${pathOpen ? 'is-active' : ''}`} onClick={onTogglePath}
          aria-label={t('pathFinder')} title={t('pathFinder')}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <circle cx="5" cy="6" r="2.4" fill="currentColor" />
            <circle cx="19" cy="18" r="2.4" fill="currentColor" />
            <path d="M7 7.5C9 11 15 13 17 16.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.4 2.4" strokeLinecap="round" />
          </svg>
        </button>
        <button className="icon-btn filters-btn" onClick={onToggleFilters} aria-label={t('filters')} title={t('filters')}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="9" cy="6" r="2" fill="var(--panel-solid)" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="16" cy="12" r="2" fill="var(--panel-solid)" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="10" cy="18" r="2" fill="var(--panel-solid)" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </nav>

      <div className="header-search">
        <SearchBar onSelect={onSearch} placeholder={t('searchPlaceholder', { count: stats.nodes })} />
      </div>
    </header>
  );
}
