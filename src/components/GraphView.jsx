/**
 * GraphView — the canvas network, rendered with react-force-graph-2d.
 *
 * Why react-force-graph-2d: it draws on <canvas> (not one DOM/SVG element per
 * node), runs d3-force under the hood, and ships zoom/pan/drag, link arrows,
 * dashed links and hover hit-testing out of the box. It stays at 60 fps with
 * the ~500 nodes / ~2 000 links here, where an SVG D3 graph starts to stutter
 * and Cytoscape adds a heavier API we don't need.
 *
 * The same component renders all three views:
 *   mode="force"  free force-directed layout (full network)
 *   mode="fixed"  nodes carry fx/fy from a precomputed layout (tree / avatar)
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { CATEGORIES, EDGE_TYPES } from '../data/meta.js';
import { useLang } from '../i18n/LanguageContext.jsx';

const THEME = {
  // linkShade darkens the (bright) edge colours so they hold up on ivory
  dark:  { label: '#F4ECD8', halo: 'rgba(8, 12, 32, 0.88)', ring: '#FFD24D', linkAlpha: 0.26, eventAlpha: 0.1, linkShade: 1 },
  light: { label: '#2A2118', halo: 'rgba(251, 246, 234, 0.92)', ring: '#B8860B', linkAlpha: 0.4, eventAlpha: 0.16, linkShade: 0.62 },
};

/** '#RRGGBB' + alpha → 'rgba()' (cached, called for every link every frame) */
const rgbaCache = new Map();
function rgba(hex, a, shade = 1) {
  const k = hex + a.toFixed(2) + shade;
  let v = rgbaCache.get(k);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    const c = (x) => Math.round(x * shade);
    v = `rgba(${c((n >> 16) & 255)}, ${c((n >> 8) & 255)}, ${c(n & 255)}, ${a.toFixed(2)})`;
    rgbaCache.set(k, v);
  }
  return v;
}

/** Tooltips are HTML strings, so escape data before interpolating it. */
const esc = (str = '') => String(str).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

const idOf = (end) => (typeof end === 'object' ? end.id : end);

