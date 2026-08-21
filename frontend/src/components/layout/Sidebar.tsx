import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Zap, Info, LayoutDashboard, Brain, BarChart3,
  FileText, CalendarCheck, Mic, Settings, ChevronLeft,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useStore';

const NAV_ITEMS = [
  { to: '/about',    icon: Info,           label: 'About ReVault',    badge: null },
  { to: '/',         icon: LayoutDashboard, label: 'Command Center',   badge: null },
  { to: '/traces',   icon: Brain,           label: 'Agent Traces',     badge: null },
  { to: '/batch',    icon: BarChart3,       label: 'Batch Report',     badge: null },
  { to: '/invoices', icon: FileText,        label: 'B2B Invoices',     badge: 3    },
  { to: '/ptp',      icon: CalendarCheck,   label: 'PTP Tracker',      badge: 2    },
  { to: '/voice',    icon: Mic,             label: 'Voice Replay',     badge: null },
  { to: '/audit',    icon: FileText,        label: 'Audit Trail',      badge: null },
  { to: '/settings', icon: Settings,        label: 'Configuration',    badge: null },
] as const;

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const recovered = useAppSelector(state => state.metrics.recoveredAmount);

  return (
    <>
      {/* Sidebar panel */}
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <div className="logo-icon">
              <Zap size={16} color="white" />
            </div>
            <div>
              <div className="logo-text">Re<span>Vault</span></div>
            </div>
          </div>
          <div className="logo-tagline">AI Revenue Recovery · Powered by Gemini</div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>
          {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={15} className="nav-icon" />
              {label}
              {badge !== null && <span className="nav-badge">{badge}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="recovery-ticker">
            <div className="recovery-ticker-label">↑ Recovered</div>
            <div className="recovery-ticker-value">
              ₹{(recovered / 100).toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle tab always pinned to left edge */}
      <button
        id="sidebar-toggle-btn"
        className={`sidebar-toggle${collapsed ? '' : ' open'}`}
        onClick={onToggle}
        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
        title={collapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        <ChevronLeft size={14} color="white" />
      </button>
    </>
  );
};
