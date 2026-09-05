import React from 'react';
import './Gauge.css';

export default function Gauge({ 
  value, min, max, thresholds, 
  unit, label, size = 100, 
  stale, disabled 
}) {
  const isInvalid = disabled || value === null || value === undefined || Number.isNaN(value);
  const safeValue = isInvalid ? min : Math.min(Math.max(value, min), max);
  
  // Calculate percentage for the semi-circle (0 to 1)
  const range = max - min;
  const percent = range > 0 ? (safeValue - min) / range : 0;
  
  // SVG arc calculation (semi-circle)
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (percent * circumference);
  
  // Determine color based on thresholds
  let color = 'var(--safe)';
  let statusText = 'Normal';
  
  if (!isInvalid && thresholds) {
    if (value >= thresholds.EMERGENCY) { color = 'var(--danger)'; statusText = 'Emergency'; }
    else if (value >= thresholds.WARNING) { color = 'var(--warning)'; statusText = 'Warning'; }
    else if (value >= thresholds.CAUTION) { color = 'var(--caution)'; statusText = 'Caution'; }
  }

  if (isInvalid) {
    color = 'var(--border)';
    statusText = '--';
  }

  // Formatting value
  const displayValue = isInvalid ? '--' : (Number.isInteger(value) ? value : value.toFixed(1));

  // Determine icon/color for label
  const getIconColor = (lbl) => {
    switch(lbl.toLowerCase()) {
      case 'gas': return 'var(--safe)';
      case 'temperature': return 'var(--caution)';
      case 'humidity': return 'var(--blue)';
      case 'impact': return 'var(--text-secondary)';
      default: return 'var(--text-secondary)';
    }
  };
  const iconColor = getIconColor(label);

  return (
    <div className={`semi-gauge-container ${stale ? 'stale' : ''}`} style={{ width: size }}>
      <div className="semi-gauge-header">
        <span className="semi-gauge-icon" style={{ borderColor: iconColor }}></span>
        <span className="semi-gauge-label">{label}</span>
      </div>
      
      <div className="semi-gauge-svg-wrap" style={{ height: size / 2 }}>
        <svg width={size} height={size / 2} viewBox={`0 0 ${size} ${size / 2}`}>
          {/* Background Arc */}
          <path 
            d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress Arc */}
          <path 
            d={`M ${strokeWidth/2} ${size/2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth/2} ${size/2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="semi-gauge-value-wrap">
          <div className="semi-gauge-value">{displayValue}</div>
          <div className="semi-gauge-unit">{unit}</div>
        </div>
      </div>
      
      <div className="semi-gauge-status" style={{ color: !isInvalid && statusText === 'Normal' ? 'var(--safe)' : color }}>
        {statusText}
      </div>
    </div>
  );
}
