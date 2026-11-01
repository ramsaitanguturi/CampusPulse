import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  DoorClosed, 
  CalendarClock, 
  Wrench, 
  Sparkles, 
  Database,
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
    { id: 'map' as TabType, label: 'Campus Map', icon: MapPin, badge: 'Interactive' },
    { id: 'rooms' as TabType, label: 'Rooms & Spaces', icon: DoorClosed, badge: stats?.availableRooms ? `${stats.availableRooms} free` : null },
    { id: 'bookings' as TabType, label: 'Reservations', icon: CalendarClock, badge: null },
    { id: 'maintenance' as TabType, label: 'Maintenance', icon: Wrench, badge: stats?.openTickets ? `${stats.openTickets} open` : null, badgeColor: 'bg-rose-950/40 text-rose-300 border-rose-800/40' },
    { id: 'events' as TabType, label: 'Campus Events', icon: Sparkles, badge: null },
    { id: 'dbms' as TabType, label: 'DBMS Studio', icon: Database, badge: 'SQL', badgeColor: 'bg-violet-950/40 text-violet-300 border-violet-800/40' },
  ];

  const total = stats?.totalRooms ?? 0;
  const avail = stats?.availableRooms ?? 0;
  const maint = stats?.openTickets ?? 0;
  const occup = Math.max(0, total - avail - maint);

  return (
    <aside className="w-64 border-r border-[#1C1B24] bg-[#060609] flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none">
      {/* Navigation Links */}
      <div className="p-3.5 space-y-1">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-violet-950/40 text-white font-medium border border-violet-800/60 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-[#12111A] border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-400' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>

              <div className="flex items-center space-x-2">
                {item.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-md border font-normal ${
                    item.badgeColor || 'bg-[#14141C] text-zinc-300 border-[#252433]'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Facility Status Card in Footer */}
      <div className="p-4 border-t border-[#1C1B24] bg-[#060609]">
        <div className="flex items-center justify-between text-xs text-zinc-300 mb-3">
          <span className="font-medium">Capacity Overview</span>
          <span className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Normal</span>
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#1C1B24] border border-[#1C1B24] rounded-lg bg-[#0C0C12] p-2 text-center">
          <div>
            <div className="text-xs text-zinc-400">Available</div>
            <div className="text-sm font-semibold text-emerald-400 tabular-nums mt-0.5">{stats?.availableRooms ?? '--'}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Occupied</div>
            <div className="text-sm font-semibold text-amber-400 tabular-nums mt-0.5">{occup}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-400">Issues</div>
            <div className="text-sm font-semibold text-rose-400 tabular-nums mt-0.5">{stats?.openTickets ?? '--'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
