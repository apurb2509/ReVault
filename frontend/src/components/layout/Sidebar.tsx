import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Zap, Info, LayoutDashboard, Brain, BarChart3,
  FileText, CalendarCheck, Mic, Settings, ChevronLeft,
  FlaskConical, Megaphone, Link2, Presentation, ShieldCheck,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useStore';

const NAV_SECTIONS_STATIC = [
  {
    label: 'Platform',
    items: [
      { id: 'about',     to: '/about',    icon: Info,            label: 'About ReVault' },
      { id: 'dashboard', to: '/',         icon: LayoutDashboard, label: 'Command Center' },
    ],
  },
  {
    label: 'AI Agents',
    items: [
      { id: 'traces',    to: '/traces',   icon: Brain,           label: 'Agent Traces' },
      { id: 'invoices',  to: '/invoices', icon: FileText,        label: 'B2B Invoices' },
      { id: 'ptp',       to: '/ptp',      icon: CalendarCheck,   label: 'PTP Tracker' },
      { id: 'voice',     to: '/voice',    icon: Mic,             label: 'Voice Replay' },
    ],
  },
  {
    label: 'Recovery Tools',
    items: [
      { id: 'simulator', to: '/simulator',  icon: FlaskConical,  label: 'Webhook Sandbox' },
      { id: 'campaigns', to: '/campaigns',  icon: Megaphone,     label: 'Campaigns' },
      { id: 'recovery',  to: '/recovery',   icon: Link2,         label: 'Recovery Portal' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'batch',     to: '/batch',    icon: BarChart3,       label: 'Batch Report' },
      { id: 'audit',     to: '/audit',    icon: ShieldCheck,     label: 'Audit Trail' },
      { id: 'pitch',     to: '/pitch',    icon: Presentation,    label: 'Pitch Guide' },
      { id: 'settings',  to: '/settings', icon: Settings,        label: 'Configuration' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const recovered = useAppSelector(state => state.metrics.recoveredAmount);
  const ptpActive = useAppSelector(state => state.metrics.ptpActive);
  const b2bActive = useAppSelector(state => state.metrics.b2bActive);

  // Map dynamic counts to sections
  const sectionsWithBadges = NAV_SECTIONS_STATIC.map(section => ({
    ...section,
    items: section.items.map(item => {
      let badge: number | null = null;
      if (item.id === 'invoices' && b2bActive > 0) badge = b2bActive;
      if (item.id === 'ptp' && ptpActive > 0) badge = ptpActive;
      return { ...item, badge };
    }),
  }));

  return (
    <>
      {/* Sidebar panel */}
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div 
            className="logo-mark" 
            onClick={() => window.location.href = '/landing'} 
            style={{ cursor: 'pointer' }}
          >
            <div className="logo-icon">
              <img src="/src/assets/ReVault_logo.png" alt="ReVault" style={{ width: '24px', height: 'auto' }} />
            </div>
            <div>
              <div className="logo-text">Re<span>Vault</span></div>
            </div>
          </div>
          <div className="logo-tagline">AI Revenue Recovery · Powered by Gemini</div>
        </div>

        <nav className="sidebar-nav">
          {sectionsWithBadges.map(section => (
            <div key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map(({ id, to, icon: Icon, label, badge }) => (
                <NavLink
                  key={id}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                >
                  <Icon size={15} className="nav-icon" />
                  {label}
                  {badge !== null && <span className="nav-badge">{badge}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="recovery-ticker">
            <div className="recovery-ticker-label">⚡ Session Recovered</div>
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
