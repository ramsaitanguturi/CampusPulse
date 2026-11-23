import React from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import StatCard from './StatCard';
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
      <div className="py-20 text-center text-xs text-neutral-500 font-mono">
        LOADING CAMPUS FACILITY TELEMETRY...
      </div>
    );
  }

  const { stats, booking_trends, building_occupancy, recent_bookings, recent_tickets } = data;
  const availPct = stats.total_rooms > 0 ? Math.round((stats.available_rooms / stats.total_rooms) * 100) : 0;
  const occupPct = stats.total_rooms > 0 ? Math.round((stats.occupied_rooms / stats.total_rooms) * 100) : 0;
  const maintPct = stats.total_rooms > 0 ? Math.round((stats.maintenance_rooms / stats.total_rooms) * 100) : 0;

  return (
    <div className="space-y-6 font-mono">
      {/* Top Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wider uppercase">System Dashboard</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Campus Facility Operations &amp; Real-Time Telemetry</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenBookingModal}
            className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold transition cursor-pointer"
          >
            BOOK A ROOM
          </button>
          <button
            onClick={onOpenMaintenanceModal}
            className="px-3 py-1.5 bg-black text-white border border-neutral-700 hover:bg-neutral-900 text-xs transition cursor-pointer"
          >
            LOG TICKET
          </button>
          <button
            onClick={onOpenEventModal}
            className="px-3 py-1.5 bg-black text-white border border-neutral-700 hover:bg-neutral-900 text-xs transition cursor-pointer"
          >
            ADD EVENT
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Available Spaces"
          value={stats.available_rooms}
          subtitle={`${availPct}% of total capacity`}
          onClick={() => onNavigateTab('rooms')}
        />
        <StatCard
          title="Occupied Now"
          value={stats.occupied_rooms}
          subtitle={`${stats.active_bookings} active sessions`}
          onClick={() => onNavigateTab('bookings')}
        />
        <StatCard
          title="Maintenance Queue"
          value={stats.open_tickets}
          subtitle={`${stats.maintenance_rooms} rooms offline`}
          onClick={() => onNavigateTab('maintenance')}
        />
        <StatCard
          title="Campus Footprint"
          value={stats.total_rooms}
          subtitle={`Across ${stats.total_buildings} complexes`}
          onClick={() => onNavigateTab('map')}
        />
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Weekly Reservation Trajectory Area Chart */}
        <div className="lg:col-span-2 bg-black border border-neutral-800 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-neutral-900 pb-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Weekly Reservation Trajectory
              </h3>
              <p className="text-[10px] text-neutral-500">Total requests versus confirmed booking intervals</p>
            </div>
            <span className="text-[11px] text-neutral-400 border border-neutral-800 px-2 py-0.5">
              7-DAY VIEW
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={booking_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#888888" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#888888" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#222222" strokeDasharray="2 2" vertical={false} />
                <XAxis dataKey="day" stroke="#666666" fontSize={10} tickLine={false} />
                <YAxis stroke="#666666" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#000000', 
                    borderColor: '#444444', 
                    borderRadius: '0px', 
                    fontSize: '11px', 
                    color: '#ffffff' 
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="total_bookings" 
                  name="Total Bookings"
                  stroke="#ffffff" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#totalGrad)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="confirmed_bookings" 
                  name="Confirmed"
                  stroke="#a3a3a3" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#confirmedGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Space Breakdown Card */}
        <div className="bg-black border border-neutral-800 p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-1 border-b border-neutral-900 pb-2">
              Capacity Breakdown
            </h3>
            <p className="text-[10px] text-neutral-500 mb-4 mt-2">Distribution across operational states</p>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-neutral-400">AVAILABLE (ONLINE)</span>
                  <span className="text-white">{availPct}%</span>
                </div>
                <div className="w-full bg-neutral-900 h-1 border border-neutral-800">
                  <div 
                    className="bg-white h-full" 
                    style={{ width: `${availPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-neutral-400">OCCUPIED (IN USE)</span>
                  <span className="text-white">{occupPct}%</span>
                </div>
                <div className="w-full bg-neutral-900 h-1 border border-neutral-800">
                  <div 
                    className="bg-neutral-400 h-full" 
                    style={{ width: `${occupPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-neutral-400">MAINTENANCE (OFFLINE)</span>
                  <span className="text-white">{maintPct}%</span>
                </div>
                <div className="w-full bg-neutral-900 h-1 border border-neutral-800">
                  <div 
                    className="bg-neutral-600 h-full" 
                    style={{ width: `${Math.min(100, maintPct * 4)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 text-[10px] text-neutral-500 flex justify-between">
            <span>AUDIT: ORACLE 21C ACID</span>
            <span className="text-neutral-300">ACTIVE TELEMETRY</span>
          </div>
        </div>
      </div>

      {/* Building Breakdown Chart */}
      <div className="bg-black border border-neutral-800 p-4">
        <div className="flex items-center justify-between mb-3 border-b border-neutral-900 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Space Status by Campus Complex
            </h3>
            <p className="text-[10px] text-neutral-500">Current room availability distribution across physical facilities</p>
          </div>
          <span className="text-[11px] text-neutral-400 border border-neutral-800 px-2 py-0.5">
            5 COMPLEXES
          </span>
        </div>

        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={building_occupancy} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#222222" strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="building_code" stroke="#666666" fontSize={10} tickLine={false} />
              <YAxis stroke="#666666" fontSize={10} tickLine={false} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#000000', 
                  borderColor: '#444444', 
                  borderRadius: '0px', 
                  fontSize: '11px', 
                  color: '#ffffff' 
                }} 
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
              <Bar dataKey="available_rooms" name="Available" fill="#ffffff" />
              <Bar dataKey="occupied_rooms" name="Occupied" fill="#888888" />
              <Bar dataKey="maintenance_rooms" name="Maintenance" fill="#444444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables: Recent Reservations & Active Maintenance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Reservations */}
        <div className="bg-black border border-neutral-800 font-mono">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Recent Reservations ({recent_bookings.length})
            </h3>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              [VIEW ALL]
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-500 text-[11px] border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">TITLE</th>
                  <th className="py-2.5 px-3">SPACE</th>
                  <th className="py-2.5 px-3">USER</th>
                  <th className="py-2.5 px-3">STATUS</th>
                  <th className="py-2.5 px-3 text-right">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-300">
                {recent_bookings.slice(0, 5).map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-950 transition-colors">
                    <td className="py-2.5 px-3 text-white font-medium truncate max-w-[150px]">
                      {b.title}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400">
                      {b.building_code} #{b.room_number}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400 truncate max-w-[100px]">
                      {b.user_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="border border-neutral-700 bg-neutral-900 text-white px-1.5 py-0.5 text-[10px]">
                        [{b.status}]
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11px] text-neutral-400 tabular-nums">
                      {new Date(b.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Maintenance Tickets */}
        <div className="bg-black border border-neutral-800 font-mono">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Active Maintenance ({recent_tickets.length})
            </h3>
            <button
              onClick={() => onNavigateTab('maintenance')}
              className="text-neutral-400 hover:text-white text-xs cursor-pointer"
            >
              [VIEW ALL]
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950 text-neutral-500 text-[11px] border-b border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">ISSUE</th>
                  <th className="py-2.5 px-3">SPACE</th>
                  <th className="py-2.5 px-3">PRIORITY</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 text-neutral-300">
                {recent_tickets.slice(0, 5).map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-950 transition-colors">
                    <td className="py-2.5 px-3 text-white font-medium truncate max-w-[150px]">
                      {t.title}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400">
                      {t.building_name} #{t.room_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`border px-1.5 py-0.5 text-[10px] ${
                        t.priority === 'CRITICAL' ? 'border-white bg-white text-black font-bold' :
                        t.priority === 'HIGH' ? 'border-neutral-500 bg-neutral-900 text-white' :
                        'border-neutral-700 text-neutral-400'
                      }`}>
                        [{t.priority}]
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[11px] text-neutral-400">
                      [{t.status}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
