import React from 'react';
import { useAppSelector } from '../../hooks/useStore';

export const LiveEventFeed: React.FC = () => {
  const events = useAppSelector(state => state.feed.events);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Real-time Event Feed</h2>
        <button className="btn btn-primary">Run Simulation Batch</button>
      </div>
      
      <div className="feed-list">
        {events.map(event => (
          <div className={`feed-item ${event.type}`} key={event.id}>
            <div className="feed-time">[{event.timestamp}]</div>
            <div className="feed-module">{event.module.replace(/_/g, ' ')}</div>
            <div className="feed-content">
              {event.content}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
