import React, { useEffect, useState } from 'react';
import { connectMQTT, disconnectMQTT } from './state/mqttClient';
import { useNodeStore, useEventStore } from './state/nodeStore';
import TopNav from './components/TopNav';
import WorkerCard from './components/WorkerCard';
import ZoneMap from './components/ZoneMap';
import EventTimeline from './components/EventTimeline';
import SystemSummary from './components/SystemSummary';
import EnvironmentalOverview from './components/EnvironmentalOverview';
import './App.css';
import helmetLogo from './assets/wowhelmet.png';

function App() {
  const [mqttStatus, setMqttStatus] = useState('connecting');
  const nodes = useNodeStore();
  const events = useEventStore();

  useEffect(() => {
    connectMQTT({
      onStatusChange: (status) => setMqttStatus(status)
    });

    return () => {
      disconnectMQTT();
    };
  }, []);

  // Compute highest severity across all nodes
  const nodesArray = Object.values(nodes);
  const maxAlert = Math.max(0, ...nodesArray.map(n => n.alert || 0));
  
  // Extract all events/history for timeline if needed, or maybe EventTimeline gets data differently.
  // Assuming EventTimeline and ZoneMap can just take nodes or don't need props if they use nodeStore internally.
  // Actually, ZoneMap takes nodes as prop or uses nodeStore itself? Let's check ZoneMap.jsx
  // I will pass nodes to it just in case, or it might just call useNodes().

  return (
    <>
      {mqttStatus === 'connecting' && (
        <div className="loading-screen">
          <img src={helmetLogo} alt="KAVACHAM Logo" className="loading-logo" />
          <div className="loading-title">KAVACHAM</div>
        </div>
      )}
      <div className="dashboard-container">
        
        <TopNav status={mqttStatus} />

      <div className="dashboard-content">
        
        {/* Left Column: Worker Cards */}
        <div className="left-column">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '16px', margin: 0 }}>Workers (3) <span style={{ color: 'var(--safe)', fontSize: '12px' }}>● LIVE</span></h2>
            <button style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', color: 'var(--blue)' }}>+ Add Worker</button>
          </div>
          <WorkerCard node={nodes['WSN-1']} />
          <WorkerCard node={nodes['WSN-2']} />
          <WorkerCard node={nodes['WSN-3']} />
        </div>

        {/* Center Column: Map and Timeline */}
        <div className="center-column">
          <div className="map-container glass-card">
            <ZoneMap />
          </div>
          <div className="timeline-container glass-card">
            <EventTimeline events={events} />
          </div>
        </div>

        {/* Right Column: Summaries */}
        <div className="right-column">
          <SystemSummary nodes={nodes} />
          <EnvironmentalOverview nodes={nodes} />
        </div>

      </div>
    </div>
    </>
  );
}

export default App;