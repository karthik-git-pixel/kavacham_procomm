import React from 'react';
import './SystemSummary.css';

export default function SystemSummary({ nodes }) {
  const nodesArray = Object.values(nodes);
  const total = nodesArray.length;
  const online = nodesArray.filter(n => (Date.now() - (n.lastSeen || 0)) < 5000).length;
  const offline = total - online;
  const alerts = nodesArray.filter(n => n.alert > 0).length;

  const isOperational = alerts === 0 && online === total;

  return (
    <div className="glass-card system-summary">
      <h3 className="card-title">System Status</h3>
      
      <div className={`status-header ${isOperational ? 'operational' : 'issue'}`}>
        <span className="status-dot"></span>
        {isOperational ? 'All Systems Operational' : 'Issues Detected'}
      </div>

      <div className="summary-grid">
        <div className="summary-item">
          <div className="summary-icon blue">👥</div>
          <div className="summary-data">
            <div className="summary-value">{total}</div>
            <div className="summary-label">Total Workers</div>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon green">👤</div>
          <div className="summary-data">
            <div className="summary-value">{online}</div>
            <div className="summary-label">Online</div>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon red">👤</div>
          <div className="summary-data">
            <div className="summary-value">{offline}</div>
            <div className="summary-label">Offline</div>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon orange">⚠️</div>
          <div className="summary-data">
            <div className="summary-value">{alerts}</div>
            <div className="summary-label">Active Alerts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
