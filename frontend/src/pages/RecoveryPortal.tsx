import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Zap, CheckCircle, AlertTriangle, CreditCard, Globe } from 'lucide-react';

type PaymentMethod = 'upi' | 'card' | 'netbanking';
type ScreenState = 'loading' | 'payment' | 'processing' | 'success' | 'error';

interface PaymentDetails {
  amount: number;
  failure_reason: string;
  merchant_name: string;
  merchant_logo_letter: string;
  event_id: string;
}

const UPI_APPS = [
  { id: 'gpay',   name: 'Google Pay',  color: '#4285F4', initial: 'G', bg: '#E8F0FE' },
  { id: 'phonepe', name: 'PhonePe',   color: '#5F259F', initial: 'P', bg: '#F3E8FF' },
  { id: 'paytm',  name: 'Paytm',      color: '#00B9F1', initial: 'T', bg: '#E0F7FF' },
  { id: 'bhim',   name: 'BHIM UPI',   color: '#0B6B3F', initial: 'B', bg: '#D6F5E3' },
];

const BANKS = [
  'HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank',
  'Kotak Mahindra Bank', 'Yes Bank', 'Punjab National Bank', 'Bank of Baroda',
];

const FAILURE_REASON_HUMAN: Record<string, string> = {
  INSUFFICIENT_FUNDS:  'Insufficient account balance',
  BANK_INFRA_DOWN:     'Bank network temporarily unavailable',
  EXPIRED_CARD:        'Payment card has expired',
  MANDATE_AUTH_DROP:   'Auto-debit mandate authorization failed',
  UNKNOWN:             'Payment could not be processed',
};

export const RecoveryPortal: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [screen, setScreen] = useState<ScreenState>('loading');
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [selectedUPI, setSelectedUPI] = useState<string | null>(null);
  const [cardNum, setCardNum] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVV, setCardCVV] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  const token = searchParams.get('token') || 'demo';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/recovery-portal/${token}`);
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        } else {
          // Use demo data when no real token provided
          setDetails({
            amount: 99900,
            failure_reason: 'INSUFFICIENT_FUNDS',
            merchant_name: 'ReVault Demo Merchant',
            merchant_logo_letter: 'R',
            event_id: token,
          });
        }
      } catch {
        setDetails({
          amount: 99900,
          failure_reason: 'INSUFFICIENT_FUNDS',
          merchant_name: 'ReVault Demo Merchant',
          merchant_logo_letter: 'R',
          event_id: token,
        });
      }
      setScreen('payment');
    };
    load();
  }, [token]);

  const handlePay = async () => {
    if (method === 'upi' && !selectedUPI) return;
    if (method === 'card' && (!cardNum || !cardExpiry || !cardCVV)) return;
    if (method === 'netbanking' && !selectedBank) return;

    setScreen('processing');
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/recovery-portal/${token}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, upi_app: selectedUPI, bank: selectedBank }),
      });
      // Always succeed for demo purposes
      await new Promise(r => setTimeout(r, 1800));
      setScreen('success');
    } catch {
      await new Promise(r => setTimeout(r, 1800));
      setScreen('success'); // Demo: always show success
    }
  };

  const fmt = (p: number) => `₹${(p / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="recovery-portal">
      {screen === 'loading' && (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--rzp-blue)', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} />
          <div>Loading secure payment page…</div>
        </div>
      )}

      {(screen === 'payment' || screen === 'processing') && details && (
        <div className="recovery-card">
          {/* Razorpay-style header */}
          <div className="recovery-rzp-header">
            <img src="/ReVault_logo.png" alt="ReVault Logo" style={{ width: 40, height: 40 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{details.merchant_name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Secured by Razorpay · ReVault Recovery</div>
            </div>
          </div>

          {/* Amount display */}
          <div className="recovery-amount-display">
            <div className="recovery-amount-label">Amount Due</div>
            <div className="recovery-amount-value">{fmt(details.amount)}</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 10 }}>
              <div className="recovery-failure-badge">
                <AlertTriangle size={11} />
                {FAILURE_REASON_HUMAN[details.failure_reason] || 'Payment failed'}
              </div>
            </div>
          </div>

          {/* Payment method tabs */}
          <div className="recovery-method-tabs">
            {([['upi', '📱 UPI Intent'], ['card', '💳 Card'], ['netbanking', '🏦 Net Banking']] as [PaymentMethod, string][]).map(([m, label]) => (
              <button
                key={m}
                id={`recovery-tab-${m}`}
                className={`recovery-tab ${method === m ? 'active' : ''}`}
                onClick={() => setMethod(m)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* UPI Panel */}
          {method === 'upi' && (
            <div className="upi-buttons">
              {UPI_APPS.map(app => (
                <button
                  key={app.id}
                  id={`upi-${app.id}`}
                  className="upi-btn"
                  style={{ borderColor: selectedUPI === app.id ? app.color : undefined }}
                  onClick={() => setSelectedUPI(app.id)}
                >
                  <div className="upi-icon" style={{ background: app.bg, color: app.color }}>{app.initial}</div>
                  <span>{app.name}</span>
                  {selectedUPI === app.id && <CheckCircle size={16} color={app.color} style={{ marginLeft: 'auto' }} />}
                </button>
              ))}
            </div>
          )}

          {/* Card Panel */}
          {method === 'card' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  id="recovery-card-num"
                  type="text" maxLength={19} placeholder="1234 5678 9012 3456"
                  className="input-field" style={{ width: '100%' }}
                  value={cardNum}
                  onChange={e => setCardNum(e.target.value.replace(/[^0-9]/g, '').replace(/(.{4})/g, '$1 ').trim())}
                />
                <CreditCard size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input id="recovery-card-exp" type="text" maxLength={5} placeholder="MM/YY" className="input-field" style={{ flex: 1 }}
                  value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} />
                <input id="recovery-card-cvv" type="password" maxLength={4} placeholder="CVV" className="input-field" style={{ flex: 1 }}
                  value={cardCVV} onChange={e => setCardCVV(e.target.value)} />
              </div>
            </div>
          )}

          {/* Net Banking Panel */}
          {method === 'netbanking' && (
            <div style={{ marginBottom: '16px' }}>
              <select
                id="recovery-bank-select"
                className="input-field"
                style={{ width: '100%' }}
                value={selectedBank}
                onChange={e => setSelectedBank(e.target.value)}
              >
                <option value="">Select your bank</option>
                {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          {/* Pay button */}
          <button
            id="recovery-pay-btn"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '15px', fontWeight: 700 }}
            onClick={handlePay}
            disabled={screen === 'processing'}
          >
            {screen === 'processing' ? (
              <><div className="spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} /> Processing…</>
            ) : (
              <><Zap size={16} /> Pay {fmt(details.amount)} Securely</>
            )}
          </button>

          <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Globe size={11} /> SSL Encrypted · TRAI DLT Compliant · Powered by ReVault
          </div>
        </div>
      )}

      {screen === 'success' && details && (
        <div className="recovery-card" style={{ textAlign: 'center' }}>
          <div className="recovery-success-screen">
            <div className="recovery-success-icon">
              <CheckCircle size={40} color="var(--success)" />
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Payment Successful!
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              {fmt(details.amount)} paid to {details.merchant_name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', display: 'inline-block' }}>
              Ref: RZP{Date.now().toString().slice(-8)}
            </div>
            <div style={{ marginTop: '20px', padding: '14px', background: 'rgba(0,207,112,0.07)', border: '1px solid rgba(0,207,112,0.2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--success)' }}>
              ✓ ReVault recovery cycle closed · Revenue recovered by AI agent
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
