import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Zap, Sparkles, Activity } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LOADING_STEPS = [
  { id: 1, text: 'Verifying cryptographic security token...', threshold: 25 },
  { id: 2, text: 'Establishing secure Real-time Socket Gateway...', threshold: 50 },
  { id: 3, text: 'Synchronizing Central Inventory & Multi-Warehouse Ledgers...', threshold: 75 },
  { id: 4, text: 'Loading Executive P&L Analytics & Workspaces...', threshold: 95 }
];

export const SplashScreen = () => {
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing Secure Handshake...');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2000; // 2.0s splash sequence

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (pct < 30) {
        setStatusMessage('Authenticating corporate credentials...');
      } else if (pct < 60) {
        setStatusMessage('Connecting to Real-time WebSocket Gateway...');
      } else if (pct < 90) {
        setStatusMessage('Synchronizing inventory & marketplace channels...');
      } else if (pct < 100) {
        setStatusMessage('Loading executive dashboard...');
      } else {
        setStatusMessage(`Access Granted. Welcome back, ${user?.name || 'Administrator'}!`);
        clearInterval(interval);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 350);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [navigate, user]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-primary-600/25 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/90 pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }}
      />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center text-center space-y-7">
        {/* Animated Brand Emblem */}
        <div className="relative">
          {/* Radar pulsing ring */}
          <div className="absolute -inset-4 bg-gradient-to-r from-primary-500 to-cyan-400 rounded-3xl blur-xl opacity-60 animate-pulse" />
          
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-slate-900 border-2 border-primary-500/40 p-3 shadow-2xl flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Nexus ERP"
              className="w-full h-full object-contain rounded-2xl animate-spin"
              style={{ animationDuration: '24s' }}
            />
          </div>

          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
            <Zap className="w-4 h-4 fill-emerald-400 animate-bounce" />
          </div>
        </div>

        {/* Brand Titles */}
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-white flex items-center justify-center gap-2">
            NEXUS ERP
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
              v2.4
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide uppercase">
            Multi-Channel Enterprise Operations OS
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full space-y-2.5">
          <div className="flex items-center justify-between text-xs px-1 font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-primary-400 animate-spin" />
              {statusMessage}
            </span>
            <span className="text-primary-300 font-bold text-sm">
              {progress}%
            </span>
          </div>

          <div className="w-full h-2.5 bg-slate-900/90 border border-slate-800 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary-500 via-cyan-400 to-indigo-500 rounded-full transition-all duration-75 shadow-lg shadow-primary-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Dynamic Verification Step Checklist */}
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2.5 backdrop-blur-md">
          {LOADING_STEPS.map((step) => {
            const isDone = progress >= step.threshold;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-2.5 text-xs transition-colors duration-300 ${
                  isDone ? 'text-slate-200' : 'text-slate-500'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                )}
                <span className={`truncate ${isDone ? 'font-medium' : ''}`}>
                  {step.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-500 font-medium">
          Encrypted End-to-End • SOC2 & ISO/IEC 27001 Certified Infrastructure
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
