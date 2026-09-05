import React from 'react';
import './EventTimeline.css';

export default function EventTimeline({ events = [] }) {
  // Take last 10 events for the list
  const recentEvents = [...events].sort((a, b) => b.time - a.time).slice(0, 10);
  
  return (
    <div className="event-timeline">
      <div className="timeline-header">Event Timeline (Last 60s)</div>
      <div className="timeline-strip">
        {/* Strip implementation simplified for brevity */}
        <div className="strip-track wsn-1">
          <span className="track-label">W1</span>
        </div>
        <div className="strip-track wsn-2">
          <span className="track-label">W2</span>
        </div>
        <div className="strip-track wsn-3">
          <span className="track-label">W3</span>
        </div>
      </div>
      <div className="timeline-list">
        {recentEvents.length === 0 ? (
          <div className="empty-events">No events in the last 60s.</div>
        ) : (
          recentEvents.map((ev, i) => (
            <div key={i} className="event-item">
              <span className="event-time">{new Date(ev.time).toLocaleTimeString()}</span>
              <span className="event-node">{ev.node}</span>
              <span className="event-desc">{ev.desc}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
