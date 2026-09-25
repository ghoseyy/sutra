/**
 * meta.js — vocabulary shared by the dataset, the validator and the UI.
 *
 * Everything here is plain data (no React), so it can be imported by both
 * the Vite app and the Node validation script (scripts/validate-data.mjs).
 */

/* ------------------------------------------------------------------ */
/* Node categories                                                     */
/* ------------------------------------------------------------------ */
// `dark` / `light` are the node fill colours for each theme.
// `shape` lets events and groups read differently from characters.
export const CATEGORIES = {
  cosmic:    { label: 'Cosmic Principle',              dark: '#F3E5AB', light: '#A8861F', shape: 'circle' },
  vedic:     { label: 'Vedic Deity',                   dark: '#FF9933', light: '#E07B12', shape: 'circle' },
  trimurti:  { label: 'Trimurti & Family',             dark: '#FFD24D', light: '#C99A00', shape: 'circle' },
  devi:      { label: 'Devi / Shakti',                 dark: '#EC407A', light: '#C2185B', shape: 'circle' },
  avatar:    { label: 'Avatar & Divine Form',          dark: '#29B6F6', light: '#0277BD', shape: 'circle' },
  asura:     { label: 'Asura / Daitya / Danava',       dark: '#9575CD', light: '#5E35B1', shape: 'circle' },
  rakshasa:  { label: 'Rakshasa',                      dark: '#E53935', light: '#B71C1C', shape: 'circle' },
  rishi:     { label: 'Rishi / Sage',                  dark: '#9CCC65', light: '#558B2F', shape: 'circle' },
  human:     { label: 'Human / Epic Hero',             dark: '#26C6A6', light: '#00897B', shape: 'circle' },
  celestial: { label: 'Celestial Being',               dark: '#FFAB91', light: '#E64A19', shape: 'circle' },
  animal:    { label: 'Animal, Vanara & Vahana',       dark: '#BCAAA4', light: '#6D4C41', shape: 'circle' },
  event:     { label: 'Key Event',                     dark: '#FAFAFA', light: '#37474F', shape: 'diamond' },
};

/* ------------------------------------------------------------------ */
/* Eras — ordered by first textual appearance (used by the timeline).  */
/* Dates are broad scholarly approximations and are debated.           */
/* ------------------------------------------------------------------ */
export const ERAS = [
  { id: 'rigveda', short: 'Rig Veda',        label: 'Rig Veda',                     group: 'vedic',   dates: 'c. 1500–1200 BCE',
    texts: 'Rig Veda Samhita' },
  { id: 'later-vedic', short: 'Later Vedic',    label: 'Later Vedic',                  group: 'vedic',   dates: 'c. 1200–800 BCE',
    texts: 'Yajur, Sama & Atharva Vedas; Brahmanas (Shatapatha, Aitareya, Taittiriya)' },
  { id: 'upanishads', short: 'Upanishads',     label: 'Upanishads',                   group: 'vedic',   dates: 'c. 800–200 BCE',
    texts: 'Brihadaranyaka, Chandogya, Katha, Kena, Shvetashvatara…' },
  { id: 'ramayana', short: 'Ramayana',       label: 'Ramayana',                     group: 'epic',    dates: 'c. 500 BCE–300 CE',
    texts: 'Valmiki Ramayana' },
  { id: 'mahabharata', short: 'Mahabharata',    label: 'Mahabharata & Harivamsha',     group: 'epic',    dates: 'c. 400 BCE–400 CE',
    texts: 'Mahabharata (incl. Bhagavad Gita), Harivamsha' },
  { id: 'early-puranas', short: 'Early Pur.',  label: 'Early Puranas',                group: 'puranic', dates: 'c. 300–600 CE',
    texts: 'Vishnu, Vayu, Matsya, Markandeya (Devi Mahatmya) Puranas' },
  { id: 'middle-puranas', short: 'Mid Pur.', label: 'Middle Puranas',               group: 'puranic', dates: 'c. 600–1000 CE',
    texts: 'Bhagavata, Shiva, Linga, Kurma, Skanda, Padma Puranas' },
  { id: 'late-puranas', short: 'Late Pur.',   label: 'Late Puranas & Tantras',       group: 'puranic', dates: 'c. 1000–1800 CE',
    texts: 'Devi Bhagavata, Brahmavaivarta, Kalika Purana, Tantras, regional traditions' },
];

