/**
 * App — owns UI state (view, selection, filters, timeline, path) and derives
 * the graph data handed to <GraphView>. Components below it are presentational.
 */
import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { nodes, links, nodeById, adjacency, stats } from './data/index.js';
import { CATEGORIES, EDGE_TYPES, ERAS, LINEAGES, AVATAR_HUBS } from './data/meta.js';
import { shortestPath, computeLineage, layoutFamilyTree, layoutAvatars } from './lib/graph.js';
import { localizeNode, localizeEdgeLabel } from './data/i18n/index.js';
import { useLang } from './i18n/LanguageContext.jsx';
import Header from './components/Header.jsx';
import GraphView from './components/GraphView.jsx';
import SidePanel from './components/SidePanel.jsx';
import Filters from './components/Filters.jsx';
import Timeline from './components/Timeline.jsx';
import Legend from './components/Legend.jsx';
import PathFinder from './components/PathFinder.jsx';
import ZoomControls from './components/ZoomControls.jsx';

// Three.js + react-force-graph-3d are ~900 KB gzipped — far too heavy to ship
// to everyone who never opens the 3D view. Loaded as its own chunk on demand.
const OrbitView = lazy(() => import('./components/OrbitView.jsx'));

/* ---------- helpers ---------- */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return matches;
}

