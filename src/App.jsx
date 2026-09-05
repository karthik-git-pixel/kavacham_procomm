import React, { useEffect, useState } from 'react';
import { connectMQTT, disconnectMQTT } from './state/mqttClient';
import { useNodeStore, useEventStore } from './state/nodeStore';
import WorkerCard from './components/WorkerCard';
import ZoneMap from './components/ZoneMap';
import EventTimeline from './components/EventTimeline';
import ConnectionStrip from './components/ConnectionStrip';
import SeverityBanner from './components/SeverityBanner';
import './App.css'; // Might need to clear default styles if they conflict, but I'll use inline or just a simple dashboard class
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
        
        <ConnectionStrip status={mqttStatus} />
      {maxAlert > 0 && <SeverityBanner level={maxAlert} />}

      <div className="dashboard-content">
        
        {/* Left Column: Worker Cards */}
        <div className="left-column">
          <WorkerCard node={nodes['WSN-1']} />
          <WorkerCard node={nodes['WSN-2']} />
          <WorkerCard node={nodes['WSN-3']} />
        </div>

        {/* Center/Right Column: Map and Timeline */}
        <div className="right-column">
          <div className="map-container">
            <ZoneMap />
          </div>
          <div className="timeline-container">
            <EventTimeline events={events} />
          </div>
        </div>

      </div>
    </div>
    </>
  );
}

export default App;