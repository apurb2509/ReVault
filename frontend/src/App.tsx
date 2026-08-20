import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  LayoutDashboard,
  Activity,
  FileText,
  MessageSquare,
  Settings,
  Phone,
  Search,
  CheckCircle
} from 'lucide-react';
import './index.css';

// Type definitions
type AgentStatus = 'active' | 'idle' | 'processing';

interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  icon: React.ReactNode;
}

interface FeedEvent {
  id: string;
  timestamp: string;
  module: string;
  content: React.ReactNode;
  type: 'success' | 'warning' | 'danger' | 'info';
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recoveredAmount] = useState(493200);
  const [events] = useState<FeedEvent[]>([
    {
      id: '1',
      timestamp: new Date().toLocaleTimeString(),
      module: 'ABANDONMENT_HUNTER',
      type: 'success',
      content: (
        <>
          <div>Detected: Order #ORD123 (₹2,499) abandoned 31 min ago</div>
          <div className="text-secondary" style={{ marginTop: '4px' }}>→ Gemini classified: PAYMENT_FAILED (BANK_DOWN, conf: 0.91)</div>
          <div className="text-secondary" style={{ marginTop: '4px' }}>→ Created Payment Link: plink_abc123</div>
          <div className="text-secondary" style={{ marginTop: '4px' }}>→ WhatsApp sent to +91-98XXXXXXXX</div>
          <div style={{ marginTop: '8px', fontWeight: 600 }}>Status: DELIVERED ✓</div>
        </>
      )
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toLocaleTimeString(),
      module: 'DEGRADATION_WATCHDOG',
      type: 'warning',
      content: (
        <>
          <div>Detected 34% drop in SBI UPI success rate</div>
          <div className="text-secondary" style={{ marginTop: '4px' }}>→ Classified: BANK_INFRA_DOWN</div>
          <div className="text-secondary" style={{ marginTop: '4px' }}>→ Switched checkout nudge to HDFC Cards</div>
        </>
      )
    }
  ]);

  const agents: Agent[] = [
    { id: '1', name: 'Degradation Watchdog', status: 'active', icon: <Activity size={20} /> },
    { id: '2', name: 'Abandonment Hunter', status: 'active', icon: <Search size={20} /> },
    { id: '3', name: 'Subscription Rescue', status: 'idle', icon: <CheckCircle size={20} /> },
    { id: '4', name: 'Receivables Pursuit', status: 'processing', icon: <FileText size={20} /> },
    { id: '5', name: 'Mandate Sequencer', status: 'idle', icon: <Settings size={20} /> },
    { id: '6', name: 'VoiceIQ Agent', status: 'active', icon: <Phone size={20} /> },
    { id: '7', name: 'PTP Tracker', status: 'idle', icon: <MessageSquare size={20} /> },
  ];

  useEffect(() => {
    // Mock WebSocket connection
    const socket = io('http://localhost:8000', { path: '/ws' });
    
    socket.on('connect', () => {
      console.log('Connected to ReVault backend');
    });

    socket.on('message', (data: string) => {
      try {
        const parsed = JSON.parse(data);
        console.log('Received WebSocket message:', parsed);
        // Handle incoming events and update state
      } catch (e) {
        console.error('Failed to parse WebSocket message');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <Activity color="#3b82f6" size={28} />
          <div>ReVault<span>.</span></div>
        </div>
        
        <div className="nav-links">
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}
          >
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'traces' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('traces'); }}
          >
            <Search size={20} /> Agent Thought Traces
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('invoices'); }}
          >
            <FileText size={20} /> B2B Invoices
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'ptp' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('ptp'); }}
          >
            <MessageSquare size={20} /> PTP Tracker
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('voice'); }}
          >
            <Phone size={20} /> Voice Replay
          </a>
          <a 
            href="#" 
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('settings'); }}
          >
            <Settings size={20} /> Configuration
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h1 className="header-title">Recovery Command Center</h1>
            <div className="header-subtitle">Real-time revenue protection across all channels</div>
          </div>
          <div>
            <span className="badge badge-success" style={{ padding: '8px 12px', fontSize: '14px' }}>
              <span className="status-dot active" style={{ display: 'inline-block', marginRight: '8px' }}></span>
              System Active
            </span>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-title">Recovered This Session</div>
            <div className="metric-value">₹{(recoveredAmount / 100).toLocaleString('en-IN')}</div>
            <div className="metric-trend trend-up">
              ↑ 12% vs last 24h
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-title">At-Risk Revenue Detected</div>
            <div className="metric-value">₹8,42,750</div>
            <div className="metric-trend trend-down">
              ↓ 5% vs last 24h
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Recovery Rate</div>
            <div className="metric-value">58.5%</div>
            <div className="metric-trend trend-up">
              ↑ 2.4% vs baseline
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-title">Compliance Violations</div>
            <div className="metric-value">0</div>
            <div className="metric-trend" style={{ color: 'var(--text-secondary)' }}>
              100% compliant execution
            </div>
          </div>
        </div>

        {/* Agents Status */}
        <h2 className="panel-title" style={{ marginBottom: '16px' }}>Active Agents</h2>
        <div className="agent-cards">
          {agents.map(agent => (
            <div className="agent-card" key={agent.id}>
              <div className="agent-icon">{agent.icon}</div>
              <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-status">
                  <div className={`status-dot ${agent.status}`}></div>
                  <span style={{ textTransform: 'capitalize' }}>{agent.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Panels */}
        <div className="content-grid">
          {/* Real-time Feed */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Real-time Event Feed</h2>
              <button className="btn btn-primary">Run Simulation Batch</button>
            </div>
            
            <div className="feed-list">
              {events.map(event => (
                <div className={`feed-item ${event.type}`} key={event.id}>
                  <div className="feed-time">[{event.timestamp}]</div>
                  <div className="feed-module">{event.module.replace('_', ' ')}</div>
                  <div className="feed-content">
                    {event.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HITL Queue */}
          <div className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Human-in-the-Loop Queue</h2>
            </div>
            
            <div className="feed-list">
              <div className="feed-item danger">
                <div className="feed-time">10 mins ago</div>
                <div className="feed-module">FRAUD SUSPECTED</div>
                <div className="feed-content">
                  Payment #pay_123 flagged as FRAUD_SUSPECTED. Auto-action blocked by Compliance Engine.
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>Review</button>
                    <button className="btn" style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}>Dismiss</button>
                  </div>
                </div>
              </div>
              <div className="feed-item warning">
                <div className="feed-time">1 hour ago</div>
                <div className="feed-module">BROKEN PROMISE</div>
                <div className="feed-content">
                  Invoice #INV-204 from TechCorp (₹82,700). Promised Friday, payment not received.
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '12px' }}>Escalate</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
