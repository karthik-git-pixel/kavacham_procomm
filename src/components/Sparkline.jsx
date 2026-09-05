import React, { useId } from 'react';
import './Sparkline.css';

/**
 * Compact trend line. A single number tells you where a sensor is; the
 * sparkline tells you where it is heading, which is what turns a reading into
 * a decision.
 */
export default function Sparkline({
  data = [],
  width = 120,
  height = 28,
  color = 'var(--info)',
  min = 0,
  max = 100,
  disabled = false,
  area = true,
}) {
  const gradientId = useId();
  const clean = data.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));

  if (disabled || clean.length < 2) {
    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="spark spark-empty" aria-hidden="true">
        <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 4" />
      </svg>
    );
  }

  // Framed on the data's own range rather than the full sensor scale, so a
  // slow climb is actually visible. A floor on the span (a share of the full
  // scale) stops sensor noise from being magnified into a dramatic swing.
  const dataMin = Math.min(...clean);
  const dataMax = Math.max(...clean);
  const minSpan = (max - min) * minSpanRatio;
  const mid = (dataMin + dataMax) / 2;
  const half = Math.max((dataMax - dataMin) / 2, minSpan / 2);
  const lo = mid - half;
  const hi = mid + half;

  const span = hi - lo || 1;
  const stepX = width / (clean.length - 1);
  const yOf = (v) => height - 2 - ((Math.min(hi, Math.max(lo, v)) - lo) / span) * (height - 4);

  const points = clean.map((v, i) => [i * stepX, yOf(v)]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const fill = `${line} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="spark"
      aria-hidden="true"
    >
      {area && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fill} fill={`url(#${gradientId})`} stroke="none" />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
}
