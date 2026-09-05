import React from 'react';
import { useAnimatedValue } from '../state/useAnimatedValue';
import './Gauge.css';

export function valueToColor(v, max) {
  const p = Math.min(Math.max(v / max, 0), 1);
  const hue = 120 * Math.pow(1 - p, 1.6);
  const sat = 55 + p * 35;
  const lum = 38 + p * 8;
  return `hsl(${hue} ${sat}% ${lum}%)`;
}

export default function Gauge({ 
  value = 0, 
  min = 0, 
  max = 100, 
  thresholds = {}, 
  unit = '', 
  label = '', 
  size = 240, 
  variant = 'primary', 
  bandMode = false, 
  stale = false, 
  disabled = false,
  peakHold = null
}) {
  const animatedValue = useAnimatedValue(disabled ? min : (Number.isFinite(value) ? value : min));
  const safeValue = Number.isFinite(value) ? value : min;
  
  // Calculate angle based on min/max constraints
  const getAngle = (v) => {
    const clamped = Math.max(min, Math.min(v, max));
    return -135 + ((clamped - min) / (max - min)) * 270;
  };

  const currentAngle = getAngle(animatedValue);
  const peakAngle = peakHold ? getAngle(peakHold.value) : -135;

  const color = disabled ? 'var(--rule)' : valueToColor(safeValue, max);
  const radius = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  
  // Create arc path
  const describeArc = (startAngle, endAngle, r) => {
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  // State text determination
  let stateText = 'SAFE';
  let level = 0;
  if (!disabled) {
    if (bandMode) {
      if (safeValue < thresholds.NORMAL_LOW || safeValue > thresholds.NORMAL_HIGH) {
        stateText = safeValue > thresholds.IMPACT ? 'EMERGENCY' : 'WARNING';
        level = safeValue > thresholds.IMPACT ? 3 : 2;
      }
    } else {
      if (safeValue >= thresholds.EMERGENCY) { stateText = 'EMERGENCY'; level = 3; }
      else if (safeValue >= thresholds.WARNING) { stateText = 'WARNING'; level = 2; }
      else if (safeValue >= thresholds.CAUTION) { stateText = 'CAUTION'; level = 1; }
    }
  }

  const isCompact = variant === 'compact';
  
  return (
    <div className={`gauge-container ${disabled ? 'disabled' : ''} ${stale ? 'stale' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background Track */}
        <path d={describeArc(-135, 135, radius)} fill="none" stroke="var(--card-sunk)" strokeWidth={size * 0.08} strokeLinecap="round" />
        
        {/* Value Arc */}
        {!disabled && (
          <path 
            d={describeArc(-135, currentAngle, radius)} 
            fill="none" 
            stroke={color} 
            strokeWidth={size * 0.08} 
            strokeLinecap="round" 
            style={level === 3 ? { filter: 'drop-shadow(0 0 8px var(--danger-hot))' } : {}}
          />
        )}

        {/* Hatching for disabled socket state */}
        {disabled && (
          <rect x="0" y="0" width="100%" height="100%" fill="url(#hatch)" />
        )}
        
        {/* Ticks and Redline */}
        {!isCompact && !disabled && (
          <>
            <path 
              d={describeArc(getAngle(thresholds.EMERGENCY || max * 0.8), 135, radius)} 
              fill="none" 
              stroke="var(--danger)" 
              strokeWidth={size * 0.08} 
              opacity="0.25"
              strokeDasharray="4 4"
            />
            {/* Minimal implementation of ticks for brevity */}
          </>
        )}

        {/* Peak hold pip */}
        {!isCompact && peakHold && !disabled && (
          <path 
            d={describeArc(peakAngle - 1, peakAngle + 1, radius)}
            fill="none"
            stroke="var(--danger-hot)"
            strokeWidth={size * 0.12}
          />
        )}

        {/* Needle */}
        <g transform={`rotate(${currentAngle}, ${cx}, ${cy})`}>
          <polygon points={`${cx - 4},${cy} ${cx + 4},${cy} ${cx},${cy - radius + 10}`} fill={color} />
          <circle cx={cx} cy={cy} r="6" fill={color} />
        </g>
      </svg>
      
      <div className="gauge-readout" style={{ color: color }}>
        <div className={`readout-value tabular-nums ${isCompact ? 'compact' : ''}`}>
          {disabled ? '—' : Math.round(animatedValue * 10) / 10}
        </div>
        <div className="readout-unit">
          {disabled ? label : unit}
          {stale && !disabled && <span className="stale-label"> (held)</span>}
        </div>
        {!isCompact && !disabled && (
          <div className="readout-state">{stateText}</div>
        )}
      </div>

      {disabled && (
        <svg width="0" height="0">
          <pattern id="hatch" width="4" height="4" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="4" stroke="var(--ink)" strokeWidth="1" opacity="0.08" />
          </pattern>
        </svg>
      )}
    </div>
  );
}
