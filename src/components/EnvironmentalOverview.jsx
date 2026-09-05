import React from 'react';
import './SystemSummary.css'; // Reuse grid styles

export default function EnvironmentalOverview({ nodes }) {
  const nodesArray = Object.values(nodes);
  
  // Calculate averages
  let gasSum = 0, tempSum = 0, humidSum = 0, impactSum = 0;
  let gasCount = 0, tempCount = 0, humidCount = 0, impactCount = 0;

  nodesArray.forEach(n => {
    if (n.gas_ppm !== null && n.gas_ppm !== undefined) { gasSum += n.gas_ppm; gasCount++; }
    if (n.temp !== null && n.temp !== undefined) { tempSum += n.temp; tempCount++; }
    if (n.humidity !== null && n.humidity !== undefined) { humidSum += n.humidity; humidCount++; }
    if (n.fall !== null && n.fall !== undefined) { impactSum += n.fall; impactCount++; }
  });

  const avgGas = gasCount ? Math.round(gasSum / gasCount) : '--';
  const avgTemp = tempCount ? (tempSum / tempCount).toFixed(1) : '--';
  const avgHumid = humidCount ? Math.round(humidSum / humidCount) : '--';
  const avgImpact = impactCount ? Math.round(impactSum / impactCount) : '--';

  return (
    <div className="glass-card system-summary">
      <h3 className="card-title">Environmental Overview</h3>
      
      <div className="summary-grid" style={{ marginTop: '8px' }}>
        <div className="summary-item">
          <div className="summary-icon green">🍃</div>
          <div className="summary-data">
            <div className="summary-value">{avgGas} <span style={{fontSize:'12px', fontWeight:'normal'}}>ppm</span></div>
            <div className="summary-label">Gas (Avg)</div>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon orange">🌡️</div>
          <div className="summary-data">
            <div className="summary-value">{avgTemp} <span style={{fontSize:'12px', fontWeight:'normal'}}>°C</span></div>
            <div className="summary-label">Temperature</div>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon blue">💧</div>
          <div className="summary-data">
            <div className="summary-value">{avgHumid} <span style={{fontSize:'12px', fontWeight:'normal'}}>%</span></div>
            <div className="summary-label">Humidity</div>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon" style={{ backgroundColor: 'rgba(51, 65, 85, 0.1)', color: 'var(--text)' }}>⚡</div>
          <div className="summary-data">
            <div className="summary-value">{avgImpact} <span style={{fontSize:'12px', fontWeight:'normal'}}>g</span></div>
            <div className="summary-label">Impact (Avg)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
