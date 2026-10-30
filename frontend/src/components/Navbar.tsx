import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Database, Clock, Server } from 'lucide-react';

interface NavbarProps {
  onRefresh: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh, loading }) => {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 border-b border-cyan-500/20 bg-[#0B1220]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Digital Twin identity */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center glow-cyan">
          <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-wider text-white">
              Campus<span className="text-cyan-400">Pulse</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest font-semibold rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              DIGITAL TWIN v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono tracking-tight">
            DBMS SEMESTER CONTROL CENTER &bull; SPATIAL FACILITY ENGINE
          </p>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center space-x-6">
        <div className="flex items-center space-x-2 text-xs font-mono text-slate-300 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{time}</span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>SYSTEM LIVE</span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 bg-cyan-950/30 px-3 py-1.5 rounded-lg border border-cyan-500/30">
          <Database className="w-3.5 h-3.5" />
          <span>ORACLE SQL 21c &bull; ORACLEDB</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <button
          id="btn-refresh-data"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 transition-all hover:border-cyan-400 disabled:opacity-50"
          title="Refresh database records"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">SYNC DATA</span>
        </button>

        <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900/80 border border-slate-700/60 text-slate-300">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span>PORT: 8000</span>
        </div>
      </div>
    </header>
  );
};
