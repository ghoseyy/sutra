/**
 * Timeline — reveals nodes in the order of their first textual appearance,
 * from the Rig Veda to the late Puranas. Play animates through the eras.
 */
import { useEffect } from 'react';
import { ERAS } from '../data/meta.js';
import { useLang } from '../i18n/LanguageContext.jsx';

export default function Timeline({ timeline, setTimeline, revealedCount }) {
  const { t, eraLabel, eraShortLabel } = useLang();
  const { enabled, value, playing } = timeline;
  const era = ERAS[value];

  // Advance one era every 2.2 s while playing; stop at the end.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      setTimeline((s) => (s.value >= ERAS.length - 1
        ? { ...s, playing: false }
        : { ...s, value: s.value + 1 }));
    }, 2200);
    return () => clearTimeout(timer);
  }, [playing, value, setTimeline]);

  const play = () => setTimeline((s) => ({
    enabled: true,
    playing: !s.playing,
    value: !s.playing && s.value >= ERAS.length - 1 ? 0 : s.value,
  }));

  return (
    <div className={`panel timeline ${enabled ? 'is-on' : ''}`}>
      <label className="switch" title={t('timeline')}>
        <input type="checkbox" checked={enabled}
          onChange={() => setTimeline((s) => ({ ...s, enabled: !s.enabled, playing: false }))} />
        <span className="switch__track"><span className="switch__thumb" /></span>
        <span className="switch__label">{t('timeline')}</span>
      </label>

      <button className="icon-btn timeline__play" onClick={play} aria-label={playing ? t('pause') : t('play')} title={playing ? t('pause') : t('play')}>
        {playing ? '❚❚' : '▶'}
      </button>

      <div className="timeline__track">
        <input
          type="range" min="0" max={ERAS.length - 1} step="1" value={value}
          disabled={!enabled && !playing}
          onChange={(e) => setTimeline((s) => ({ ...s, enabled: true, value: Number(e.target.value), playing: false }))}
          aria-label={t('timeline')}
          aria-valuetext={eraLabel(era.id)}
          style={{ '--pct': `${(value / (ERAS.length - 1)) * 100}%` }}
        />
        <div className="timeline__ticks" aria-hidden="true">
          {ERAS.map((e, i) => (
            <button key={e.id} className={i <= value && enabled ? 'is-past' : ''}
              onClick={() => setTimeline((s) => ({ ...s, enabled: true, value: i, playing: false }))}
              title={`${eraLabel(e.id)} (${e.dates})`}>
              <span>{eraShortLabel(e.id)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="timeline__info">
        {enabled ? (
          <>
            <strong>{eraLabel(era.id)}</strong>
            <span className="muted">{era.dates}</span>
            <span className="timeline__count">{t('revealed', { count: revealedCount })}</span>
          </>
        ) : (
          <span className="muted">{t('timelineHint')}</span>
        )}
      </div>
    </div>
  );
}
