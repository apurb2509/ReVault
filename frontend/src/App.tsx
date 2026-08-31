import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/layout/Sidebar';
import { Landing } from './pages/Landing';
import { AboutReVault } from './pages/AboutReVault';
import { Dashboard } from './pages/Dashboard';
import { ThoughtTraces } from './pages/ThoughtTraces';
import { BatchReport } from './pages/BatchReport';
import { Invoices } from './pages/Invoices';
import { PTPTracker } from './pages/PTPTracker';
import { VoiceReplay } from './pages/VoiceReplay';
import { AuditTrail } from './pages/AuditTrail';
import { ConfigPanel } from './pages/ConfigPanel';
import { Simulator } from './pages/Simulator';
import { Campaigns } from './pages/Campaigns';
import { RecoveryPortal } from './pages/RecoveryPortal';
import { PitchGuide } from './pages/PitchGuide';
import { useSupabaseRealtime } from './hooks/useSupabaseRealtime';

/**
 * On first visit (fresh browser session), redirect to /landing.
 * After that, go straight to dashboard.
 */
const FirstVisitRedirect: React.FC = () => {
  const alreadySeen = sessionStorage.getItem('rv_seen_landing');
  if (!alreadySeen) {
    sessionStorage.setItem('rv_seen_landing', '1');
    return <Navigate to="/landing" replace />;
  }
  return <Dashboard />;
};

/* ── Shell: the app with sidebar + main content ─── */
const Shell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.innerWidth < 1024,
  );
  const [overlayVisible, setOverlayVisible] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024) {
        setSidebarCollapsed(false);
        setOverlayVisible(false);
      } else if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
        setOverlayVisible(false);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const toggleSidebar = () => {
    const isSmall = window.innerWidth < 768;
    setSidebarCollapsed(prev => {
      const next = !prev;
      if (isSmall) setOverlayVisible(!next);
      return next;
    });
  };

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setSidebarCollapsed(true);
      setOverlayVisible(false);
    }
  };

  return (
    <div className="app-shell">
      {/* Mobile overlay — dims content when sidebar open */}
      {overlayVisible && (
        <div
          className="sidebar-overlay visible"
          onClick={closeSidebarOnMobile}
        />
      )}

      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

      <div className="main-area">
        {/* Topbar — shows on mobile/tablet for hamburger menu */}
        <div className="topbar">
          <button
            id="mobile-menu-btn"
            className="topbar-menu-btn"
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <Menu size={20} />
          </button>
          <div className="topbar-title">ReVault</div>
        </div>

        {/* Main page content */}
        <main className="main-content" onClick={closeSidebarOnMobile}>
          <Routes>
            <Route path="/"          element={<FirstVisitRedirect />} />
            <Route path="/about"     element={<AboutReVault />} />
            <Route path="/traces"    element={<ThoughtTraces />} />
            <Route path="/batch"     element={<BatchReport />} />
            <Route path="/invoices"  element={<Invoices />} />
            <Route path="/ptp"       element={<PTPTracker />} />
            <Route path="/voice"     element={<VoiceReplay />} />
            <Route path="/audit"     element={<AuditTrail />} />
            <Route path="/settings"  element={<ConfigPanel />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/pitch"     element={<PitchGuide />} />
            <Route path="*" element={
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Page not found — use the sidebar to navigate.
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
};

/* ── Root component ────────────────────────────── */
const App: React.FC = () => {
  useSupabaseRealtime();
  const location = useLocation();

  // Landing & Recovery Portal are full-screen, no sidebar shell
  if (location.pathname === '/landing') {
    return (
      <Routes>
        <Route path="/landing" element={<Landing />} />
      </Routes>
    );
  }

  if (location.pathname === '/recovery') {
    return (
      <Routes>
        <Route path="/recovery" element={<RecoveryPortal />} />
      </Routes>
    );
  }

  return <Shell />;
};

export default App;
