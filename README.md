# Sutra · सूत्र — an interactive atlas of Hindu mythology

*Sūtra* means "thread". This app maps **485 figures and events** and **2,717 relationships**
from the Rig Veda through the epics to the late Puranas as one explorable network.

## Run it locally

Requirements: **Node.js 18+** (tested on Node 25) and npm.

```bash
cd sutra
npm install
npm run dev
```

Open http://localhost:5173.

Other scripts:

| command | what it does |
|---|---|
| `npm run build` | production build into `dist/` (`npm run preview` serves it) |
| `npm run validate` | checks the whole dataset: schema, ids, dangling / contradictory edges |
| `npm run export-data` | merges every section into one `data/mythology.json` (for Gephi, Python, …) |
| `npm run registry` | regenerates `src/data/registry.json` from `scripts/registry.txt` |

## What you can do

- **Network view.** Every figure is a node, coloured by category and sized by number of connections. Events are diamonds, collective groups (Adityas, Matrikas…) have a ring, and disputed or regional figures have a dashed outline. Lines are styled by relationship: solid for family, dashed for enmity, dotted for divine identity, dash-dot for spiritual bonds. Arrows point from source to target.
- **Hover** a node to light up its neighbourhood and fade everything else. Hover a line to read its explanation.
- **Click** a node to open the side panel: placeholder portrait, English and Devanagari names, description, legend, symbols, weapons, vahana, abode, sources, textual variations, and every connection (clickable) grouped by relationship.
- **Search** with autocomplete over names, Devanagari and aliases (e.g. "Vajrapani" finds Indra).
- **Filters.** Toggle categories, relationship types and eras (Vedic / Epic / Puranic, or individual texts).
- **Timeline.** Reveal figures in order of first textual appearance, era by era, or press ▶ to animate.
- **Family tree view.** Generational layout for 12 lineages (Kuru, Ikshvaku, Lunar, Yadava, children of Kashyapa, the Daitya and Pulastya lines, Shiva's family, Vashistha→Vyasa, Bhrigu, Brahma's mind-born sons, children of Surya). Lineages are computed from the graph, not hard-coded.
- **Avatar view.** Radial layout of avatars and forms around Vishnu, Shiva and Adi Parashakti.
- **Path finder.** The shortest chain of relationships between any two figures, each step explained. For example, Vritra is slain by Indra, who is the father of Arjuna.
- **Controls.** Zoom, pan, drag (dragged nodes stay pinned), reset view, dark/light theme, and a responsive layout (bottom-sheet panel and filter drawer on phones).

## Why react-force-graph-2d

| | react-force-graph-2d | D3 (SVG) | Cytoscape.js |
|---|---|---|---|
| Rendering | `<canvas>`: one draw call per frame | one DOM node per element (~3,000 here) | canvas |
| 500 nodes / 2,700 links | smooth 60 fps | janky on hover / zoom | smooth |
| Zoom, pan, drag, hit-testing, arrows, dashed links | built in | hand-written | built in |
| React integration | a component with props | manual effects | wrapper needed |
| Custom node drawing | `nodeCanvasObject` (full canvas API) | full control | stylesheet DSL |

Canvas rendering is the deciding factor at this size. react-force-graph also runs d3-force
underneath, so the physics stays tunable (`GraphView.jsx`: charge scaled by degree, weaker
springs for event links, collision radius per node). The family-tree and avatar views reuse
the same component with precomputed fixed positions (`fx`/`fy`).

## Project structure

```
src/
  data/
    meta.js            categories, eras, relationship types, lineages (shared vocabulary)
    sections/*.json    the dataset: 20 thematic files, one per section below
    index.js           merges sections, de-duplicates edges, computes degree
    registry.json      master id list (generated from scripts/registry.txt)
    SCHEMA.md          field-by-field schema + edge direction conventions
  lib/graph.js         BFS path finder, lineage extraction, tree + radial layouts
  components/
    GraphView.jsx      canvas graph (all three views)
    SidePanel.jsx      node details
    SearchBar.jsx      autocomplete (header + path finder)
    Filters.jsx  Timeline.jsx  Legend.jsx  PathFinder.jsx
    Header.jsx  ZoomControls.jsx  Portrait.jsx  LineSample.jsx
  App.jsx              state + derived graph data for each view
  styles.css           theme tokens (dark/light), layout, responsive rules
scripts/               validate-data.mjs, export-data.mjs, build-registry.mjs
data/mythology.json    single-file export of the full dataset
```

### Dataset sections

| file | contents |
|---|---|
| 01-cosmology | Brahman, Hiranyagarbha, Purusha, Prajapati, Manus, the Flood, Saptarishi, Vedic groups |
| 02-vedic | Indra, Agni, Varuna, Mitra, Surya, Soma, Vayu, Rudra, Yama, the Adityas… |
| 03-trimurti | Brahma, Vishnu, Shiva, consorts, children, iconic forms |
| 04-devi | Adi Parashakti, Durga, Kali, the 10 Mahavidyas, Navadurga, Saptamatrika… |
| 05-avatars | Dashavatara + the Bhagavata's avatars; Bhairava, Virabhadra, Sharabha, Kirata… |
| 06-daityas / 07-devi-shiva-foes | asuras, daityas and danavas, treated with nuance |
| 08-rishis-vedic / 09-sages | rishis, their wives and lineages; Upanishadic and epic sages |
| 10–12 | Ramayana: Ayodhya and Mithila, the Vanaras, Lanka |
| 13-dynasties | Solar (Ikshvaku) and Lunar dynasties |
| 14–17 | Mahabharata: Kurus, Kauravas and allies, Yadavas, episodes |
| 18-nagas-vahanas / 19-celestials | Nagas, Garuda, vahanas, Apsaras, Gandharvas, Navagraha, Dikpalas |
| 20-events | 28 key events (Samudra Manthan, Daksha Yajna, Kurukshetra…), each linked to its participants |

## Adding to the dataset

1. Add the node to a section file (or create `src/data/sections/21-yourtopic.json` with
   `{ "section": "21-yourtopic", "nodes": [], "edges": [] }`). Follow `src/data/SCHEMA.md`.
2. Add its line to `scripts/registry.txt` and run `npm run registry`.
3. Add edges. Read every edge as "source → verb → target": `parent` means the source is the
   parent, and `slayer` means the source killed the target.
4. Run `npm run validate`. The app picks new files up automatically (`import.meta.glob`).

To show real artwork, add `"image": "https://…"` to a node; the side panel uses it in place
of the generated mandala placeholder.

## On accuracy

The dataset was compiled from primary texts (Vedas, Brahmanas, Upanishads, the Valmiki Ramayana,
the Mahabharata (Critical Edition preferred), Harivamsha, and the Puranas) and standard scholarship.

- **Eras** mark each figure's *earliest* textual appearance. Dates are broad and debated.
- **`variations`** record where texts, sects or regions differ; the data does not silently pick one version.
- **`disputed`** flags figures and links that are late, regional or contested (e.g. Barbarika,
  Ayyappa, Ahiravana, Radha's textual history, the Jaya–Vijaya birth mapping).
- Verse numbers are cited only where confident.

This is a large reference work built with AI assistance. Treat it as a well-sourced starting
point, not a scholarly edition: spot-check anything you plan to publish against the cited
texts. Corrections are easy to make in the JSON. This is a living tradition for over a billion
people; the data aims to present every figure, asuras included, with respect and nuance.
