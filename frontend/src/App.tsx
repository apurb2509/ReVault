import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Invoices } from './pages/Invoices';
import { AuditTrail } from './pages/AuditTrail';
import { useReVaultSocket } from './hooks/useReVaultSocket';

const App: React.FC = () => {
  // Initialize WebSocket connection and feed global state
  useReVaultSocket();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="*" element={<div style={{ padding: '24px' }}>Page under construction.</div>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
