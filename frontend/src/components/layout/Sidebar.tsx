import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, FileText, MessageSquare, Phone, Settings, Activity } from 'lucide-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="logo">
        <Activity color="#3b82f6" size={28} />
        <div>ReVault<span>.</span></div>
      </div>
      
      <div className="nav-links">
        <NavLink to="/" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        <NavLink to="/invoices" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <FileText size={20} /> B2B Invoices
        </NavLink>
        <NavLink to="/audit" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <Search size={20} /> Audit Trail
        </NavLink>
        <NavLink to="/ptp" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <MessageSquare size={20} /> PTP Tracker
        </NavLink>
        <NavLink to="/voice" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <Phone size={20} /> Voice Replay
        </NavLink>
        <NavLink to="/settings" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <Settings size={20} /> Configuration
        </NavLink>
      </div>
    </aside>
  );
};
