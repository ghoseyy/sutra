/**
 * Portrait — image placeholder: a small mandala in the category colour with the
 * first Devanagari syllable at its centre. Swap for real artwork by adding an
 * `image` field to a node (URL) — it will be shown instead.
 */
import { useLang } from '../i18n/LanguageContext.jsx';

function firstGrapheme(str = '') {
  if (!str) return '?';
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const seg = new Intl.Segmenter('hi', { granularity: 'grapheme' });
    const first = seg.segment(str)[Symbol.iterator]().next().value;
    if (first) return first.segment;
  }
  return str.slice(0, 2);
}

export default function Portrait({ node }) {
  const { t, categoryLabel } = useLang();
  if (node.image) return <img className="portrait" src={node.image} alt={node.name} />;
  const petals = 16;
  const color = `var(--cat-${node.category})`;
  return (
    <svg className="portrait" viewBox="0 0 120 120" role="img" aria-label={`${node.name} ${t('placeholderArt')}`}>
      <defs>
        <radialGradient id={`g-${node.id}`} cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#g-${node.id})`} stroke={color} strokeOpacity="0.5" />
      {Array.from({ length: petals }, (_, i) => (
        <ellipse key={i} cx="60" cy="24" rx="7" ry="17" fill="none" stroke={color} strokeOpacity="0.45"
          transform={`rotate(${(360 / petals) * i} 60 60)`} />
      ))}
      <circle cx="60" cy="60" r="27" fill="var(--bg-2)" stroke={color} strokeWidth="1.5" />
      <text x="60" y="61" textAnchor="middle" dominantBaseline="central" className="portrait__glyph" fill={color}>
        {node.category === 'event' ? '◆' : firstGrapheme(node.devanagari)}
      </text>
      <title>{categoryLabel(node.category)}</title>
    </svg>
  );
}
