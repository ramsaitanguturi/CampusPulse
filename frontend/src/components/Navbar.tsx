import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, Building2 } from 'lucide-react';

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
    <header className="h-16 border-b border-[#1C1B24] bg-[#07070A] px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Brand Identity */}
      <div className="flex items-center space-x-3.5">
        <div className="w-9 h-9 rounded-lg bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-violet-400 shadow-sm">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-lg font-bold tracking-tight text-white">
              Campus<span className="text-violet-400">Pulse</span>
            </h1>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-violet-950/50 text-violet-300 border border-violet-800/50">
              Operations
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Facilities Management & Spatial Operations
          </p>
        </div>
      </div>

      {/* Center Status Telemetry */}
      <div className="hidden md:flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-xs text-zinc-300 bg-[#0E0E14] px-3 py-1.5 rounded-lg border border-[#1E1D28]">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span className="tabular-nums">{time}</span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-900/40">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="font-medium">System Online</span>
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-300 bg-[#0E0E14] px-3 py-1.5 rounded-lg border border-[#1E1D28]">
          <Database className="w-3.5 h-3.5 text-violet-400" />
          <span>Oracle 21c Database</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <button
          id="btn-refresh-data"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-200 bg-[#12121A] hover:bg-[#1A1926] border border-[#262436] transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh database records"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Data</span>
        </button>
      </div>
    </header>
  );
};
