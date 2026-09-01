import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight, BookOpen, Cpu } from 'lucide-react';
import type { RootState } from '../store';
import logo from '../assets/ReVault_logo.png';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState({});
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [preloaderVisible, setPreloaderVisible] = useState(true);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500;

    const animateProgress = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(Math.floor((progress / duration) * 100), 100);
      setLoadingProgress(percentage);

      if (progress < duration) {
        requestAnimationFrame(animateProgress);
      } else {
        setTimeout(() => setPreloaderVisible(false), 800);
      }
    };

    requestAnimationFrame(animateProgress);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const { left, top, width, height } = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    // Increased intensity: 20 degrees max rotation
    setTiltStyle({
      transform: `perspective(1000px) rotateY(${x * 30}deg) rotateX(${y * -30}deg) scale3d(1.02, 1.02, 1.02)`
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({ transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)' });
  };

  // Dynamic live stats from Redux
  const agents = useSelector((state: RootState) => state.agents.agents);
  const metrics = useSelector((state: RootState) => state.metrics);

  const agentsCount = Object.keys(agents).length || 0;
  const accuracyCount = metrics.classifierAccuracy || 0;
  const demoAmount = metrics.recoveredAmount > 0
    ? (metrics.recoveredAmount / 100000).toFixed(2)
    : '0.00';
  const violationsCount = metrics.complianceViolations || 0;

  return (
    <div className="landing">
      {preloaderVisible && (
        <div className={`landing-preloader ${loadingProgress >= 100 ? 'slide-up-out' : ''}`}>
          <div className="preloader-circle-container">
            <svg className="preloader-svg" viewBox="0 0 100 100">
              <circle className="preloader-circle-bg" cx="50" cy="50" r="45" />
              <circle 
                className="preloader-circle-progress" 
                cx="50" 
                cy="50" 
                r="45" 
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * loadingProgress) / 100} 
              />
            </svg>
            <div className="preloader-text">{loadingProgress}%</div>
          </div>
        </div>
      )}
      {/* Nav */}
      <nav className="landing-nav">
        <div
          className="landing-logo"
          onClick={() => {
            window.location.reload();
            navigate('/landing');
          }}
          style={{ cursor: 'pointer' }}
        >
          <img src={logo} alt="ReVault Logo" className="landing-logo-img" style={{ width: '32px', height: 'auto' }} />
          <span className="landing-logo-text">ReVault</span>
        </div>
        <div className="landing-nav-actions">
          <button className="nav-btn-secondary" onClick={() => navigate('/about')}>
            <BookOpen size={16} /> How it Works
          </button>
          <button className="nav-btn-primary" onClick={() => navigate('/')}>
            Open Dashboard <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <div className="landing-container-centered">

        {/* 1. Hero & Stats (First Screen) */}
        <div className="landing-first-screen">
          <div 
            className="hero-content-centered"
            ref={heroRef}
            style={tiltStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
          <div className="landing-eyebrow">
            <Cpu size={11} />
            Built for Razorpay Buildathon 2026
          </div>

          <h1 className="landing-headline-centered">
            ReVault
          </h1>
          <h2 className="landing-subheadline-gradient">
            Track 3: AI Revenue Recovery
          </h2>

          <p className="landing-sub-centered">
            An autonomous, multi-agent system that detects revenue at risk, determines the right intervention, and executes a bounded recovery workflow: from payment failures and checkout abandonment to overdue receivables.
          </p>
        </div>

          <div className="landing-cta-row-centered">
            <button
              className="landing-cta-primary-centered"
              onClick={() => navigate('/')}
            >
              Explore <ArrowRight size={16} />
            </button>
            <button
              className="landing-cta-secondary-centered"
              onClick={() => navigate('/about')}
            >
              <BookOpen size={16} /> How It Works
            </button>
          </div>

        {/* 2. Stats Row */}
        <div className="stats-row-centered">
          <div className="stat-card-centered">
            <div className="stat-value">{agentsCount}</div>
            <div className="stat-label">Autonomous Agents</div>
          </div>
          <div className="stat-card-centered">
            <div className="stat-value">{accuracyCount}%</div>
            <div className="stat-label">Classifier Accuracy</div>
          </div>
          <div className="stat-card-centered">
            <div className="stat-value">₹{demoAmount}L+</div>
            <div className="stat-label">Demo Recovered</div>
          </div>
          <div className="stat-card-centered">
            <div className="stat-value">{violationsCount}</div>
            <div className="stat-label">Compliance Violations</div>
          </div>
        </div>
        </div>

        {/* 3. Directions Container */}
        <div className="directions-section">
          <div className="directions-flex-row" style={{ marginBottom: '16px' }}>
            <div className="direction-pill">Payment degradation</div>
            <div className="direction-pill">Checkout drop-off</div>
            <div className="direction-pill">Failed-subscription</div>
            <div className="direction-pill">B2B receivables</div>
          </div>
          <div className="directions-flex-row">
            <div className="direction-pill">Mandate retry</div>
            <div className="direction-pill">Hinglish voice</div>
            <div className="direction-pill">PTP tracker</div>
          </div>
        </div>

        {/* 4. Developer Card Footer */}
        <div className="developer-footer-centered">
          <div className="dev-footer-info">
            <span className="dev-label">Developed By</span>
            <strong className="dev-name">Apurb Susobhit Baba</strong>
            <span className="dev-detail">NIT Rourkela • B.Tech ECE, 2027</span>
          </div>
          <a href="https://apurb.in" target="_blank" rel="noopener noreferrer" className="portfolio-link-footer">
            apurb.in <ArrowRight size={14} />
          </a>
        </div>

      </div>
    </div>
  );
};
