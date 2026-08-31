import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export const BatchReport: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/api/batch/history')
      .then(res => res.json())
      .then(data => {
        setRuns(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: 20 }}>Loading batch history...</div>;

  const latest = runs[0];

  const downloadCSV = (run: any) => {
    // Export the entire database for analysis as requested
    window.location.href = `http://localhost:8000/api/batch/export-full`;
  };

  return (
    <div className="panel" style={{ marginTop: '24px' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title"><Activity size={18} style={{ display: 'inline', marginRight: '8px' }}/> Batch Simulation & Measurement Engine</div>
          <div className="panel-title-sub">Real-time performance metrics against synthetic datasets</div>
        </div>
      </div>

      {latest ? (
        <div style={{ padding: '20px' }}>
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-label">Total Records Processed</div>
              <div className="metric-value">{latest.total_records}</div>
            </div>
            <div className="metric-card" style={{ borderLeft: '4px solid var(--danger)'}}>
              <div className="metric-label">Compliance Violations</div>
              <div className="metric-value" style={{ color: 'var(--danger)' }}>{latest.compliance_violations}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target: 0</div>
            </div>
            <div className="metric-card" style={{ borderLeft: '4px solid var(--success)'}}>
              <div className="metric-label">Escalation Accuracy (Fraud/Opt-out)</div>
              <div className="metric-value" style={{ color: 'var(--success)' }}>
                {latest.escalations_total > 0 ? ((latest.escalations_correct / latest.escalations_total) * 100).toFixed(0) : 'N/A'}%
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Classifier Accuracy</div>
              <div className="metric-value">{latest.classifier_accuracy ?? 'N/A'}%</div>
            </div>
          </div>

          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
            Batch Execution History
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '8px' }}>Run ID</th>
                <th style={{ padding: '8px' }}>Timestamp</th>
                <th style={{ padding: '8px' }}>Records</th>
                <th style={{ padding: '8px' }}>Violations</th>
                <th style={{ padding: '8px' }}>Escalation Rate</th>
                <th style={{ padding: '8px' }}>Action</th>
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
                    {run.escalations_total > 0 ? ((run.escalations_correct / run.escalations_total) * 100).toFixed(0) : '0'}%
                  </td>
                  <td style={{ padding: '8px' }}>
                    <button 
                      onClick={() => downloadCSV(run)}
                      style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    >
                      Export CSV
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>
          No batch runs found. Run `python batch_runner.py` in the backend.
        </div>
      )}
    </div>
  );
};
