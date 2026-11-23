import React, { useState, useEffect } from 'react';

export type TabType = 'dashboard' | 'map' | 'rooms' | 'bookings' | 'maintenance' | 'events' | 'dbms';

interface HeaderProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  activeTicketsCount?: number;
  availableRoomsCount?: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function Header({
  currentTab,
  setCurrentTab,
  activeTicketsCount = 0,
  availableRoomsCount,
  loading = false,
  onRefresh
}: HeaderProps) {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems: { id: TabType; label: string; badge?: number | string | null }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'map', label: 'Campus Map' },
    { id: 'rooms', label: 'Rooms & Spaces', badge: availableRoomsCount },
    { id: 'bookings', label: 'Reservations' },
    { id: 'maintenance', label: 'Maintenance', badge: activeTicketsCount },
    { id: 'events', label: 'Events' },
    { id: 'dbms', label: 'DBMS Studio' },
  ];

  return (
    <header className="border-b border-neutral-800 bg-black sticky top-0 z-50 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        
        {/* Brand Title */}
        <div 
          className="cursor-pointer" 
          onClick={() => setCurrentTab('dashboard')}
        >
          <div className="font-bold text-white text-sm tracking-wider uppercase flex items-center space-x-2">
            <span className="inline-block w-2 h-2 bg-white"></span>
            <span>CampusPulse</span>
          </div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
            Operations &amp; Facility Management
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                  active
                    ? 'text-white border-b-2 border-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge !== null && Number(item.badge) > 0 && (
                  <span className="ml-1.5 px-1 py-0.2 text-[10px] bg-white text-black font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Minimal System Telemetry */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden sm:flex items-center space-x-2 text-[11px] text-neutral-400 border border-neutral-800 px-2.5 py-1">
            <span>{time}</span>
            <span className="text-neutral-700">/</span>
            <span>ORACLE 21C</span>
            <span className="text-neutral-700">/</span>
            <span className="text-neutral-300">PORT 8000</span>
            {onRefresh && (
              <button 
                title="Sync database records" 
                onClick={onRefresh}
                disabled={loading}
                className="text-neutral-500 hover:text-white ml-1 cursor-pointer font-bold disabled:opacity-40"
              >
                {loading ? '[SYNCING...]' : '[SYNC]'}
              </button>
            )}
          </div>

          <div className="border border-neutral-700 px-2 py-1 text-[11px] text-white">
            [ONLINE]
          </div>
        </div>

      </div>

      {/* Mobile Nav row */}
      <div className="flex lg:hidden px-4 py-2 bg-black border-t border-neutral-900 overflow-x-auto space-x-2">
        {navItems.map((item) => {
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`px-2.5 py-1 text-xs whitespace-nowrap cursor-pointer ${
                active ? 'text-white border-b border-white font-bold' : 'text-neutral-500'
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== null && Number(item.badge) > 0 && (
                <span className="ml-1 px-1 text-[9px] bg-white text-black font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