function readStored(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

/** Give parallel edges between the same pair distinct curvatures so they don't overlap. */
function withCurvature(ls) {
  const byPair = new Map();
  for (const l of ls) {
    const k = [l.source, l.target].sort().join('|');
    if (!byPair.has(k)) byPair.set(k, []);
    byPair.get(k).push(l);
  }
  const steps = [0, 0.22, -0.22, 0.4, -0.4, 0.55, -0.55];
  for (const group of byPair.values()) {
    group.forEach((l, i) => {
      // curvature sign is relative to link direction; normalise so ± spreads both sides
      const flip = l.source > l.target ? -1 : 1;
      l.curvature = (steps[i] ?? 0.6) * flip;
    });
  }
  return ls;
}

/** CSS custom properties for category colours, generated from meta.js. */
const categoryCss = ['dark', 'light'].map((theme) =>
  `:root[data-theme="${theme}"]{${Object.entries(CATEGORIES).map(([id, c]) => `--cat-${id}:${c[theme]}`).join(';')}}`
).join('\n');

const ALL = {
  categories: Object.keys(CATEGORIES),
  edgeTypes: Object.keys(EDGE_TYPES),
  eras: ERAS.map((e) => e.id),
};
const FAMILY_TYPES = new Set(['parent', 'ancestor-of', 'spouse']);
const IDENTITY_TYPES = new Set(['avatar-of', 'form-of', 'reincarnation-of']);
const NODE_TEXT_FIELDS = ['name', 'aliases', 'description', 'story', 'symbols', 'weapons', 'vahana', 'abode', 'sources', 'variations'];

// Every lineage's member set, computed once, so the side panel can offer
// "show family tree" for any node that belongs to one.
const LINEAGE_MEMBERS = LINEAGES.map((l) => ({ ...l, members: computeLineage(l, adjacency) }))
  .filter((l) => l.members.size > 1);

export default function App() {
  const fgRef = useRef();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { lang, t, lineageLabel, dataVersion } = useLang();

  /** Overlay a node's mutable display fields with the translation for `lang`,
   *  in place, keeping its object reference (and any x/y/fx/fy physics state
   *  the force simulation has already attached to it) intact. */
  const applyLang = useCallback((node) => {
    const loc = localizeNode(nodeById.get(node.id), lang);
    for (const f of NODE_TEXT_FIELDS) node[f] = loc[f];
    return node;
    // dataVersion: a language's translation chunk can finish loading after
    // `lang` already changed (see LanguageContext) — recompute once it does.
  }, [lang, dataVersion]);

  const localizeLink = useCallback((l) => {
    const { label, variation } = localizeEdgeLabel(l, lang);
    return { ...l, label, variation };
  }, [lang, dataVersion]);

  /* ---------- UI state ---------- */
  const [theme, setTheme] = useState(() => readStored('sutra-theme',
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  const [view, setView] = useState('network');
  const [lineageId, setLineageId] = useState(LINEAGE_MEMBERS[0]?.id || 'kuru');
  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);
  const [pathOpen, setPathOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [orbitId, setOrbitId] = useState(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const [filters, setFilters] = useState({
    categories: new Set(ALL.categories),
    edgeTypes: new Set(ALL.edgeTypes),
    eras: new Set(ALL.eras),
    hideIsolated: false,
  });
  const [timeline, setTimeline] = useState({ enabled: false, value: ERAS.length - 1, playing: false });
  const [path, setPath] = useState({ from: null, to: null, skipEvents: true, respectFilters: false });

  // The filter sidebar is a modal drawer on small screens: close it when the
  // layout switches to mobile, reopen it when there is room again.
  useEffect(() => { setFiltersOpen(!isMobile); }, [isMobile]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('sutra-theme', theme); } catch { /* storage unavailable */ }
  }, [theme]);

  // Keep <title> and meta description in sync with the UI language.
  useEffect(() => {
    document.title = lang === 'en' ? 'Sutra — Hindu Mythology Atlas' : `${t('appTitle')} — ${t('viewNetwork')} · ${t('viewFamily')} · ${t('viewAvatar')}`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('appSubtitle', { nodes: stats.nodes, links: stats.links }));
  }, [lang, t]);

  /* ---------- path finder ---------- */
  const pathResult = useMemo(() => {
    if (!path.from || !path.to) return undefined;
    return shortestPath(adjacency, path.from, path.to, {
      skipEvents: path.skipEvents,
      nodeById,
      allowLink: path.respectFilters ? (l) => filters.edgeTypes.has(l.type) : undefined,
    });
  }, [path, filters.edgeTypes]);

  const pathNodeIds = useMemo(() => (pathResult
    ? new Set([path.from, ...pathResult.map((s) => s.to)]) : null), [pathResult, path.from]);
  const pathLinkIds = useMemo(() => (pathResult ? new Set(pathResult.map((s) => s.link.id)) : null), [pathResult]);

  /* ---------- network view data ---------- */
  // Node objects persist across filter changes so the layout doesn't jump.
  const simNodes = useMemo(() => new Map(nodes.map((n) => [n.id, { ...n }])), []);

  // Timeline no longer removes nodes from the graph outright — GraphView
  // fades them in/out itself (see its _tlAlpha), which reads far smoother
  // than a whole era's worth of nodes popping in or out at once, and keeps
  // already-revealed nodes from being jolted out of place as more join.
  const passes = useCallback((n) => filters.categories.has(n.category) && filters.eras.has(n.era),
    [filters]);

  // A selected node is always shown, even if filtered out. Depending on
  // `forcedId` (not `selectedId`) keeps selection from rebuilding the graph.
  const forcedId = selectedId && !passes(nodeById.get(selectedId)) ? selectedId : null;

  const visibleIds = useMemo(() => {
    const ids = new Set(nodes.filter(passes).map((n) => n.id));
    if (forcedId) ids.add(forcedId);
    return ids;
  }, [passes, forcedId]);

  const keepId = filters.hideIsolated ? selectedId : null; // don't hide the selected node
  const networkData = useMemo(() => {
    const ids = new Set(visibleIds);
    let ls = links.filter((l) => filters.edgeTypes.has(l.type) && ids.has(l.source) && ids.has(l.target));
    if (filters.hideIsolated) {
      const linked = new Set(ls.flatMap((l) => [l.source, l.target]));
      for (const id of [...ids]) if (!linked.has(id) && id !== keepId) ids.delete(id);
    }
    // Always show the active path, even if filters would hide it.
    if (pathResult) {
      pathNodeIds.forEach((id) => ids.add(id));
      const have = new Set(ls.map((l) => l.id));
      pathResult.forEach((s) => { if (!have.has(s.link.id)) ls.push(s.link); });
    }
    // Newly revealed nodes (timeline) start next to an already placed neighbour.
    for (const id of ids) {
      const n = simNodes.get(id);
      if (n.x !== undefined) continue;
      const anchor = adjacency.get(id).map((a) => simNodes.get(a.other)).find((m) => m.x !== undefined && ids.has(m.id));
      if (anchor) { n.x = anchor.x + (Math.random() - 0.5) * 30; n.y = anchor.y + (Math.random() - 0.5) * 30; }
    }
    return {
      nodes: [...ids].map((id) => applyLang(simNodes.get(id))),
      links: withCurvature(ls.map(localizeLink)),
    };
  }, [visibleIds, filters.edgeTypes, filters.hideIsolated, pathResult, pathNodeIds, simNodes, keepId, applyLang, localizeLink]);

  /* ---------- family-tree view data ---------- */
  const lineage = LINEAGE_MEMBERS.find((l) => l.id === lineageId) || LINEAGE_MEMBERS[0];
  const familyData = useMemo(() => {
    if (view !== 'family' || !lineage) return null;
    const pos = layoutFamilyTree(lineage.members, links);
    return {
      nodes: [...lineage.members].map((id) => {
        const p = pos.get(id);
        return { ...localizeNode(nodeById.get(id), lang), x: p.x, y: p.y, fx: p.x, fy: p.y };
      }),
      links: withCurvature(links.filter((l) => FAMILY_TYPES.has(l.type)
        && lineage.members.has(l.source) && lineage.members.has(l.target)).map(localizeLink)),
    };
  }, [view, lineage, lang, dataVersion, localizeLink]);

  /* ---------- avatar view data ---------- */
  const avatarData = useMemo(() => {
    if (view !== 'avatar') return null;
    const { positions } = layoutAvatars(AVATAR_HUBS.filter((h) => nodeById.has(h)), adjacency);
    const ids = new Set(positions.keys());
    return {
      nodes: [...ids].map((id) => {
        const p = positions.get(id);
        return { ...localizeNode(nodeById.get(id), lang), x: p.x, y: p.y, fx: p.x, fy: p.y };
      }),
      links: withCurvature(links.filter((l) => IDENTITY_TYPES.has(l.type) && ids.has(l.source) && ids.has(l.target))
        .map(localizeLink)),
    };
  }, [view, lang, dataVersion, localizeLink]);

  const graphData = view === 'family' ? familyData : view === 'avatar' ? avatarData : networkData;

  /* ---------- counts for the filter panel ---------- */
  const counts = useMemo(() => {
    const c = { categories: {}, edgeTypes: {}, eras: {} };
    for (const n of nodes) {
      c.categories[n.category] = (c.categories[n.category] || 0) + 1;
      c.eras[n.era] = (c.eras[n.era] || 0) + 1;
    }
    for (const l of links) c.edgeTypes[l.type] = (c.edgeTypes[l.type] || 0) + 1;
    return c;
  }, []);

  /* ---------- actions ---------- */
  const focusNode = useCallback((id) => {
    if (view !== 'network' && !graphData?.nodes.some((n) => n.id === id)) setView('network');
    setSelectedId(id);
    setPendingFocus(id);
  }, [view, graphData]);

  const selectNode = useCallback((id) => {
    setSelectedId(id);
    if (isMobile) setFiltersOpen(false);
    // Centre on it if it's in the current view.
    if (graphData?.nodes.some((n) => n.id === id)) setPendingFocus(id);
  }, [graphData, isMobile]);

  // Centre the camera once the target node has a position (may need a few ticks).
  useEffect(() => {
    if (!pendingFocus) return;
    let tries = 0;
    const timer = setInterval(() => {
      const n = graphData?.nodes.find((m) => m.id === pendingFocus);
      if ((n && Number.isFinite(n.x)) || ++tries > 20) {
        clearInterval(timer);
        if (n && fgRef.current) {
          fgRef.current.centerAt(n.x, n.y, 700);
          fgRef.current.zoom(Math.max(fgRef.current.zoom(), view === 'network' ? 2.4 : 1.2), 700);
        }
        setPendingFocus(null);
      }
    }, 60);
    return () => clearInterval(timer);
  }, [pendingFocus, graphData, view]);

  // When a path is found, switch to the network and frame it.
  useEffect(() => {
    if (!pathNodeIds) return;
    setView('network');
    const t = setTimeout(() => fgRef.current?.zoomToFit(800, 90, (n) => pathNodeIds.has(n.id)), 250);
    return () => clearTimeout(t);
  }, [pathNodeIds]);

  const resetView = useCallback(() => {
    setSelectedId(null);
    setHoverId(null);
    setPath((p) => ({ ...p, from: null, to: null }));
    if (view === 'network') {
      simNodes.forEach((n) => { n.fx = undefined; n.fy = undefined; });
      fgRef.current?.d3ReheatSimulation();
    }
    fgRef.current?.zoomToFit(700, 50, (n) => !timeline.enabled || n.eraIndex <= timeline.value);
  }, [view, simNodes, timeline.enabled, timeline.value]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && document.activeElement?.tagName !== 'INPUT') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nodeLineages = useMemo(() => (selectedId
    ? LINEAGE_MEMBERS.filter((l) => l.members.has(selectedId)).slice(0, 3) : []), [selectedId]);

  const revealedCount = useMemo(() => nodes.filter((n) => n.eraIndex <= timeline.value).length, [timeline.value]);

  return (
    <div className={`app ${filtersOpen ? 'filters-open' : ''}`}>
      <style>{categoryCss}</style>
      <Header
        view={view} setView={setView}
        lineageId={lineageId} setLineageId={setLineageId}
        theme={theme} setTheme={setTheme}
        onSearch={focusNode}
        onToggleFilters={() => setFiltersOpen((o) => !o)}
        onTogglePath={() => setPathOpen((o) => !o)}
        pathOpen={pathOpen}
        stats={stats}
      />

      <main className="app-main">
        {filtersOpen && (
          <>
            {isMobile && <div className="scrim" onClick={() => setFiltersOpen(false)} />}
            <Filters filters={filters} setFilters={setFilters} counts={counts}
              onClose={() => setFiltersOpen(false)} />
          </>
        )}

        <div className="stage">
          {graphData && (
            <GraphView
              key={view === 'family' ? `family-${lineageId}` : view}
              graphData={graphData}
              mode={view === 'network' ? 'force' : 'fixed'}
              theme={theme}
              selectedId={selectedId}
              hoverId={hoverId}
              pathNodeIds={view === 'network' ? pathNodeIds : null}
              pathLinkIds={view === 'network' ? pathLinkIds : null}
              elbowLinks={view === 'family'}
              timelineEnabled={view === 'network' && timeline.enabled}
              timelineValue={timeline.value}
              fgRef={fgRef}
              onNodeClick={selectNode}
              onNodeHover={setHoverId}
              onBackgroundClick={() => setSelectedId(null)}
            />
          )}

          {view !== 'network' && (
            <div className="view-caption panel">
              {view === 'family' && lineage
                ? <strong>{t('familyCaption', { name: lineageLabel(lineage.id), count: lineage.members.size })}</strong>
                : <strong>{t('avatarCaption')}</strong>}
              <span className="muted"> {t('filtersApplyNote')}</span>
            </div>
          )}

          {pathOpen && (
            <PathFinder
              path={{ ...path, result: pathResult }}
              setPath={setPath}
              onSelect={focusNode}
              onClose={() => setPathOpen(false)}
            />
          )}

          <ZoomControls fgRef={fgRef} onReset={resetView} />
          <Legend open={legendOpen} setOpen={setLegendOpen} />
          {view === 'network' && (
            <Timeline timeline={timeline} setTimeline={setTimeline} revealedCount={revealedCount} />
          )}

          {selectedId && (
            <SidePanel
              key={selectedId}
              nodeId={selectedId}
              onClose={() => setSelectedId(null)}
              onSelect={selectNode}
              onFocus={focusNode}
              onPathFrom={(id) => { setPath((p) => ({ ...p, from: id, to: p.to === id ? null : p.to })); setPathOpen(true); }}
              onOrbit={setOrbitId}
              lineages={nodeLineages}
              onShowLineage={(lid) => { setLineageId(lid); setView('family'); setPendingFocus(selectedId); }}
            />
          )}

          {orbitId && (
            <Suspense fallback={<div className="orbit-view orbit-view--loading"><span className="spinner-big" /></div>}>
              <OrbitView
                centerId={orbitId}
                theme={theme}
                onClose={() => setOrbitId(null)}
                onOpenPanel={(id) => { setOrbitId(null); selectNode(id); }}
              />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
