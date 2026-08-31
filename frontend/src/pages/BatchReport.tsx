import React, { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';

export const BatchReport: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/batch/history`)
      .then(res => res.json())
      .then(data => {
        setRuns(data);
      });
  }, []);

  const triggerBatch = async () => {
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/batch/trigger`, { method: 'POST' });
    alert("Batch triggered. The backend is running it asynchronously. Refresh in a few seconds.");
  }

  const latest = runs[0];

  return (
    <>
      <Header
        title="Batch Simulation Report"
        subtitle="Real-time performance metrics against historical databases"
      />

      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-primary" onClick={triggerBatch}>Trigger New Batch Run</button>
      </div>

      {latest && (
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-label">Total Records Processed</div>
            <div className="metric-value">{latest.total_records}</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--danger)'}}>
            <div className="metric-label">Compliance Violations</div>
            <div className="metric-value" style={{ color: 'var(--danger)' }}>{latest.compliance_violations}</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--success)'}}>
            <div className="metric-label">Total Recovered</div>
            <div className="metric-value" style={{ color: 'var(--success)' }}>
              ₹{(latest.total_recovered / 100).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Recovery Rate</div>
            <div className="metric-value">{latest.recovery_rate}%</div>
          </div>
        </div>
      )}

      <div className="panel" style={{ padding: 20 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
          Batch Execution History
        </div>
        {runs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>No batch runs found.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px' }}>Run ID</th>
                <th style={{ padding: '8px' }}>Started</th>
                <th style={{ padding: '8px' }}>Records</th>
                <th style={{ padding: '8px' }}>Violations</th>
                <th style={{ padding: '8px' }}>Recovery Rate</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '8px', fontFamily: 'monospace', color: 'var(--accent)' }}>{run.id.split('-')[0]}</td>
                  <td style={{ padding: '8px' }}>{new Date(run.started_at).toLocaleString()}</td>
                  <td style={{ padding: '8px' }}>{run.total_records}</td>
                  <td style={{ padding: '8px', color: run.compliance_violations > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {run.compliance_violations}
                  </td>
                  <td style={{ padding: '8px' }}>
                    {run.recovery_rate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};