export const ERA_GROUPS = {
  vedic:   { label: 'Vedic' },
  epic:    { label: 'Epic' },
  puranic: { label: 'Puranic' },
};

export const ERA_INDEX = Object.fromEntries(ERAS.map((e, i) => [e.id, i]));

/* ------------------------------------------------------------------ */
/* Relationship (edge) types                                           */
/* ------------------------------------------------------------------ */
// Every edge reads as a sentence:  <source> [out-label] <target>.
//   directed: draw an arrow toward the target
//   symmetric: order of source/target carries no meaning
//   dash: canvas line-dash pattern ([] = solid)
//   out / in: labels used in the side panel, seen from the source / target
export const EDGE_TYPES = {
  // family: solid lines
  'parent':           { group: 'family',   label: 'Parent → child',        color: '#FFD24D', dash: [],        width: 1.4, directed: true,  out: 'Parent of',          in: 'Child of' },
  'ancestor-of':      { group: 'family',   label: 'Ancestor → descendant', color: '#D4B24C', dash: [1, 3],    width: 1.2, directed: true,  out: 'Ancestor of',        in: 'Descendant of' },
  'spouse':           { group: 'family',   label: 'Spouse / consort',      color: '#F06292', dash: [],        width: 1.6, directed: false, out: 'Spouse of',          in: 'Spouse of' },
  'sibling':          { group: 'family',   label: 'Sibling',               color: '#FFB74D', dash: [],        width: 1.0, directed: false, out: 'Sibling of',         in: 'Sibling of' },
  // enmity: dashed lines
  'enemy':            { group: 'enmity',   label: 'Enemy / rival',         color: '#EF5350', dash: [5, 4],    width: 1.2, directed: false, out: 'Enemy of',           in: 'Enemy of' },
  'slayer':           { group: 'enmity',   label: 'Slayer → slain',        color: '#FF1744', dash: [6, 3],    width: 1.5, directed: true,  out: 'Slew',               in: 'Slain by' },
  'curse':            { group: 'enmity',   label: 'Curse-giver → cursed',  color: '#FF7043', dash: [3, 3],    width: 1.2, directed: true,  out: 'Cursed',             in: 'Cursed by' },
  // divine identity: dotted lines
  'avatar-of':        { group: 'identity', label: 'Avatar of',             color: '#29B6F6', dash: [1.5, 2.5], width: 1.6, directed: true,  out: 'Avatar of',          in: 'Has avatar' },
  'form-of':          { group: 'identity', label: 'Form / aspect of',      color: '#4DD0E1', dash: [1.5, 2.5], width: 1.3, directed: true,  out: 'Form of',            in: 'Has form' },
  'reincarnation-of': { group: 'identity', label: 'Reincarnation of',      color: '#B39DDB', dash: [1.5, 2.5], width: 1.3, directed: true,  out: 'Reincarnation of',   in: 'Reborn as' },
  // spiritual bonds: dash-dot
  'guru':             { group: 'spiritual', label: 'Guru → disciple',      color: '#9CCC65', dash: [8, 3, 2, 3], width: 1.2, directed: true, out: 'Guru of',           in: 'Disciple of' },
  'devotee':          { group: 'spiritual', label: 'Devotee → deity',      color: '#AED581', dash: [8, 3, 2, 3], width: 1.1, directed: true, out: 'Devotee of',        in: 'Worshipped by' },
  'boon':             { group: 'spiritual', label: 'Boon-giver → receiver', color: '#FFF176', dash: [10, 4],   width: 1.1, directed: true,  out: 'Granted a boon to',  in: 'Received a boon from' },
  // other
  'ally':             { group: 'other',    label: 'Ally / friend',         color: '#26C6A6', dash: [],        width: 1.0, directed: false, out: 'Ally of',            in: 'Ally of' },
  'vahana':           { group: 'other',    label: 'Vahana (mount) of',     color: '#BCAAA4', dash: [6, 2, 1, 2], width: 1.3, directed: true, out: 'Vahana of',         in: 'Rides' },
  'created-by':       { group: 'other',    label: 'Created / emanated by', color: '#F3E5AB', dash: [1, 3],    width: 1.1, directed: true,  out: 'Created by',         in: 'Created' },
  'member-of':        { group: 'other',    label: 'Member of group',       color: '#90A4AE', dash: [1, 4],    width: 0.8, directed: true,  out: 'Member of',          in: 'Members' },
  'participated-in':  { group: 'other',    label: 'Participated in event', color: '#78909C', dash: [],        width: 0.6, directed: true,  out: 'Took part in',       in: 'Participants' },
};

