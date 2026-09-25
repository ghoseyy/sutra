/** Small SVG swatch showing an edge type's colour, dash pattern and arrow. */
import { EDGE_TYPES } from '../data/meta.js';

export default function LineSample({ type, width = 34 }) {
  const t = EDGE_TYPES[type];
  // canvas dash units are tiny at zoom 1; scale them up so they read in the UI
  const dash = t.dash.length ? t.dash.map((d) => d * 1.6).join(' ') : undefined;
  return (
    <svg width={width} height="10" viewBox={`0 0 ${width} 10`} aria-hidden="true" className="line-sample">
      <line x1="1" y1="5" x2={t.directed ? width - 6 : width - 1} y2="5"
        stroke={t.color} strokeWidth={Math.max(1.4, t.width * 1.3)} strokeDasharray={dash} strokeLinecap="round" />
      {t.directed && <path d={`M${width - 7} 1.5 L${width - 1} 5 L${width - 7} 8.5 Z`} fill={t.color} />}
    </svg>
  );
}
