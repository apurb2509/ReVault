import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Calendar, TrendingUp } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useAppSelector, useAppDispatch } from '../hooks/useStore';
import { fetchPtpRecords, type PTPRecord } from '../store/slices/ptpSlice';

type DayType = 'empty' | 'normal' | 'overdue' | 'today' | 'upcoming';

interface CalendarDay {
  day: number;
  type: DayType;
  ptpIds: string[];
}

const buildCalendar = (records: PTPRecord[]): CalendarDay[] => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayNum = now.getDate();

  const ptpByDay: Record<number, string[]> = {};
  for (const r of records) {
    const d = new Date(r.promised_date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const dn = d.getDate();
      if (!ptpByDay[dn]) ptpByDay[dn] = [];
      ptpByDay[dn].push(r.id);
    }
  }

  const cells: CalendarDay[] = [];
  for (let i = 0; i < firstDay; i++) cells.push({ day: 0, type: 'empty', ptpIds: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const ids = ptpByDay[d] ?? [];
    let type: DayType = ids.length ? 'normal' : 'normal';
    if (ids.length) {
      if (d < todayNum) type = 'overdue';
      else if (d === todayNum) type = 'today';
      else type = 'upcoming';
    }
    cells.push({ day: d, type: ids.length ? type : 'normal', ptpIds: ids });
  }
  return cells;
};

const STATUS_CFG = {
  ACTIVE:   { label: 'Active',   badgeClass: 'badge-info'    },
  FULFILLED:{ label: 'Kept ✓',   badgeClass: 'badge-success' },
  BROKEN:   { label: 'Broken ✗', badgeClass: 'badge-danger'  },
} as const;

const SRC_LABEL = { 
  WHATSAPP_CHAT: 'WhatsApp', 
  EMAIL: 'Email', 
  VOICE_CALL_TRANSCRIPT: 'Voice',
  SMS: 'SMS'
} as const;

export const PTPTracker: React.FC = () => {
  const dispatch = useAppDispatch();
  const { records, status } = useAppSelector(state => state.ptp);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPtpRecords());
    }
  }, [status, dispatch]);

  const keptCount = records.filter(r => r.status === 'FULFILLED').length;
  const brokenCount = records.filter(r => r.status === 'BROKEN').length;
  const activeCount = records.filter(r => r.status === 'ACTIVE').length;
  const totalPromised = records.reduce((s, r) => s + r.promised_amount, 0);

  const calendar  = buildCalendar(records);
  const keptRate  = ((keptCount / (keptCount + brokenCount || 1)) * 100).toFixed(0);

  const dayPTPs = selectedDay
    ? records.filter(r => new Date(r.promised_date).getDate() === selectedDay)
    : [];

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const now = new Date();
  const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <>
      <Header
        title="Promise-to-Pay Tracker"
        subtitle="NLP-extracted payment commitments — PTP kept/broken rate tracking"
      />

      {/* Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '24px' }}>
        {[
          { label: 'Total PTPs',        value: String(records.length),         color: 'var(--accent-bright)' },
          { label: 'Active',            value: String(activeCount),            color: 'var(--cyan)' },
          { label: 'Kept Rate',         value: `${keptRate}%`,                 color: 'var(--success)' },
          { label: 'Broken',            value: String(brokenCount),            color: 'var(--danger)' },
          { label: 'Total Promised',    value: `₹${(totalPromised / 100).toLocaleString('en-IN')}`, color: 'var(--warning)' },
        ].map(s => (
          <div key={s.label} className="metric-card">
            <div className="metric-label">{s.label}</div>
            <div className="metric-value" style={{ fontSize: '24px', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Calendar */}
        <div className="panel" style={{ flex: 1 }}>
          <div className="panel-header">
            <div>
              <div className="panel-title"><Calendar size={16} style={{ display: 'inline', marginRight: '6px' }} />{monthName}</div>
              <div className="panel-title-sub">Click a highlighted day to see PTPs</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)'  }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} /> Overdue</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--warning)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} /> Today</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} /> Upcoming</span>
            </div>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '6px' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          <div className="ptp-calendar">
            {calendar.map((cell, i) => (
              <div
                key={i}
                className={`ptp-day ${cell.type}${cell.ptpIds.length ? ' has-ptp' : ''}`}
                onClick={() => cell.ptpIds.length ? setSelectedDay(cell.day === selectedDay ? null : cell.day) : undefined}
                style={{ outline: selectedDay === cell.day ? '2px solid var(--accent)' : 'none' }}
              >
                {cell.day > 0 && (
                  <>
                    <span className="ptp-day-num">{cell.day}</span>
                    {cell.ptpIds.length > 0 && <span className="ptp-day-dot" />}
                  </>
                )}
              </div>
            ))}
          </div>

          {dayPTPs.length > 0 && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                PTPs due on {selectedDay} {now.toLocaleString('en-IN', { month: 'short' })}
              </div>
              {dayPTPs.map(r => (
                <div key={r.id} style={{ padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{r.customer_id}</span>
                    <span className={`badge ${STATUS_CFG[r.status]?.badgeClass}`}>{STATUS_CFG[r.status]?.label}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    ₹{(r.promised_amount / 100).toLocaleString('en-IN')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                    Extracted from {SRC_LABEL[r.extraction_source]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All records list */}
        <div className="panel" style={{ width: '380px', flexShrink: 0 }}>
          <div className="panel-header">
            <div className="panel-title"><TrendingUp size={16} style={{ display: 'inline', marginRight: '6px' }} />All PTPs</div>
          </div>
          {records.map(r => (
            <div key={r.id} style={{ padding: '12px', border: '1px solid var(--border-default)', borderRadius: '10px', marginBottom: '10px', background: 'rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{r.customer_id}</div>
                </div>
                <span className={`badge ${STATUS_CFG[r.status]?.badgeClass}`}>{STATUS_CFG[r.status]?.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px' }}>₹{(r.promised_amount / 100).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    via {SRC_LABEL[r.extraction_source]} · {r.commitment_confidence} confidence
                  </div>
                </div>
                {r.status === 'BROKEN' && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <XCircle size={18} color="var(--danger)" />
                  </div>
                )}
                {r.status === 'FULFILLED' && <CheckCircle size={18} color="var(--success)" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
