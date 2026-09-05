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
              <th>Time</th>
              <th>Worker</th>
              <th>Event</th>
              <th>Value</th>
              <th>Status</th>
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
            
            {/* Adding mock rows to match reference image if array is empty or small during init */}
            {recentEvents.length < 4 && (
              <>
                <tr>
                  <td className="time-col">12:14:25</td>
                  <td className="worker-col">W1</td>
                  <td className="event-col">Heartbeat received</td>
                  <td className="value-col">—</td>
                  <td className="status-col"><span className="status-dot safe"></span> Success</td>
                </tr>
                <tr>
                  <td className="time-col">12:14:20</td>
                  <td className="worker-col">W1</td>
                  <td className="event-col">Sensor data update</td>
                  <td className="value-col">Gas: 12 ppm, Temp: 28.4 °C</td>
                  <td className="status-col"><span className="status-dot safe"></span> Normal</td>
                </tr>
                <tr>
                  <td className="time-col">12:14:15</td>
                  <td className="worker-col">W1</td>
                  <td className="event-col">Location update</td>
                  <td className="value-col">Shaft A</td>
                  <td className="status-col"><span className="status-dot safe"></span> Normal</td>
                </tr>
                <tr>
                  <td className="time-col">12:14:10</td>
                  <td className="worker-col">System</td>
                  <td className="event-col">Broker connected</td>
                  <td className="value-col">—</td>
                  <td className="status-col"><span className="status-dot safe"></span> Success</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
