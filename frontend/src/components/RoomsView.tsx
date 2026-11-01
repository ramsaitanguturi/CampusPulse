import React, { useState, useEffect } from 'react';
import { 
  DoorClosed, 
  Search, 
  Users,
  Tv,
  Wind
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

  // Time-specific availability query state
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1B24] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Campus Room Directory
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Browse rooms, check hardware amenities, or query collision-free time slot availability.
          </p>
        </div>

        <div className="text-xs text-zinc-300 bg-[#0C0C12] px-3.5 py-2 rounded-lg border border-[#1E1D2A] flex items-center space-x-2">
          <DoorClosed className="w-4 h-4 text-violet-400" />
          <span className="tabular-nums font-medium">{displayedRooms.length} rooms listed</span>
        </div>
      </div>

      {/* Interval Availability Query */}
      <div className="surface-card rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1B24] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Check Specific Time Window Availability
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Queries rooms with zero conflicting confirmed bookings during the requested interval.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Target Date</label>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Start Time</label>
            <input
              type="time"
              value={slotStartTime}
              onChange={(e) => setSlotStartTime(e.target.value)}
              className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium">End Time</label>
            <input
              type="time"
              value={slotEndTime}
              onChange={(e) => setSlotEndTime(e.target.value)}
              className="w-full bg-black border border-[#272635] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-check-availability"
              onClick={handleCheckSlotAvailability}
              disabled={slotLoading}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {slotLoading ? 'Checking...' : 'Check Availability'}
            </button>

            {checkSlotActive && (
              <button
                onClick={() => {
                  setCheckSlotActive(false);
                  setSlotResults(null);
                }}
                className="py-2 px-3 rounded-lg text-xs bg-[#14141C] hover:bg-[#1E1E2A] text-zinc-300 border border-[#252433] transition-colors cursor-pointer"
                title="Reset to all rooms"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {checkSlotActive && (
          <div className="text-xs text-emerald-300 bg-emerald-950/30 p-3 rounded-lg border border-emerald-800/40 flex items-center justify-between">
            <span>
              Found {slotResults?.length || 0} available spaces on {slotDate} between {slotStartTime} and {slotEndTime}.
            </span>
            <span className="text-xs text-emerald-400 font-medium">Active Filter</span>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="surface-card rounded-xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by room number (e.g. 101), building name, or room type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-black border border-[#272635] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#14141C] hover:bg-[#1E1E2A] text-zinc-200 text-xs font-medium rounded-lg border border-[#252433] transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Building Filter */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Building</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full bg-black border border-[#272635] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="ALL">All Buildings</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Room Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-black border border-[#272635] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="CLASSROOM">Classroom</option>
              <option value="LAB">Lab / Mechatronics</option>
              <option value="AUDITORIUM">Auditorium</option>
              <option value="CONFERENCE">Conference Room</option>
              <option value="STUDY_POD">Study Pod</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-black border border-[#272635] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          {/* Min Capacity Slider */}
          <div>
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Min Capacity</span>
              <span className="text-zinc-200 font-medium">{minCapacity} seats</span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="10"
              value={minCapacity}
              onChange={(e) => setMinCapacity(Number(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="text-center py-16 text-zinc-400 text-sm">
          Loading rooms...
        </div>
      ) : displayedRooms.length === 0 ? (
        <div className="text-center py-16 surface-card rounded-xl space-y-2">
          <DoorClosed className="w-8 h-8 text-zinc-500 mx-auto" />
          <h4 className="text-base font-semibold text-zinc-200">No matching rooms found</h4>
          <p className="text-xs text-zinc-400">Try adjusting your filters or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayedRooms.map((room) => {
            const statusStyle = {
              AVAILABLE: {
                badge: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
                dot: 'bg-emerald-500',
              },
              OCCUPIED: {
                badge: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
                dot: 'bg-amber-500',
              },
              MAINTENANCE: {
                badge: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
                dot: 'bg-rose-500',
              },
            }[room.status];

            return (
              <div
                key={room.id}
                className="surface-card p-4 rounded-xl hover:border-violet-500/40 transition-colors flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-950/60 border border-violet-800/50 text-violet-300">
                      {room.building_code || 'COMPLEX'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border flex items-center space-x-1.5 font-medium ${statusStyle.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`}></span>
                      <span>{room.status}</span>
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-base font-bold text-white">
                      Room {room.room_number}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {room.building_name} &bull; Floor {room.floor}
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <div className="px-2.5 py-1 rounded-md bg-black border border-[#22212E] flex items-center space-x-1.5 text-zinc-300">
                      <Users className="w-3.5 h-3.5 text-violet-400" />
                      <span>{room.capacity} seats</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-md bg-black border border-[#22212E] text-zinc-300">
                      <span>{room.room_type}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-400">
                    {room.has_projector && (
                      <span className="px-2 py-0.5 rounded bg-[#14141C] border border-[#252433] text-zinc-300 flex items-center space-x-1">
                        <Tv className="w-3 h-3 text-violet-400" />
                        <span>Projector</span>
                      </span>
                    )}
                    {room.has_ac && (
                      <span className="px-2 py-0.5 rounded bg-[#14141C] border border-[#252433] text-zinc-300 flex items-center space-x-1">
                        <Wind className="w-3 h-3 text-violet-400" />
                        <span>AC</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1C1B24]">
                  <button
                    disabled={room.status === 'MAINTENANCE'}
                    onClick={() => onOpenBookingModal(room)}
                    className="w-full py-2 rounded-lg text-xs font-medium bg-[#14141C] hover:bg-violet-600 hover:text-white text-zinc-200 border border-[#252433] transition-colors disabled:opacity-40 disabled:hover:bg-[#14141C] disabled:hover:text-zinc-200 cursor-pointer"
                  >
                    {room.status === 'MAINTENANCE' ? 'Offline for Maintenance' : 'Reserve Space'}
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
