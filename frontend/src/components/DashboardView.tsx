import React from 'react';
import { 
  Building as BuildingIcon, 
  DoorClosed, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  CalendarClock, 
  Wrench, 
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  ShieldCheck,
  Plus
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { DashboardData } from '../types';

interface DashboardViewProps {
  data: DashboardData | null;
  onNavigateTab: (tab: any) => void;
  onOpenBookingModal: () => void;
  onOpenMaintenanceModal: () => void;
  onOpenEventModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigateTab,
  onOpenBookingModal,
  onOpenMaintenanceModal,
  onOpenEventModal
}) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-96 text-cyan-400 font-mono animate-pulse">
        Initializing Smart Campus Digital Twin telemetry...
      </div>
    );
  }

  const { stats, booking_trends, building_occupancy, recent_bookings, recent_tickets, upcoming_events } = data;

  return (
    <div className="space-y-6">
      {/* Top Control Banner with Quick Action Launchers */}
      <div className="p-5 rounded-2xl glass-panel-glow border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Facility Operations Command Center &bull; Live Telemetry</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide mt-1">
            Campus Operations Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time DBMS synchronization of spatial entities, conflict-free schedules, and facility maintenance.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-quick-booking"
            onClick={onOpenBookingModal}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all glow-cyan"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>BOOK ROOM</span>
          </button>

          <button
            id="btn-quick-maintenance"
            onClick={onOpenMaintenanceModal}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all"
          >
            <Wrench className="w-3.5 h-3.5 text-rose-400" />
            <span>LOG TICKET</span>
          </button>

          <button
            id="btn-quick-event"
            onClick={onOpenEventModal}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>NEW EVENT</span>
          </button>
        </div>
      </div>

      {/* Primary 8 Metrics Matrix */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Buildings */}
        <div 
          onClick={() => onNavigateTab('map')}
          className="p-4 rounded-2xl glass-panel hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL BUILDINGS</span>
            <BuildingIcon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{stats.total_buildings}</div>
          <div className="text-[11px] text-cyan-400/80 font-mono mt-1 flex items-center space-x-1">
            <span>100% Monitored</span>
            <ArrowUpRight className="w-3 h-3" />
          </div>
        </div>

        {/* Total Rooms */}
        <div 
          onClick={() => onNavigateTab('rooms')}
          className="p-4 rounded-2xl glass-panel hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL ROOMS</span>
            <DoorClosed className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{stats.total_rooms}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Classrooms, Labs & Pods
          </div>
        </div>

        {/* Available Rooms */}
        <div 
          onClick={() => onNavigateTab('rooms')}
          className="p-4 rounded-2xl glass-panel border-emerald-500/30 hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs font-mono">
            <span>AVAILABLE NOW</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform glow-emerald" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2 font-mono">{stats.available_rooms}</div>
          <div className="text-[11px] text-emerald-400/80 font-mono mt-1">
            {Math.round((stats.available_rooms / (stats.total_rooms || 1)) * 100)}% of campus capacity
          </div>
        </div>

        {/* Occupied Rooms */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="p-4 rounded-2xl glass-panel border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-400 text-xs font-mono">
            <span>OCCUPIED</span>
            <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform glow-amber" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2 font-mono">{stats.occupied_rooms}</div>
          <div className="text-[11px] text-amber-400/80 font-mono mt-1">
            {stats.active_bookings} Active Sessions
          </div>
        </div>

        {/* Maintenance Rooms */}
        <div 
          onClick={() => onNavigateTab('maintenance')}
          className="p-4 rounded-2xl glass-panel border-rose-500/30 hover:border-rose-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-rose-400 text-xs font-mono">
            <span>OFFLINE / MAINT</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform glow-rose" />
          </div>
          <div className="text-2xl font-bold text-rose-300 mt-2 font-mono">{stats.maintenance_rooms}</div>
          <div className="text-[11px] text-rose-400/80 font-mono mt-1">
            {stats.open_tickets} Open Issues Logged
          </div>
        </div>

        {/* Total Bookings */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="p-4 rounded-2xl glass-panel hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TOTAL BOOKINGS</span>
            <CalendarClock className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{stats.total_bookings}</div>
          <div className="text-[11px] text-cyan-400/80 font-mono mt-1">
            Exclusion Constraint Safe
          </div>
        </div>

        {/* Maintenance Tickets Stats */}
        <div 
          onClick={() => onNavigateTab('maintenance')}
          className="p-4 rounded-2xl glass-panel hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>TICKET QUEUE</span>
            <Wrench className="w-4 h-4 text-slate-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{stats.total_tickets}</div>
          <div className="text-[11px] text-emerald-400 font-mono mt-1">
            {stats.resolved_tickets} Resolved &bull; {stats.in_progress_tickets} In Progress
          </div>
        </div>

        {/* Upcoming Events */}
        <div 
          onClick={() => onNavigateTab('events')}
          className="p-4 rounded-2xl glass-panel hover:border-cyan-500/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>CAMPUS EVENTS</span>
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{stats.upcoming_events}</div>
          <div className="text-[11px] text-amber-400 font-mono mt-1">
            Academic & Tech Summits
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Booking Trends Area Chart (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400">
                SQL Aggregation & Grouping
              </span>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Weekly Reservation Trajectory</span>
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              7-DAY SPRINT
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={booking_trends}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0B1220', 
                    borderColor: '#06B6D4', 
                    borderRadius: '0.75rem', 
                    color: '#FFF',
                    fontSize: '12px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="total_bookings" 
                  name="Total Bookings"
                  stroke="#06B6D4" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#totalGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="confirmed_bookings" 
                  name="Confirmed"
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#confirmedGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Building Occupancy Bar Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400">
                Spatial Entity Distribution
              </span>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <BuildingIcon className="w-4 h-4 text-cyan-400" />
                <span>Room Status by Complex</span>
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              5 HUBS
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={building_occupancy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="building_code" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0B1220', 
                    borderColor: '#38BDF8', 
                    borderRadius: '0.75rem', 
                    color: '#FFF',
                    fontSize: '12px'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="available_rooms" name="Available" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="occupied_rooms" name="Occupied" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="maintenance_rooms" name="Maint" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Feeds: Recent Bookings & Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Bookings Feed (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CalendarClock className="w-4 h-4 text-cyan-400" />
              <span>Recent Room Reservations</span>
            </h3>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              VIEW ALL &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {recent_bookings.slice(0, 4).map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-cyan-300">
                    {b.building_code || 'RM'}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{b.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {b.building_name} &bull; Room {b.room_number} &bull; {b.user_name}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    b.status === 'CONFIRMED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                    b.status === 'COMPLETED' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {b.status}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maintenance Feed (6 cols) */}
        <div className="lg:col-span-6 rounded-2xl glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-rose-400" />
              <span>Facility Maintenance Queue</span>
            </h3>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              VIEW ALL &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {recent_tickets.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    t.priority === 'CRITICAL' ? 'bg-rose-400 glow-rose' :
                    t.priority === 'HIGH' ? 'bg-amber-400 glow-amber' :
                    'bg-cyan-400'
                  }`} />
                  <div>
                    <div className="font-semibold text-white">{t.title}</div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Room {t.room_number} &bull; Priority: {t.priority}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    t.status === 'OPEN' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                    t.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {t.status}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400 mt-1">
                    {new Date(t.reported_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
