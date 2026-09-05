import React from 'react';
import { useNodeStore } from '../state/nodeStore';
import './ZoneMap.css';

export default function ZoneMap() {
  const nodes = useNodeStore();
  
  const getNodeState = (id) => {
    const node = nodes[id];
    if (!node || node.link === 'offline') return { color: 'var(--rule)', pulse: false, opacity: 0.3 };
    
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
    <div className="zone-map">
      <svg width="100%" height="200" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
        {/* Gateway */}
        <rect x="180" y="10" width="40" height="20" fill="var(--ink-soft)" rx="2" />
        <text x="200" y="24" fill="#fff" fontSize="10" textAnchor="middle" fontWeight="bold">GW</text>

        {/* Shaft lines */}
        <g stroke="var(--rule)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* Main shaft */}
          <line x1="200" y1="30" x2="200" y2="180" />
          {/* Shaft A (W1) */}
          <line x1="200" y1="80" x2="100" y2="80" />
          {/* Shaft B (W2) */}
          <line x1="200" y1="120" x2="300" y2="120" />
          {/* Deep Shaft (W3) */}
          <line x1="200" y1="180" x2="140" y2="180" />
        </g>

        {/* Labels */}
        <g fill="var(--ink-soft)" fontSize="10" fontWeight="600">
          <text x="130" y="70">Shaft A</text>
          <text x="270" y="110">Shaft B</text>
          <text x="160" y="170">Deep Shaft</text>
        </g>

        {/* Mesh Links */}
        <g strokeWidth="2" strokeDasharray="4 4" fill="none">
          {/* W1 to GW */}
          <line x1="200" y1="30" x2="200" y2="80" stroke={w1.color} opacity={w1.opacity === 1 ? getOpacity(w1.rssi) : 0.3} />
          <line x1="200" y1="80" x2="110" y2="80" stroke={w1.color} opacity={w1.opacity === 1 ? getOpacity(w1.rssi) : 0.3} />
          
          {/* W2 to GW */}
          <line x1="200" y1="30" x2="200" y2="120" stroke={w2.color} opacity={w2.opacity === 1 ? getOpacity(w2.rssi) : 0.3} />
          <line x1="200" y1="120" x2="290" y2="120" stroke={w2.color} opacity={w2.opacity === 1 ? getOpacity(w2.rssi) : 0.3} />
          
          {/* W3 to GW (2 hops) */}
          <line x1="200" y1="30" x2="200" y2="180" stroke={w3.color} opacity={w3.opacity === 1 ? getOpacity(w3.rssi) : 0.3} />
          <line x1="200" y1="180" x2="150" y2="180" stroke={w3.color} opacity={w3.opacity === 1 ? getOpacity(w3.rssi) : 0.3} />
        </g>

        {/* Nodes */}
        {/* W1 */}
        {w1.pulse && <circle cx="100" cy="80" r="16" fill={w1.color} opacity="0.2" className="node-pulse" />}
        <circle cx="100" cy="80" r="6" fill={w1.color} opacity={w1.opacity} />
        
        {/* W2 */}
        {w2.pulse && <circle cx="300" cy="120" r="16" fill={w2.color} opacity="0.2" className="node-pulse" />}
        <circle cx="300" cy="120" r="6" fill={w2.color} opacity={w2.opacity} />

        {/* W3 */}
        {w3.pulse && <circle cx="140" cy="180" r="16" fill={w3.color} opacity="0.2" className="node-pulse" />}
        <circle cx="140" cy="180" r="6" fill={w3.color} opacity={w3.opacity} />
      </svg>
    </div>
  );
}
