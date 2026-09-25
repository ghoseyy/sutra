/** Zoom in / out / reset buttons floating over the graph. */
import { useLang } from '../i18n/LanguageContext.jsx';

export default function ZoomControls({ fgRef, onReset }) {
  const { t } = useLang();
  const zoomBy = (f) => {
    const fg = fgRef.current;
    if (fg) fg.zoom(fg.zoom() * f, 300);
  };
  return (
    <div className="zoom-controls panel" role="group" aria-label={t('zoomGroup')}>
      <button className="icon-btn" onClick={() => zoomBy(1.5)} aria-label={t('zoomIn')}>+</button>
      <button className="icon-btn" onClick={() => zoomBy(1 / 1.5)} aria-label={t('zoomOut')}>−</button>
      <button className="icon-btn" onClick={onReset} aria-label={t('resetView')} title={t('resetView')}>
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
