import React from 'react';
import { useNodeStore } from '../state/nodeStore';
import './ZoneMap.css';

export default function ZoneMap() {
  const nodes = useNodeStore();
  
  const getNodeState = (id) => {
    const node = nodes[id];
    if (!node || node.link === 'offline') return { color: 'var(--offline)', pulse: false, opacity: 0.3 };
    
    const colors = ['var(--safe)', 'var(--caution)', 'var(--warning)', 'var(--danger)'];
    const color = colors[node.alert || 0];
    const pulse = node.alert >= 1;
    return { color, pulse, opacity: 1, rssi: node.rssi };
  };

  const w1 = getNodeState('WSN-1');
  const w2 = getNodeState('WSN-2');
  const w3 = getNodeState('WSN-3');

  const getOpacity = (rssi) => {
    if (!rssi) return 0.2;
    const mapped = Math.max(0.1, Math.min(1, (rssi + 100) / 50));
    return mapped;
  };

  return (
    <div className="zone-map-container">
      <div className="zone-map-header">
        <div className="header-titles">
          <h3>Underground Shaft Network</h3>
          <p>Real-time location and status of all workers</p>
        </div>
        <div className="header-controls">
          <div className="view-toggle">
            <button className="toggle-btn">2D View</button>
            <button className="toggle-btn active">3D View</button>
          </div>
          <button className="icon-btn">⛶</button>
        </div>
      </div>
      
      <div className="zone-map-content">
        <svg width="100%" height="250" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid meet">
          {/* Background decoration to match the 3D vibe if needed, but we keep SVG for now */}
          {/* Gateway */}
          <rect x="180" y="20" width="40" height="24" fill="var(--text)" rx="4" />
          <text x="200" y="36" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">GW</text>

          {/* Shaft lines */}
          <g stroke="var(--border)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Main shaft */}
            <line x1="200" y1="44" x2="200" y2="200" />
            {/* Shaft A (W1) */}
            <line x1="200" y1="100" x2="80" y2="100" />
            {/* Shaft B (W2) */}
            <line x1="200" y1="140" x2="320" y2="140" />
            {/* Deep Shaft (W3) */}
            <line x1="200" y1="200" x2="160" y2="200" />
          </g>

          {/* Labels - with styled badges like reference */}
          <g>
            <rect x="60" y="88" width="50" height="18" fill="var(--text)" rx="9"/>
            <text x="85" y="100" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">Shaft A</text>
            
            <rect x="290" y="128" width="50" height="18" fill="var(--text)" rx="9"/>
            <text x="315" y="140" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">Shaft B</text>
            
            <rect x="130" y="210" width="60" height="18" fill="var(--text)" rx="9"/>
            <text x="160" y="222" fill="#fff" fontSize="9" textAnchor="middle" fontWeight="600">Deep Shaft</text>
          </g>

          {/* Nodes */}
          {/* W1 */}
          {w1.pulse && <circle cx="100" cy="100" r="16" fill={w1.color} opacity="0.2" className="node-pulse" />}
          <circle cx="100" cy="100" r="6" fill={w1.color} opacity={w1.opacity} />
          
          {/* W2 */}
          {w2.pulse && <circle cx="300" cy="140" r="16" fill={w2.color} opacity="0.2" className="node-pulse" />}
          <circle cx="300" cy="140" r="6" fill={w2.color} opacity={w2.opacity} />

          {/* W3 */}
          {w3.pulse && <circle cx="180" cy="200" r="16" fill={w3.color} opacity="0.2" className="node-pulse" />}
          <circle cx="180" cy="200" r="6" fill={w3.color} opacity={w3.opacity} />
        </svg>

        {/* Legend overlay */}
        <div className="map-legend">
          <div className="legend-item">
            <span className="legend-dot active"></span> Active Worker
          </div>
          <div className="legend-item">
            <span className="legend-dot inactive"></span> Inactive Worker
          </div>
          <div className="legend-item">
            <span className="legend-line"></span> Tunnel / Shaft
          </div>
        </div>
      </div>
    </div>
  );
}
