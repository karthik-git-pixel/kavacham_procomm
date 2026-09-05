import React, { useRef, useState, useEffect, useId } from 'react';
import Icon from './Icon';
import { nodeSeverity, toneFor, relTime } from '../state/severity';
import { rssiQuality } from '../state/signal';
import './ZoneMap.css';

const VW = 480;
const VH = 300;

/** Fixed survey layout of the shaft network. */
const GATEWAY = { x: 240, y: 40 };

const LAYOUT = {
  'WSN-1': { x: 108, y: 112, zone: 'Shaft A', labelAt: 'left' },
  'WSN-2': { x: 384, y: 168, zone: 'Shaft B', labelAt: 'right' },
  'WSN-3': { x: 176, y: 252, zone: 'Deep Shaft', labelAt: 'below' },
};

const SHAFTS = [
  { from: [240, 52], to: [240, 252], axis: 'v' },   // main vertical shaft
  { from: [240, 112], to: [108, 112], axis: 'h' },  // Shaft A
  { from: [240, 168], to: [384, 168], axis: 'h' },  // Shaft B
  { from: [240, 252], to: [176, 252], axis: 'h' },  // Deep Shaft
];

export default function ZoneMap({ nodes, selectedId, onSelect, now }) {
  const [view, setView] = useState('3d');
  const [hovered, setHovered] = useState(null);
  const [isFull, setIsFull] = useState(false);
  const wrapRef = useRef(null);
  const gradId = useId();

  useEffect(() => {
    const onChange = () => setIsFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else wrapRef.current?.requestFullscreen?.().catch(() => {});
  };

  const entries = Object.entries(LAYOUT)
    .map(([id, pos]) => ({ id, pos, node: nodes[id] }))
    .filter((e) => e.node);

  const activeId = hovered || selectedId;
  const active = entries.find((e) => e.id === activeId);

  const iso = view === '3d';
  // Vertical compression alone reads as depth. A skew here would tilt the main
  // shaft off vertical, which looks like a rendering fault rather than 3D.
  const sceneTransform = iso ? 'translate(0 8) scale(1 0.86)' : undefined;

  return (
    <section className="zmap card" ref={wrapRef} aria-label="Underground shaft network">
      <header className="card-head">
        <div>
          <h2 className="card-title">Underground Shaft Network</h2>
          <p className="card-sub">Live position and status of every node · click a node to inspect</p>
        </div>

        <div className="zmap-controls">
          <div className="segmented" role="group" aria-label="Map projection">
            <button type="button" aria-pressed={view === '2d'} onClick={() => setView('2d')}>
              <Icon name="grid" size={13} /> 2D
            </button>
            <button type="button" aria-pressed={view === '3d'} onClick={() => setView('3d')}>
              <Icon name="cube" size={13} /> 3D
            </button>
          </div>
          <button
            type="button"
            className="btn btn-icon"
            onClick={toggleFullscreen}
            aria-label={isFull ? 'Exit full screen' : 'View map full screen'}
            title={isFull ? 'Exit full screen' : 'Full screen'}
          >
            <Icon name={isFull ? 'collapse' : 'expand'} size={15} />
          </button>
        </div>
      </header>

      <div className={`zmap-stage ${iso ? 'is-iso' : 'is-flat'}`}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          className="zmap-svg"
          role="img"
          aria-label={`Shaft map showing ${entries.length} worker nodes`}
          onClick={(e) => {
            if (e.target === e.currentTarget) onSelect(null);
          }}
        >
          <defs>
            <radialGradient id={`${gradId}-bg`} gradientUnits="userSpaceOnUse" cx={VW / 2} cy={VH * 0.42} r={VW * 0.72}>
              <stop offset="0%" stopColor="var(--map-bg-1)" />
              <stop offset="100%" stopColor="var(--map-bg-2)" />
            </radialGradient>
          </defs>

          {/* Overdrawn well past the viewBox: the SVG is letterboxed inside a
              wider stage, and a rect stopping at the viewBox edge leaves a
              visible seam against the container. */}
          <rect x={-VW} y={-VH} width={VW * 3} height={VH * 3} fill={`url(#${gradId}-bg)`} />

          {/* Survey grid: only in the flat schematic, where measuring matters. */}
          {!iso && (
            <g className="zmap-grid">
              {Array.from({ length: Math.floor(VW / 40) + 1 }, (_, i) => (
                <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2={VH} />
              ))}
              {Array.from({ length: Math.floor(VH / 40) + 1 }, (_, i) => (
                <line key={`h${i}`} x1="0" y1={i * 40} x2={VW} y2={i * 40} />
              ))}
            </g>
          )}

          <g transform={sceneTransform}>
            {/* Rock floor plate, sells the depth in the isometric view. */}
            {iso && <ellipse cx="240" cy="268" rx="215" ry="34" className="zmap-floor" />}

            {/* Each tunnel is drawn as a tube: a dark casing, the bore, then a
                highlight along the lit edge. Gradients are avoided here — a
                straight line has a zero-area bounding box, which collapses an
                objectBoundingBox gradient to nothing. */}
            {SHAFTS.map((s, i) => {
              const [x1, y1] = s.from;
              const [x2, y2] = s.to;
              const off = s.axis === 'v' ? { x: -2.5, y: 0 } : { x: 0, y: -2.5 };
              return (
                <g key={`sh${i}`}>
                  {iso && (
                    <line
                      x1={x1 + (s.axis === 'v' ? 3 : 0)} y1={y1 + (s.axis === 'v' ? 0 : 4)}
                      x2={x2 + (s.axis === 'v' ? 3 : 0)} y2={y2 + (s.axis === 'v' ? 0 : 4)}
                      className="zmap-shaft-ext"
                    />
                  )}
                  <line x1={x1} y1={y1} x2={x2} y2={y2} className="zmap-shaft-casing" />
                  <line x1={x1} y1={y1} x2={x2} y2={y2} className="zmap-shaft-bore" />
                  {iso && (
                    <line
                      x1={x1 + off.x} y1={y1 + off.y}
                      x2={x2 + off.x} y2={y2 + off.y}
                      className="zmap-shaft-lit"
                    />
                  )}
                </g>
              );
            })}

            {/* Radio links: opacity carries link quality, dash animates traffic. */}
            {entries.map(({ id, pos, node }) => {
              const q = rssiQuality(node.rssi);
              const offline = node.link === 'offline';
              return (
                <line
                  key={`lnk${id}`}
                  x1={GATEWAY.x} y1={GATEWAY.y}
                  x2={pos.x} y2={pos.y}
                  className={`zmap-link ${offline ? 'is-down' : ''}`}
                  style={{ opacity: offline ? 0.12 : 0.18 + q.bars * 0.13 }}
                />
              );
            })}

            {/* Gateway */}
            <g className="zmap-gw">
              <rect x={GATEWAY.x - 24} y={GATEWAY.y - 16} width="48" height="30" rx="6" />
              <text x={GATEWAY.x} y={GATEWAY.y + 4} textAnchor="middle">GW</text>
            </g>

            {/* Nodes */}
            {entries.map(({ id, pos, node }) => {
              const sev = nodeSeverity(node);
              const offline = node.link === 'offline';
              const tone = offline ? 'offline' : toneFor(sev.level);
              const isSelected = selectedId === id;
              const alerting = !offline && sev.level >= 1;

              return (
                <g
                  key={id}
                  className={`zmap-node ${isSelected ? 'is-selected' : ''} ${offline ? 'is-offline' : ''}`}
                  style={{ color: `var(--${tone}-solid, var(--${tone}))` }}
                  transform={`translate(${pos.x} ${pos.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.label} in ${node.zone}, ${offline ? 'offline' : ['normal', 'caution', 'warning', 'emergency'][sev.level]}`}
                  onClick={() => onSelect(isSelected ? null : id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(isSelected ? null : id);
                    }
                  }}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered((h) => (h === id ? null : h))}
                  onFocus={() => setHovered(id)}
                  onBlur={() => setHovered((h) => (h === id ? null : h))}
                >
                  {alerting && <circle r="9" className="zmap-ping" />}
                  {isSelected && <circle r="15" className="zmap-select-ring" />}
                  <circle r="12" className="zmap-hit" />
                  <circle r="6.5" className="zmap-core" />
                  <circle r="6.5" className="zmap-core-edge" />
                </g>
              );
            })}

            {/* Zone name plates */}
            {entries.map(({ id, pos, node }) => {
              const dx = pos.labelAt === 'left' ? -14 : pos.labelAt === 'right' ? 14 : 0;
              const dy = pos.labelAt === 'below' ? 30 : -18;
              const anchor = pos.labelAt === 'left' ? 'end' : pos.labelAt === 'right' ? 'start' : 'middle';
              const w = id.length * 6.1 + 16;
              const x = anchor === 'end' ? pos.x + dx - w : anchor === 'start' ? pos.x + dx : pos.x - w / 2;
              return (
                <g key={`lbl${id}`} className="zmap-plate" pointerEvents="none">
                  <rect x={x} y={pos.y + dy - 11} width={w} height="19" rx="9.5" />
                  <text x={x + w / 2} y={pos.y + dy + 2} textAnchor="middle">{id}</text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Detail card for the hovered or selected node. */}
        {active && (
          <div className="zmap-tip" role="status">
            <div className="zmap-tip-head">
              <span
                className="dot dot-lg"
                style={{
                  color:
                    active.node.link === 'offline'
                      ? 'var(--offline-solid)'
                      : `var(--${toneFor(nodeSeverity(active.node).level)}-solid, var(--${toneFor(nodeSeverity(active.node).level)}))`,
                }}
              />
              <strong>{active.node.label}</strong>
              <span className="zmap-tip-zone">{active.node.zone}</span>
            </div>
            <dl className="zmap-tip-grid">
              <div><dt>Status</dt><dd>{active.node.link === 'offline' ? 'Offline' : ['Normal', 'Caution', 'Warning', 'Emergency'][nodeSeverity(active.node).level]}</dd></div>
              <div><dt>Signal</dt><dd>{active.node.rssi == null ? '--' : `${Math.round(active.node.rssi)} dBm`}</dd></div>
              <div><dt>Distance</dt><dd>{active.node.distance == null ? '--' : `${active.node.distance} m`}</dd></div>
              <div><dt>Seen</dt><dd>{relTime(active.node.lastSeen, now)}</dd></div>
            </dl>
          </div>
        )}

        <ul className="zmap-legend">
          <li><span className="dot" style={{ color: 'var(--safe-solid)' }} /> Normal</li>
          <li><span className="dot" style={{ color: 'var(--caution-solid)' }} /> Caution</li>
          <li><span className="dot" style={{ color: 'var(--danger-solid)' }} /> Emergency</li>
          <li><span className="dot" style={{ color: 'var(--offline-solid)' }} /> Offline</li>
          <li><span className="legend-line" /> Tunnel</li>
        </ul>
      </div>
    </section>
  );
}
