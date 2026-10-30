import React, { useState, useEffect } from 'react';
import { 
  DoorClosed, 
  Search, 
  Zap,
  Users
} from 'lucide-react';
import { Room, Building } from '../types';
import { api } from '../services/api';

interface RoomsViewProps {
  buildings: Building[];
  onOpenBookingModal: (room: Room) => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({ buildings, onOpenBookingModal }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [minCapacity, setMinCapacity] = useState<number>(0);

  // Time-specific availability query state (SQL NOT EXISTS demo)
  const [checkSlotActive, setCheckSlotActive] = useState(false);
  const [slotDate, setSlotDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [slotStartTime, setSlotStartTime] = useState('10:00');
  const [slotEndTime, setSlotEndTime] = useState('12:00');
  const [slotResults, setSlotResults] = useState<Room[] | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, [selectedBuilding, selectedType, selectedStatus, minCapacity]);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const data = await api.getRooms({
        building_id: selectedBuilding !== 'ALL' ? Number(selectedBuilding) : undefined,
        room_type: selectedType !== 'ALL' ? selectedType : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        min_capacity: minCapacity > 0 ? minCapacity : undefined,
        search: search || undefined,
      });
      setRooms(data);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRooms();
  };

  const handleCheckSlotAvailability = async () => {
    setSlotLoading(true);
    try {
      const startIso = `${slotDate}T${slotStartTime}:00Z`;
      const endIso = `${slotDate}T${slotEndTime}:00Z`;
      const availableRooms = await api.getAvailableRooms(
        startIso,
        endIso,
        minCapacity > 0 ? minCapacity : undefined,
        selectedType !== 'ALL' ? selectedType : undefined
      );
      setSlotResults(availableRooms);
      setCheckSlotActive(true);
    } catch (err) {
      console.error('Failed slot query:', err);
    } finally {
      setSlotLoading(false);
    }
  };

  const displayedRooms = checkSlotActive && slotResults !== null ? slotResults : rooms;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>Spatial Inventory & Capacity Management</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide mt-1">
            Campus Room Directory
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Query facility spaces, inspect hardware amenities, or evaluate real-time availability via SQL NOT EXISTS subqueries.
          </p>
        </div>

        <div className="text-xs font-mono text-cyan-300 bg-cyan-950/40 px-3.5 py-2 rounded-xl border border-cyan-500/30 flex items-center space-x-2">
          <DoorClosed className="w-4 h-4 text-cyan-400" />
          <span>{displayedRooms.length} ROOMS MATCHED</span>
        </div>
      </div>

      {/* SQL NOT EXISTS Time Slot Checker Box */}
      <div className="p-5 rounded-2xl glass-panel-glow border border-cyan-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              DBMS Slot Availability Engine (SQL NOT EXISTS)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Guarantees collision-free room matching for exact timestamp windows
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">TARGET DATE</label>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">START TIME</label>
            <input
              type="time"
              value={slotStartTime}
              onChange={(e) => setSlotStartTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">END TIME</label>
            <input
              type="time"
              value={slotEndTime}
              onChange={(e) => setSlotEndTime(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-check-availability"
              onClick={handleCheckSlotAvailability}
              disabled={slotLoading}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all glow-cyan disabled:opacity-50"
            >
              {slotLoading ? 'EVALUATING...' : 'CHECK AVAILABILITY'}
            </button>

            {checkSlotActive && (
              <button
                onClick={() => {
                  setCheckSlotActive(false);
                  setSlotResults(null);
                }}
                className="py-2 px-3 rounded-xl text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                title="Reset to all rooms"
              >
                RESET
              </button>
            )}
          </div>
        </div>

        {checkSlotActive && (
          <div className="text-xs font-mono text-emerald-300 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30 flex items-center justify-between">
            <span>
              &bull; Found {slotResults?.length || 0} conflict-free rooms for {slotDate} from {slotStartTime} to {slotEndTime} UTC.
            </span>
            <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">SQL NOT EXISTS EXECUTED</span>
          </div>
        )}
      </div>

      {/* Filter Matrix Toolbar */}
      <div className="p-4 rounded-2xl glass-panel space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search room by number (e.g., '101'), building name, or facility type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            SEARCH
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          {/* Building Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">BUILDING</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Campus Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">ROOM TYPE</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Room Types</option>
              <option value="CLASSROOM">Classroom</option>
              <option value="LAB">Lab / Mechatronics</option>
              <option value="AUDITORIUM">Auditorium</option>
              <option value="CONFERENCE">Conference Room</option>
              <option value="STUDY_POD">Digital Study Pod</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 mb-1">STATUS</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          {/* Min Capacity Slider */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>MIN CAPACITY</span>
              <span className="text-cyan-300 font-bold">{minCapacity} SEATS</span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="10"
              value={minCapacity}
              onChange={(e) => setMinCapacity(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="text-center py-16 text-cyan-400 font-mono text-sm animate-pulse">
          Querying room records and relational constraints...
        </div>
      ) : displayedRooms.length === 0 ? (
        <div className="text-center py-16 glass-panel rounded-2xl space-y-2">
          <DoorClosed className="w-8 h-8 text-slate-500 mx-auto" />
          <h4 className="text-base font-semibold text-slate-200">No matching rooms found</h4>
          <p className="text-xs text-slate-400">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedRooms.map((room) => {
            const statusStyle = {
              AVAILABLE: {
                border: 'border-emerald-500/30 hover:border-emerald-400',
                badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                dot: 'bg-emerald-400 glow-emerald',
              },
              OCCUPIED: {
                border: 'border-amber-500/30 hover:border-amber-400',
                badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                dot: 'bg-amber-400 glow-amber',
              },
              MAINTENANCE: {
                border: 'border-rose-500/30 hover:border-rose-400',
                badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                dot: 'bg-rose-400 glow-rose',
              },
            }[room.status];

            return (
              <div
                key={room.id}
                className={`p-4 rounded-2xl glass-panel ${statusStyle.border} transition-all duration-200 flex flex-col justify-between space-y-4`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
                      {room.building_code || 'COMPLEX'}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center space-x-1.5 ${statusStyle.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                      <span>{room.status}</span>
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-lg font-bold text-white font-mono">
                      Room {room.room_number}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {room.building_name} &bull; Floor {room.floor}
                    </p>
                  </div>

                  {/* Metadata Specs */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center space-x-1.5 text-slate-300">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{room.capacity} Seats</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 text-center">
                      <span>{room.room_type}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    {room.has_projector && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400">
                        Projector
                      </span>
                    )}
                    {room.has_ac && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                        HVAC AC
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <button
                    disabled={room.status === 'MAINTENANCE'}
                    onClick={() => onOpenBookingModal(room)}
                    className="w-full py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 hover:border-cyan-400 transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-cyan-300"
                  >
                    {room.status === 'MAINTENANCE' ? 'OFFLINE FOR SERVICE' : 'RESERVE SPACE'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
