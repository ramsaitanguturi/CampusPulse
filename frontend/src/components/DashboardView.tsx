import React from 'react';
import { 
  Building2, 
  DoorClosed, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  Plus,
  ArrowRight
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
      <div className="flex items-center justify-center h-96 text-zinc-400 text-sm">
        Loading campus facility telemetry...
      </div>
    );
  }

  const { stats, booking_trends, building_occupancy, recent_bookings, recent_tickets } = data;
  const availPct = stats.total_rooms > 0 ? Math.round((stats.available_rooms / stats.total_rooms) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header with Action Triggers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1B24] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Campus Operations Overview
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time space occupancy, reservation schedules, and facility maintenance dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-quick-booking"
            onClick={onOpenBookingModal}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book a Room</span>
          </button>

          <button
            id="btn-quick-maintenance"
            onClick={onOpenMaintenanceModal}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-[#12111A] hover:bg-[#1A1926] text-zinc-200 border border-[#272635] transition-colors cursor-pointer"
          >
            <Wrench className="w-4 h-4 text-zinc-400" />
            <span>Log Ticket</span>
          </button>

          <button
            id="btn-quick-event"
            onClick={onOpenEventModal}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-[#12111A] hover:bg-[#1A1926] text-zinc-200 border border-[#272635] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-zinc-400" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Rooms */}
        <div 
          onClick={() => onNavigateTab('rooms')}
          className="surface-card p-4 rounded-xl hover:border-emerald-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Available Spaces</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {stats.available_rooms}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center justify-between">
            <span>{availPct}% of total capacity</span>
            <span className="text-emerald-400 font-medium">Ready for use</span>
          </div>
        </div>

        {/* Occupied Rooms */}
        <div 
          onClick={() => onNavigateTab('bookings')}
          className="surface-card p-4 rounded-xl hover:border-amber-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Occupied Now</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {stats.occupied_rooms}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center justify-between">
            <span>{stats.active_bookings} active sessions</span>
            <span className="text-amber-400 font-medium">In session</span>
          </div>
        </div>

        {/* Maintenance Issues */}
        <div 
          onClick={() => onNavigateTab('maintenance')}
          className="surface-card p-4 rounded-xl hover:border-rose-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Maintenance Queue</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {stats.open_tickets}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center justify-between">
            <span>{stats.maintenance_rooms} rooms offline</span>
            <span className="text-rose-400 font-medium">{stats.in_progress_tickets} in repair</span>
          </div>
        </div>

        {/* Total Campus Footprint */}
        <div 
          onClick={() => onNavigateTab('map')}
          className="surface-card p-4 rounded-xl hover:border-violet-500/40 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Campus Footprint</span>
            <Building2 className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 tabular-nums">
            {stats.total_rooms}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center justify-between">
            <span>Across {stats.total_buildings} complexes</span>
            <span className="text-violet-400 font-medium">{stats.upcoming_events} events</span>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Booking Trends Area Chart (7 cols) */}
        <div className="lg:col-span-7 surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1C1B24] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Weekly Reservation Volume
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Total requests versus confirmed booking intervals
              </p>
            </div>
            <span className="text-xs text-zinc-400 bg-[#12111A] px-2.5 py-1 rounded-md border border-[#272635]">
              7-Day View
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={booking_trends}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A855F7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#A855F7" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C1B24" vertical={false} />
                <XAxis dataKey="day" stroke="#71717A" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717A" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0C0C10', 
                    borderColor: '#2D273F', 
                    borderRadius: '0.5rem', 
                    color: '#F4F4F5',
                    fontSize: '12px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="total_bookings" 
                  name="Total Bookings"
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#totalGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="confirmed_bookings" 
                  name="Confirmed"
                  stroke="#C084FC" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#confirmedGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Building Occupancy Bar Chart (5 cols) */}
        <div className="lg:col-span-5 surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1C1B24] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Space Status by Complex
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Current inventory breakdown across campus
              </p>
            </div>
            <span className="text-xs text-zinc-400 bg-[#12111A] px-2.5 py-1 rounded-md border border-[#272635]">
              5 Facilities
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={building_occupancy}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C1B24" vertical={false} />
                <XAxis dataKey="building_code" stroke="#71717A" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717A" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0C0C10', 
                    borderColor: '#2D273F', 
                    borderRadius: '0.5rem', 
                    color: '#F4F4F5',
                    fontSize: '12px'
                  }} 
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                <Bar dataKey="available_rooms" name="Available" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="occupied_rooms" name="Occupied" fill="#F59E0B" radius={[3, 3, 0, 0]} />
                <Bar dataKey="maintenance_rooms" name="Maintenance" fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Activity Feeds: Divided Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Bookings Feed (6 cols) */}
        <div className="lg:col-span-6 surface-card rounded-xl p-5">
          <div className="flex items-center justify-between border-b border-[#1C1B24] pb-3 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Recent Reservations
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Confirmed room allocations and sessions
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#1C1B24]">
            {recent_bookings.slice(0, 4).map((b) => (
              <div
                key={b.id}
                className="py-3 flex items-center justify-between text-xs hover:bg-[#12111A] px-2 -mx-2 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#14141C] border border-[#22212E] flex items-center justify-center text-zinc-300 shrink-0">
                    <DoorClosed className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-zinc-200 truncate">
                      {b.title}
                    </div>
                    <div className="text-zinc-400 text-xs mt-0.5">
                      {b.building_code} &bull; Room {b.room_number} &bull; {b.user_name}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                    {b.status}
                  </span>
                  <div className="text-zinc-400 text-xs mt-1 tabular-nums">
                    {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tickets Feed (6 cols) */}
        <div className="lg:col-span-6 surface-card rounded-xl p-5">
          <div className="flex items-center justify-between border-b border-[#1C1B24] pb-3 mb-2">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Active Maintenance Tickets
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Reported repairs and hardware issue dispatch
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#1C1B24]">
            {recent_tickets.slice(0, 4).map((t) => {
              const priorityColor = {
                CRITICAL: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
                HIGH: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
                MEDIUM: 'bg-blue-950/40 text-blue-300 border-blue-800/40',
                LOW: 'bg-zinc-800 text-zinc-300 border-zinc-700/60',
              }[t.priority] || 'bg-zinc-800 text-zinc-300 border-zinc-700/60';

              return (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between text-xs hover:bg-[#12111A] px-2 -mx-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#14141C] border border-[#22212E] flex items-center justify-center text-zinc-300 shrink-0">
                      <Wrench className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-zinc-200 truncate">
                        {t.title}
                      </div>
                      <div className="text-zinc-400 text-xs mt-0.5">
                        {t.building_name} &bull; Room {t.room_number}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3 flex flex-col items-end">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${priorityColor}`}>
                      {t.priority}
                    </span>
                    <span className="text-zinc-400 text-xs mt-1">
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
