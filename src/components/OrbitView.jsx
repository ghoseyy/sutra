/**
 * OrbitView — a focused 3D presentation of ONE character: the selected node
 * sits at the centre and its direct relationships float around it in
 * concentric shells (family closest, then divine identity, spiritual bonds,
 * enmity, everything else), each shell evenly spread with a Fibonacci-sphere
 * distribution so neighbours never bunch up or overlap.
 *
 * This exists specifically to counter the full network view's clutter: no
 * force-simulation jitter, no 2,700 overlapping lines — just one character
 * and the handful of relationships that matter, in clean 3D space you can
 * orbit, zoom and click through (breadcrumbs let you walk the graph node by
 * node without ever seeing the whole tangle at once).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import SpriteText from 'three-spritetext';
import * as THREE from 'three';
import { adjacency, nodeById } from '../data/index.js';
import { CATEGORIES, EDGE_TYPES } from '../data/meta.js';
import { localizeNode, localizeEdgeLabel } from '../data/i18n/index.js';
import { useLang } from '../i18n/LanguageContext.jsx';

// Shell order = visual distance from the centre. Family reads as "close",
// an event you both happened to attend reads as "far".
const SHELL_ORDER = ['family', 'identity', 'spiritual', 'enmity', 'other'];
const SHELL_RADIUS = (shell) => 70 + shell * 62;

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

/** Builds a small { nodes, links } graph: `centerId` plus its direct neighbours only. */
function buildLocalGraph(centerId, lang) {
  const centerEn = nodeById.get(centerId);
  if (!centerEn) return null;

  const neighbourInfo = new Map(); // id -> { shell }
  const links = [];
  for (const { link, other, dir } of adjacency.get(centerId) || []) {
    const group = EDGE_TYPES[link.type]?.group;
    const shell = Math.max(0, SHELL_ORDER.indexOf(group));
    const prev = neighbourInfo.get(other);
    if (!prev || shell < prev.shell) neighbourInfo.set(other, { shell });
    const { label, variation } = localizeEdgeLabel(link, lang);
    links.push({ source: centerId, target: other, type: link.type, label, variation, dir, disputed: !!link.disputed });
  }

  // Fibonacci-sphere placement, one sphere radius per shell.
  const byShell = new Map();
  for (const [id, info] of neighbourInfo) (byShell.get(info.shell) || byShell.set(info.shell, []).get(info.shell)).push(id);
  const positions = new Map([[centerId, { x: 0, y: 0, z: 0 }]]);
  for (const [shell, ids] of byShell) {
    const radius = SHELL_RADIUS(shell);
    const n = ids.length;
    ids.forEach((id, i) => {
      const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * Math.PI * (3 - Math.sqrt(5)); // golden angle
      positions.set(id, { x: Math.cos(theta) * r * radius, y: y * radius * 0.72, z: Math.sin(theta) * r * radius });
    });
  }

  const nodes = [centerId, ...neighbourInfo.keys()].map((id) => {
    const en = nodeById.get(id);
    const loc = localizeNode(en, lang);
    const p = positions.get(id);
    return {
      id, name: loc.name, devanagari: loc.devanagari, category: en.category,
      degree: en.degree, disputed: en.disputed, isCenter: id === centerId,
      x: p.x, y: p.y, z: p.z, fx: p.x, fy: p.y, fz: p.z,
    };
  });
  return { nodes, links };
}