export const EDGE_GROUPS = {
  family:    { label: 'Family',          style: 'solid' },
  enmity:    { label: 'Enmity',          style: 'dashed' },
  identity:  { label: 'Divine identity', style: 'dotted' },
  spiritual: { label: 'Spiritual bonds', style: 'dash-dot' },
  other:     { label: 'Other',           style: 'mixed' },
};

/* ------------------------------------------------------------------ */
/* Lineages for the family-tree view                                   */
/* ------------------------------------------------------------------ */
// A lineage is computed from the graph, not hard-coded:
//   members = descendants of `roots` (via parent / ancestor-of edges, up to
//   `maxDepth` generations) + their spouses + the other parents of every
//   descendant. `stopAt` ids are included but not expanded further.
export const LINEAGES = [
  { id: 'kuru',      name: 'Kuru dynasty (Mahabharata)',     roots: ['pratipa'],          maxDepth: 7 },
  { id: 'ikshvaku',  name: 'Ikshvaku / Solar dynasty',       roots: ['vaivasvata-manu'],  maxDepth: 14, stopAt: ['ila'] },
  { id: 'lunar',     name: 'Lunar dynasty (Chandravamsha)',  roots: ['soma'],             maxDepth: 12, stopAt: ['pratipa', 'shurasena'] },
  { id: 'yadu',      name: 'Yadava clan (Krishna)',          roots: ['shurasena'],        maxDepth: 5 },
  { id: 'kashyapa',  name: 'Children of Kashyapa',           roots: ['kashyapa'],         maxDepth: 1 },
  { id: 'daitya',    name: 'Daitya line (Hiranyakashipu)',   roots: ['diti'],             maxDepth: 5 },
  { id: 'pulastya',  name: 'Pulastya line (Ravana)',         roots: ['pulastya'],         maxDepth: 4 },
  { id: 'shiva',     name: 'Family of Shiva',                roots: ['shiva'],            maxDepth: 2, withSpouseParents: true },
  { id: 'vashistha', name: 'Vashistha → Vyasa line',         roots: ['vashistha'],        maxDepth: 5 },
  { id: 'bhrigu',    name: 'Bhrigu line (Bhargavas)',        roots: ['bhrigu'],           maxDepth: 4 },
  { id: 'brahma',    name: 'Mind-born sons of Brahma',       roots: ['brahma'],           maxDepth: 1 },
  { id: 'surya',     name: 'Children of Surya',              roots: ['surya'],            maxDepth: 2 },
];

/* Hubs for the avatar view (radial layout). */
export const AVATAR_HUBS = ['vishnu', 'shiva', 'adi-parashakti'];
