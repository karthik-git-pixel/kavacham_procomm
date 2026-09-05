import React from 'react';
import './EventTimeline.css';

export default function EventTimeline({ events = [] }) {
  // Take last 10 events for the list
  const recentEvents = [...events].sort((a, b) => b.time - a.time).slice(0, 10);
  
  // Format helpers
  const formatTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  const formatWorker = (nodeId) => {
    if (!nodeId) return 'System';
    return nodeId.replace('WSN-', 'W');
  };

  return (
    <div className="event-timeline-container">
      <div className="timeline-header">
        <h3 className="timeline-title">Event Timeline (Last 60s)</h3>
        <div className="timeline-controls">
          <span className="auto-scroll-label">Auto-scroll</span>
          <label className="switch">
            <input type="checkbox" defaultChecked />
            <span className="slider round"></span>
          </label>
        </div>
      </div>
      
      <div className="timeline-table-wrap">
        <table className="timeline-table">
          <thead>
            <tr>
              <th className="time-col">Time</th>
              <th className="worker-col">Worker</th>
              <th className="event-col">Event</th>
              <th className="value-col">Value</th>
              <th className="status-col">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.length === 0 ? (
              <tr>
                <td colSpan="5" className="empty-state">No events recorded.</td>
              </tr>
            ) : (
              recentEvents.map((ev, i) => {
                const statusType = ev.type === 'error' || ev.type === 'offline' ? 'danger' : (ev.type === 'warn' ? 'warning' : 'safe');
                const statusText = ev.type === 'error' ? 'Error' : (ev.type === 'offline' ? 'Offline' : (ev.type === 'warn' ? 'Warning' : (ev.type === 'connected' ? 'Success' : 'Normal')));
                
                return (
                  <tr key={i}>
                    <td className="time-col">{formatTime(ev.time)}</td>
                    <td className="worker-col">{formatWorker(ev.node)}</td>
                    <td className="event-col">{ev.desc}</td>
                    <td className="value-col">{ev.value || '—'}</td>
                    <td className="status-col">
                      <span className={`status-dot ${statusType}`}></span>
                      {statusText}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