export default function OrbitView({ centerId, onClose, onOpenPanel, theme }) {
  const { lang, t, edgeDirection } = useLang();
  const [history, setHistory] = useState([centerId]);
  const current = history[history.length - 1];
  const fgRef = useRef();
  const wrapRef = useRef(null);
  const { width, height } = useElementSize(wrapRef);

  // Selecting a fresh starting node (from the side panel) resets the trail.
  useEffect(() => { setHistory([centerId]); }, [centerId]);

  const graphData = useMemo(() => buildLocalGraph(current, lang), [current, lang]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fgRef.current?.cameraPosition({ x: 40, y: 90, z: 260 }, { x: 0, y: 0, z: 0 }, 800);
    }, 60);
    return () => clearTimeout(timer);
  }, [current]);

  const nodeThreeObject = useCallback((node) => {
    const group = new THREE.Group();
    const color = CATEGORIES[node.category]?.[theme] || (theme === 'dark' ? '#26C6A6' : '#00897B');
    const radius = node.isCenter ? 15 : 5 + Math.min(Math.sqrt(node.degree || 1), 7);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 28, 20),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: node.isCenter ? 0.75 : 0.22, roughness: 0.45, metalness: 0.15,
      }),
    );
    group.add(mesh);

    if (node.disputed) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius + 2.5, 0.5, 8, 40),
        new THREE.MeshBasicMaterial({ color: theme === 'dark' ? '#f4ecd8' : '#2a2118', transparent: true, opacity: 0.5 }),
      );
      ring.rotation.x = Math.PI / 2.4;
      group.add(ring);
    }

    const label = new SpriteText(node.name);
    label.color = node.isCenter ? '#FFD24D' : (theme === 'dark' ? '#F4ECD8' : '#2A2118');
    label.textHeight = node.isCenter ? 6.5 : 4.4;
    label.fontFace = 'Inter, system-ui, sans-serif';
    label.fontWeight = node.isCenter ? '700' : '500';
    label.position.set(0, radius + (node.isCenter ? 9 : 6.5), 0);
    group.add(label);
    return group;
  }, [theme]);

  const linkColor = useCallback((l) => EDGE_TYPES[l.type]?.color || '#888', []);
  const linkWidth = useCallback((l) => (l.disputed ? 0.6 : 1.4), []);
  const linkLabelHtml = useCallback((l) => {
    const [outPhrase] = edgeDirection(l.type);
    return `<div class="tt"><span class="tt-rel">${outPhrase}</span><div class="tt-sub">${l.label}</div></div>`;
  }, [edgeDirection]);

  const goTo = useCallback((id) => {
    if (id === current) return;
    setHistory((h) => [...h, id]);
  }, [current]);

  const goToCrumb = useCallback((i) => setHistory((h) => h.slice(0, i + 1)), []);

  if (!graphData) return null;
  const centerLocalized = localizeNode(nodeById.get(current), lang);

  return (
    <div className="orbit-view">
      <div className="orbit-view__bar">
        <div className="orbit-view__crumbs">
          {history.map((id, i) => {
            const isLast = i === history.length - 1;
            const name = localizeNode(nodeById.get(id), lang).name;
            return (
              <span key={id + i} className="orbit-view__crumb-wrap">
                {i > 0 && <span className="orbit-view__crumb-sep">›</span>}
                <button className={`orbit-view__crumb ${isLast ? 'is-current' : ''}`}
                  onClick={() => goToCrumb(i)} disabled={isLast}>{name}</button>
              </span>
            );
          })}
        </div>
        <div className="orbit-view__actions">
          <button className="btn btn--small" onClick={() => onOpenPanel(current)}>{t('viewDetails')}</button>
          <button className="icon-btn" onClick={onClose} aria-label={t('close')}>×</button>
        </div>
      </div>

      <div ref={wrapRef} className="orbit-view__canvas">
        <ForceGraph3D
          ref={fgRef}
          width={width}
          height={height}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkOpacity={0.7}
          linkDirectionalArrowLength={(l) => (EDGE_TYPES[l.type]?.directed ? 6 : 0)}
          linkDirectionalArrowRelPos={0.92}
          linkDirectionalArrowColor={linkColor}
          linkLabel={linkLabelHtml}
          onNodeClick={(node) => goTo(node.id)}
          enableNodeDrag={false}
          // The underlying renderer otherwise drops any click preceded by even
          // a sub-pixel pointer move — which is normal noise from trackpads
          // and some mice, not an intentional camera drag — so real clicks on
          // a neighbour were silently swallowed without this.
          clickAfterDrag={true}
          cooldownTime={2000}
        />
      </div>

      <p className="orbit-view__hint muted small">{t('orbitHint', { name: centerLocalized.name })}</p>
    </div>
  );
}
