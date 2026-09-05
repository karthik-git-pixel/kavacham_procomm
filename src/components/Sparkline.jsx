import React from 'react';
import './Sparkline.css';

export default function Sparkline({ data = [], width = 100, height = 30, color = 'var(--ink)', disabled = false, min = 0, max = 100, threshold = null }) {
  if (disabled) {
    return (
      <svg width={width} height={height} className="sparkline disabled">
        <line x1="0" y1={height} x2={width} y2={height} stroke="var(--rule)" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    );
  }

  if (data.length === 0) {
    return <svg width={width} height={height} className="sparkline empty" />;
  }

  // Normalize data points
  const points = data.map((val, idx) => {
    const x = (idx / (Math.max(29, data.length - 1))) * width;
    const clamped = Math.max(min, Math.min(val, max));
    const y = height - ((clamped - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');

  const thresholdY = threshold !== null ? height - ((threshold - min) / (max - min)) * height : null;

  return (
    <svg width={width} height={height} className="sparkline">
      {threshold !== null && (
        <line x1="0" y1={thresholdY} x2={width} y2={thresholdY} stroke="var(--danger)" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      )}
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
