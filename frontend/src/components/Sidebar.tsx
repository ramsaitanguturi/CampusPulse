import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  DoorClosed, 
  CalendarClock, 
  Wrench, 
  Sparkles, 
  Database,
  Layers,
  ChevronRight
} from 'lucide-react';

export type TabType = 'dashboard' | 'map' | 'rooms' | 'bookings' | 'maintenance' | 'events' | 'dbms';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  stats?: {
    totalRooms: number;
    availableRooms: number;
    openTickets: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, stats }) => {
  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'map' as TabType, label: 'Campus Map Twin', icon: MapPin, badge: '2D SV' },
    { id: 'rooms' as TabType, label: 'Rooms & Status', icon: DoorClosed, badge: stats?.availableRooms ? `${stats.availableRooms} FREE` : null },
    { id: 'bookings' as TabType, label: 'Room Bookings', icon: CalendarClock, badge: null },
    { id: 'maintenance' as TabType, label: 'Maintenance Hub', icon: Wrench, badge: stats?.openTickets ? `${stats.openTickets} ACT` : null, badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    { id: 'events' as TabType, label: 'Campus Events', icon: Sparkles, badge: null },
    { id: 'dbms' as TabType, label: 'DBMS Viva Studio', icon: Database, badge: 'SQL', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070B14]/95 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      {/* Navigation Links */}
      <div className="p-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-slate-400">
          Control Matrix
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-lg shadow-cyan-950/50 glow-cyan'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center space-x-1.5">
                {item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    item.badgeColor || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Control Center Facility Indicator in Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Facility Status</span>
          </span>
          <span className="text-emerald-400">OPTIMAL</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
          <div className="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
            <div className="font-bold text-xs">{stats?.availableRooms ?? '--'}</div>
            <div className="text-[9px] text-emerald-400/70">AVAIL</div>
          </div>
          <div className="p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-300">
            <div className="font-bold text-xs">{(stats?.totalRooms ?? 0) - (stats?.availableRooms ?? 0) - (stats?.openTickets ?? 0)}</div>
            <div className="text-[9px] text-amber-400/70">OCCUP</div>
          </div>
          <div className="p-1.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300">
            <div className="font-bold text-xs">{stats?.openTickets ?? '--'}</div>
            <div className="text-[9px] text-rose-400/70">MAINT</div>
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-400 text-center tracking-tight">
          DBMS Project &bull; CampusPulse
        </div>
      </div>
    </aside>
  );
};
