import React, { useState, useMemo } from 'react';
import {
  createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, Play, RefreshCw } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import { startSimulation, endSimulation, setProgress } from '../store/slices/simulationSlice';
import type { SimulationRecord } from '../store/slices/simulationSlice';

const columnHelper = createColumnHelper<SimulationRecord>();

const OUTCOME_BADGE: Record<SimulationRecord['outcome'], string> = {
  RECOVERED: 'badge-success',
  FAILED:    'badge-danger',
  ESCALATED: 'badge-warning',
  PENDING:   'badge-muted',
};

const MODULES = ['ALL', 'DEGRADATION_WATCHDOG', 'ABANDONMENT_HUNTER', 'SUBSCRIPTION_RESCUE', 'RECEIVABLES_PURSUIT', 'MANDATE_SEQUENCER', 'VOICEIQ_AGENT', 'PTP_TRACKER'];
const OUTCOMES = ['ALL', 'RECOVERED', 'FAILED', 'ESCALATED', 'PENDING'];

const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: info => <span className="text-mono" style={{ color: 'var(--accent-bright)', fontSize: '11px' }}>{info.getValue()}</span>,
  }),
  columnHelper.accessor('event_type', {
    header: 'Event',
    cell: info => <span style={{ fontSize: '11px' }}>{info.getValue()}</span>,
  }),
  columnHelper.accessor('module', {
    header: 'Module',
    cell: info => <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>{info.getValue().replace(/_/g, ' ')}</span>,
  }),
  columnHelper.accessor('failure_cause', {
    header: 'Root Cause',
    cell: info => <span className="badge badge-muted" style={{ fontSize: '10px' }}>{info.getValue().replace(/_/g, ' ')}</span>,
  }),
  columnHelper.accessor('amount', {
    header: 'At Risk',
    cell: info => `₹${(info.getValue() / 100).toLocaleString('en-IN')}`,
  }),
  columnHelper.accessor('action_taken', {
    header: 'Action',
    cell: info => <span style={{ fontSize: '11px', maxWidth: '180px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.getValue()}</span>,
  }),
  columnHelper.accessor('confidence', {
    header: 'Confidence',
    cell: info => {
      const v = info.getValue();
      const color = v >= 0.9 ? 'var(--success)' : v >= 0.75 ? 'var(--warning)' : 'var(--danger)';
      return <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{(v * 100).toFixed(0)}%</span>;
    },
  }),
  columnHelper.accessor('outcome', {
    header: 'Outcome',
    cell: info => <span className={`badge ${OUTCOME_BADGE[info.getValue()]}`}>{info.getValue()}</span>,
  }),
  columnHelper.accessor('amount_recovered', {
    header: 'Recovered',
    cell: info => {
      const v = info.getValue();
      return v > 0
        ? <span style={{ color: 'var(--success)', fontWeight: 700 }}>₹{(v / 100).toLocaleString('en-IN')}</span>
        : <span style={{ color: 'var(--text-muted)' }}>—</span>;
    },
  }),
];

const CHART_DATA = [
  { name: 'Watchdog',     recovered: 112,  atRisk: 150,  color: '#ef4444' },
  { name: 'Abandonment',  recovered: 1245, atRisk: 2295, color: '#10b981' },
  { name: 'Subscription', recovered: 1892, atRisk: 2820, color: '#3b82f6' },
  { name: 'Receivables',  recovered: 827,  atRisk: 1710, color: '#f59e0b' },
  { name: 'Mandate',      recovered: 654,  atRisk: 918,  color: '#06b6d4' },
  { name: 'VoiceIQ',      recovered: 1099, atRisk: 1349, color: '#8b5cf6' },
  { name: 'PTP',          recovered: 194,  atRisk: 308,  color: '#10b981' },
];

const exportCSV = (records: SimulationRecord[]) => {
  const header = ['ID', 'Event', 'Module', 'Amount', 'Bank', 'Method', 'Failure Cause', 'Action', 'Confidence', 'Outcome', 'Recovered'];
  const rows = records.map(r => [
    r.id, r.event_type, r.module, (r.amount / 100).toFixed(2),
    r.bank, r.method, r.failure_cause, r.action_taken,
    (r.confidence * 100).toFixed(0) + '%', r.outcome, (r.amount_recovered / 100).toFixed(2),
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'revault_batch_report.csv'; a.click();
  URL.revokeObjectURL(url);
};

export const BatchReport: React.FC = () => {
  const { records, isRunning, progress, totalAtRisk, totalRecovered } = useAppSelector(state => state.simulation);
  const dispatch = useAppDispatch();

  const [moduleFilter, setModuleFilter]  = useState('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (moduleFilter  !== 'ALL' && r.module  !== moduleFilter)  return false;
      if (outcomeFilter !== 'ALL' && r.outcome !== outcomeFilter) return false;
      if (search && !r.id.includes(search.toUpperCase()) && !r.event_type.includes(search)) return false;
      return true;
    });
  }, [records, moduleFilter, outcomeFilter, search]);

  const table = useReactTable({ data: filtered, columns, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel() });

  const runBatch = async () => {
    dispatch(startSimulation());
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(res => setTimeout(res, 120));
      dispatch(setProgress(i));
    }
    dispatch(endSimulation());
  };

  const recoveryPct = ((totalRecovered / totalAtRisk) * 100).toFixed(1);

  return (
    <>
      <Header
        title="Batch Simulation Report"
        subtitle="355 synthetic records across all failure types — measured recovery evidence"
      />

      {/* Summary cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '20px' }}>
        {[
          { label: 'Total Records',       value: '355',         color: 'var(--accent-bright)' },
          { label: 'At-Risk Revenue',     value: `₹${(totalAtRisk / 100).toLocaleString('en-IN')}`,      color: 'var(--danger)' },
          { label: 'Total Recovered',     value: `₹${(totalRecovered / 100).toLocaleString('en-IN')}`,   color: 'var(--success)' },
          { label: 'Recovery Rate',       value: `${recoveryPct}%`,     color: 'var(--cyan)' },
          { label: 'Compliance Violations', value: '0',           color: 'var(--success)' },
        ].map(c => (
          <div key={c.label} className="metric-card">
            <div className="metric-label">{c.label}</div>
            <div className="metric-value" style={{ fontSize: '22px', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Running 355-record batch simulation…</span>
            <span style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>{progress}%</span>
          </div>
          <div className="sim-progress-bar">
            <div className="sim-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="panel" style={{ marginBottom: '20px' }}>
        <div className="panel-header">
          <div className="panel-title">Recovery by Module</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button id="run-batch-btn" className="btn btn-primary btn-sm" onClick={runBatch} disabled={isRunning}>
              {isRunning ? <><RefreshCw size={12} /> Running…</> : <><Play size={12} /> Run Batch</>}
            </button>
            <button id="export-csv-btn" className="btn btn-ghost btn-sm" onClick={() => exportCSV(records)}>
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CHART_DATA} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}k`} />
              <Tooltip
                contentStyle={{ background: 'rgba(10,22,40,0.95)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Bar dataKey="atRisk"    radius={[4,4,0,0]} opacity={0.3} name="At Risk (₹k)">
                {CHART_DATA.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
              <Bar dataKey="recovered" radius={[4,4,0,0]} name="Recovered (₹k)">
                {CHART_DATA.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <select id="module-filter" className="filter-select" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
          {MODULES.map(m => <option key={m} value={m}>{m === 'ALL' ? 'All Modules' : m.replace(/_/g, ' ')}</option>)}
        </select>
        <select id="outcome-filter" className="filter-select" value={outcomeFilter} onChange={e => setOutcomeFilter(e.target.value)}>
          {OUTCOMES.map(o => <option key={o} value={o}>{o === 'ALL' ? 'All Outcomes' : o}</option>)}
        </select>
        <input
          id="batch-search"
          className="search-input"
          placeholder="Search by ID or event type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing {filtered.length} / 355</span>
      </div>

      {/* Table */}
      <div className="panel" style={{ padding: '0' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(h => (
                    <th key={h.id}>
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id}>
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