/** Canvas label: drop parentheticals ("Vyasa (Krishna Dvaipayana)" → "Vyasa"). */
const shortName = (name) => name.replace(/\s*\(.*?\)\s*/g, ' ').trim();

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.max(200, width), height: Math.max(200, height) });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function GraphView({
  graphData,
  mode = 'force',
  theme = 'dark',
  selectedId,
  hoverId,
  pathNodeIds,     // Set | null — nodes on the active path
  pathLinkIds,     // Set | null
  elbowLinks,      // family-tree style right-angled connectors
  timelineEnabled, // when true, nodes fade in/out around timelineValue instead of popping
  timelineValue,
  fgRef,
  onNodeClick,
  onNodeHover,
  onBackgroundClick,
}) {
  const wrapRef = useRef(null);
  const { width, height } = useElementSize(wrapRef);
  const { t, categoryLabel, edgeDirection } = useLang();
  const palette = THEME[theme];
  const fittedRef = useRef(false);
  const [hoverLink, setHoverLink] = useState(null); // the one link currently under the pointer

  /* Neighbour lookup for the *currently rendered* links. */
  const neighbours = useMemo(() => {
    const m = new Map();
    for (const l of graphData.links) {
      const s = idOf(l.source), t = idOf(l.target);
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s).add(t);
      m.get(t).add(s);
    }
    return m;
  }, [graphData]);

  /* What is "lit": hovering one specific line beats everything (narrows the
     highlight to just its two ends, so one relationship reads clearly without
     competing lines). Otherwise a selection is "sticky" — once you've clicked
     a node, hovering elsewhere previews that node's tooltip only and does
     NOT steal the highlight away, since losing the selected node's focus to
     whatever the cursor happens to pass over reads as random and broken.
     Hover only drives the highlight when nothing is selected (a lightweight
     "explore before you click" preview) and no path result is being shown. */
  const focusId = !hoverLink && (selectedId || (pathNodeIds ? null : hoverId));
  const activeNodes = useMemo(() => {
    if (hoverLink) return new Set([idOf(hoverLink.source), idOf(hoverLink.target)]);
    if (focusId) return new Set([focusId, ...(neighbours.get(focusId) || [])]);
    if (pathNodeIds) return pathNodeIds;
    return null;
  }, [hoverLink, focusId, pathNodeIds, neighbours]);
  // Any of the three highlight modes is "focused": dim everything else harder.
  const isFocusedView = !!(hoverLink || focusId || pathNodeIds);

  const isActiveLink = useCallback((l) => {
    if (hoverLink) return l.id === hoverLink.id;
    if (focusId) return idOf(l.source) === focusId || idOf(l.target) === focusId;
    if (pathLinkIds) return pathLinkIds.has(l.id);
    return null; // nothing highlighted
  }, [hoverLink, focusId, pathLinkIds]);

  /* ---------- forces ---------- */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    window.__fg = fg; window.__gd = graphData;
    if (mode === 'force') {
      fg.d3Force('charge').strength((n) => -38 - Math.min(n.degree, 60) * 2.4).distanceMax(520);
      fg.d3Force('link')
        .distance((l) => (l.type === 'participated-in' ? 70 : l.type === 'member-of' ? 45 : 34))
        .strength((l) => {
          const s = Math.min(l.source.degree || 1, l.target.degree || 1);
          return (l.type === 'participated-in' ? 0.25 : 1) / Math.max(1, s);
        });
      fg.d3Force('collide', forceCollide((n) => n.radius + 1.5));
    } else {
      fg.d3Force('collide', null);
    }
    fg.d3ReheatSimulation();
    // Frame the graph explicitly. Fixed layouts (tree / avatar) are ready at
    // once; the force layout is framed only on first load (early + on engine
    // stop) so later filter or path changes don't yank the camera around.
    if (mode === 'fixed' || !fittedRef.current) {
      // Frame only what's currently revealed — nodes further along the
      // timeline still sit in the graph (fading in), so an unfiltered fit
      // would zoom out to their eventual spread instead of today's era.
      const visible = (n) => !timelineEnabled || n.eraIndex <= timelineValue;
      // Twice: the canvas may still be settling its size right after mount.
      const delays = mode === 'fixed' ? [150, 650] : [700];
      const timers = delays.map((d) => setTimeout(() => fgRef.current?.zoomToFit(500, 50, visible), d));
      return () => timers.forEach(clearTimeout);
    }
  }, [mode, graphData, fgRef, timelineEnabled, timelineValue]);

  /* ---------- drawing ---------- */
  // Timeline reveal, eased frame by frame (an actual "pop" would happen in a
  // single tick since timelineValue only ever holds a whole era index) —
  // _tlAlpha lives on the node object itself (same trick as x/y) so it keeps
  // easing smoothly across renders instead of snapping back each frame.
  const updateTimelineAlpha = useCallback((node) => {
    if (!timelineEnabled) { node._tlAlpha = 1; return 1; }
    const target = node.eraIndex <= timelineValue ? 1 : 0;
    if (node._tlAlpha === undefined) node._tlAlpha = target; // no fade on first paint
    node._tlAlpha += (target - node._tlAlpha) * 0.09;
    if (Math.abs(target - node._tlAlpha) < 0.004) node._tlAlpha = target;
    return node._tlAlpha;
  }, [timelineEnabled, timelineValue]);

  const drawNode = useCallback((node, ctx, scale) => {
    const tlAlpha = updateTimelineAlpha(node);
    if (tlAlpha < 0.01) return; // fully faded out — nothing to paint
    const r = node.radius;
    const cat = CATEGORIES[node.category] || CATEGORIES.human;
    const color = cat[theme];
    const lit = !activeNodes || activeNodes.has(node.id);
    const isFocus = node.id === selectedId || node.id === hoverId;
    // With something focused, push everything else further into the
    // background so the highlighted node/line and its ends read clearly
    // instead of competing with a haze of unrelated dots.
    ctx.globalAlpha = (lit ? 1 : (isFocusedView ? 0.045 : 0.1)) * tlAlpha;

    // body
    ctx.beginPath();
    if (cat.shape === 'diamond') {
      const d = r * 1.35;
      ctx.moveTo(node.x, node.y - d);
      ctx.lineTo(node.x + d, node.y);
      ctx.lineTo(node.x, node.y + d);
      ctx.lineTo(node.x - d, node.y);
      ctx.closePath();
    } else {
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    }
    ctx.fillStyle = color;
    ctx.fill();

    // collective nodes get an outer ring, disputed ones a dashed outline
    if (node.group) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 2.2, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    if (node.disputed) {
      ctx.setLineDash([1.5, 1.5]);
      ctx.strokeStyle = palette.label;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (isFocus || pathNodeIds?.has(node.id)) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 3.5, 0, 2 * Math.PI);
      ctx.strokeStyle = palette.ring;
      ctx.lineWidth = 2 / Math.sqrt(scale);
      ctx.stroke();
    }

    // label — only when it will be legible, to keep the canvas calm
    // Fixed layouts size labels in world units (they scale with zoom and never
    // outgrow the node spacing); the force view keeps a constant screen size.
    const fixedFont = 14 + Math.min(r, 10) * 0.3;
    const showLabel = lit && (
      mode === 'fixed' ? (fixedFont * scale >= 6 || isFocus) : (
        isFocus || (activeNodes && scale > 0.8) || r * scale > 11 || scale > 2.2
      )
    );
    if (showLabel) {
      const fontPx = mode === 'fixed' && !isFocus
        ? fixedFont
        : Math.max(10, Math.min(15, 9 + r * 0.35)) / scale;
      ctx.font = `${isFocus ? 600 : 500} ${fontPx}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const y = node.y + (cat.shape === 'diamond' ? r * 1.35 : r) + 2 / scale;
      ctx.lineWidth = 3 / scale;
      ctx.strokeStyle = palette.halo;
      const label = shortName(node.name);
      ctx.strokeText(label, node.x, y);
      ctx.fillStyle = palette.label;
      ctx.fillText(label, node.x, y);
      if (scale > 3 || (isFocus && scale > 1.5)) {
        ctx.font = `${fontPx * 0.95}px "Tiro Devanagari Sanskrit", "Noto Sans Devanagari", serif`;
        ctx.strokeText(node.devanagari, node.x, y + fontPx * 1.15);
        ctx.fillStyle = rgba(color.startsWith('#') ? color : '#FFFFFF', 0.95);
        ctx.fillText(node.devanagari, node.x, y + fontPx * 1.15);
      }
    }
    ctx.globalAlpha = 1;
  }, [activeNodes, isFocusedView, selectedId, hoverId, pathNodeIds, theme, palette, mode, updateTimelineAlpha]);

  const paintPointer = useCallback((node, color, ctx) => {
    // A timeline-faded-out node shouldn't still catch clicks/hover — treat
    // "invisible" the same in the hit-test layer as it is on screen.
    if ((node._tlAlpha ?? 1) < 0.05) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius + 2, 0, 2 * Math.PI);
    ctx.fill();
  }, []);

  /** How visible a link's timeline fade should make it — the dimmer of its two ends. */
  const linkTimelineAlpha = (l) => Math.min(l.source?._tlAlpha ?? 1, l.target?._tlAlpha ?? 1);

  const linkColor = useCallback((l) => {
    const t = EDGE_TYPES[l.type];
    const active = isActiveLink(l);
    const shade = palette.linkShade;
    const tl = linkTimelineAlpha(l);
    if (active === true) return rgba(t.color, 0.95 * tl, shade);
    // Hovering one specific line pushes every other line further down than
    // the ordinary "something is selected" dim, so the hovered one stands
    // out even from its own siblings fanning out of the same node.
    if (active === false) return rgba(t.color, (hoverLink ? 0.02 : 0.035) * tl, shade);
    return rgba(t.color, (l.type === 'participated-in' ? palette.eventAlpha : palette.linkAlpha) * tl, shade);
  }, [isActiveLink, hoverLink, palette]);

  const linkWidth = useCallback((l) => {
    const w = EDGE_TYPES[l.type].width;
    // Thin relationship types (participated-in, member-of) all but disappear
    // even when "active" unless given a floor — this is often the only line
    // connecting a person to an event, so it must read clearly once lit.
    return isActiveLink(l) ? Math.max(w * 1.9, 1.8) : w;
  }, [isActiveLink]);

  /* Family-tree connectors: parent → child links drop down, run across and
     drop again; spouse links stay straight. Widths are in screen pixels. */
  const drawElbow = useCallback((l, ctx, scale) => {
    const s = l.source, t = l.target;
    if (!Number.isFinite(s.x) || !Number.isFinite(t.x)) return;
    const type = EDGE_TYPES[l.type];
    ctx.strokeStyle = linkColor(l);
    ctx.lineWidth = linkWidth(l) / scale;
    ctx.setLineDash(type.dash.length ? type.dash.map((d) => d / scale) : []);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    if (l.type === 'spouse' || Math.abs(t.y - s.y) < 1) {
      ctx.lineTo(t.x, t.y);
    } else {
      const midY = t.y - Math.min(55, Math.abs(t.y - s.y) / 2);
      ctx.lineTo(s.x, midY);
      ctx.lineTo(t.x, midY);
      ctx.lineTo(t.x, t.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }, [linkColor, linkWidth]);

  const tooltipNode = useCallback((n) =>
    `<div class="tt"><b>${esc(n.name)}</b> <span class="tt-dev">${esc(n.devanagari)}</span>` +
    `<div class="tt-sub">${esc(categoryLabel(n.category))} · ${esc(t('connectionsCount', { count: n.degree }))}</div></div>`,
    [categoryLabel, t]);

  const tooltipLink = useCallback((l) => {
    const [outPhrase] = edgeDirection(l.type);
    return `<div class="tt"><b>${esc(l.source.name)}</b> <span class="tt-rel">${esc(outPhrase)}</span> <b>${esc(l.target.name)}</b>` +
      `<div class="tt-sub">${esc(l.label)}${l.disputed ? ` <em>(${esc(t('disputedRegional'))})</em>` : ''}</div></div>`;
  }, [edgeDirection, t]);

  return (
    <div ref={wrapRef} className="graph-wrap">
      <ForceGraph2D
        ref={fgRef}
        width={width}
        height={height}
        graphData={graphData}
        backgroundColor="rgba(0,0,0,0)"
        nodeId="id"
        nodeRelSize={1}
        nodeVal={(n) => n.radius * n.radius}
        nodeCanvasObject={drawNode}
        nodePointerAreaPaint={paintPointer}
        nodeLabel={tooltipNode}
        linkLabel={tooltipLink}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkLineDash={(l) => (EDGE_TYPES[l.type].dash.length ? EDGE_TYPES[l.type].dash : null)}
        linkCurvature={(l) => l.curvature || 0}
        linkCanvasObjectMode={elbowLinks ? () => 'replace' : undefined}
        linkCanvasObject={elbowLinks ? drawElbow : undefined}
        linkDirectionalArrowLength={(l) => (!elbowLinks && EDGE_TYPES[l.type].directed && l.type !== 'participated-in' ? 3.2 : 0)}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={(l) => (pathLinkIds?.has(l.id) ? 3 : 0)}
        linkDirectionalParticleWidth={2.6}
        linkDirectionalParticleColor={() => palette.ring}
        linkHoverPrecision={6}
        onNodeClick={(n) => onNodeClick?.(n.id)}
        onNodeHover={(n) => {
          if (wrapRef.current) wrapRef.current.style.cursor = n ? 'pointer' : 'grab';
          onNodeHover?.(n ? n.id : null);
        }}
        onLinkHover={(l) => {
          if (wrapRef.current) wrapRef.current.style.cursor = l ? 'pointer' : 'grab';
          setHoverLink(l || null);
        }}
        onNodeDragEnd={(n) => {
          // Pin nodes where the user drops them in the force view.
          if (mode === 'force') { n.fx = n.x; n.fy = n.y; }
        }}
        onBackgroundClick={onBackgroundClick}
        onEngineStop={() => {
          if (!fittedRef.current) {
            fittedRef.current = true;
            fgRef.current?.zoomToFit(700, 50, (n) => !timelineEnabled || n.eraIndex <= timelineValue);
          }
        }}
        warmupTicks={mode === 'force' ? 60 : 0}
        cooldownTicks={mode === 'force' ? 400 : 30}
        d3AlphaDecay={0.025}
        d3VelocityDecay={0.35}
        minZoom={0.08}
        maxZoom={12}
        autoPauseRedraw={false}
      />
    </div>
  );
}
