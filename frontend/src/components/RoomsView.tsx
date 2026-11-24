import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchRooms();
  }, [selectedBuilding, selectedType, selectedStatus, minCapacity]);

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
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            Space Inventory &amp; Directory
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Physical facilities, hardware amenities, and collision-free interval availability queries
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="border border-neutral-800 px-2.5 py-1 text-neutral-400">
            {displayedRooms.length} SPACES LISTED
          </span>
        </div>
      </div>

      {/* Interval Availability Query */}
      <div className="bg-black border border-neutral-800 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-900 pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Collision-Free Time Window Availability Query
            </h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              Queries rooms with zero conflicting confirmed bookings during the requested interval
            </p>
          </div>
          <span className="text-[10px] text-neutral-500 border border-neutral-800 px-2 py-0.5">
            ACID CHECK
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Target Date</label>
            <input
              type="date"
              value={slotDate}
              onChange={(e) => setSlotDate(e.target.value)}
              className="w-full bg-black border border-neutral-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Start Time</label>
            <input
              type="time"
              value={slotStartTime}
              onChange={(e) => setSlotStartTime(e.target.value)}
              className="w-full bg-black border border-neutral-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white"
            />
          </div>

          <div>
            <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">End Time</label>
            <input
              type="time"
              value={slotEndTime}
              onChange={(e) => setSlotEndTime(e.target.value)}
              className="w-full bg-black border border-neutral-700 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-check-availability"
              onClick={handleCheckSlotAvailability}
              disabled={slotLoading}
              className="flex-1 py-1.5 px-3 text-xs font-bold bg-white text-black hover:bg-neutral-200 transition cursor-pointer disabled:opacity-40"
            >
              {slotLoading ? '[CHECKING...]' : '[CHECK AVAILABILITY]'}
            </button>

            {checkSlotActive && (
              <button
                onClick={() => {
                  setCheckSlotActive(false);
                  setSlotResults(null);
                }}
                className="py-1.5 px-3 text-xs bg-black text-neutral-300 border border-neutral-700 hover:bg-neutral-900 transition cursor-pointer"
                title="Reset to all rooms"
              >
                [RESET]
              </button>
            )}
          </div>
        </div>

        {checkSlotActive && (
          <div className="text-xs text-white bg-neutral-950 p-2.5 border border-neutral-800 flex items-center justify-between">
            <span>
              STATUS: FOUND {slotResults?.length || 0} CONFLICT-FREE SPACES ON {slotDate} BETWEEN {slotStartTime} AND {slotEndTime}.
            </span>
            <span className="text-[10px] bg-white text-black font-bold px-1.5 py-0.5">FILTER ACTIVE</span>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-black border border-neutral-800 p-4 space-y-3 font-mono">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="SEARCH BY ROOM # (E.G. 101), COMPLEX, OR SPACE TYPE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-black border border-neutral-700 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white font-mono"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-black hover:bg-neutral-900 text-white text-xs border border-neutral-700 transition cursor-pointer"
          >
            [SEARCH]
          </button>
        </form>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Building Filter */}
          <div>
            <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Building</label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full bg-black border border-neutral-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white cursor-pointer font-mono"
            >
              <option value="ALL">ALL COMPLEXES</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room Type */}
          <div>
            <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Room Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-black border border-neutral-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white cursor-pointer font-mono"
            >
              <option value="ALL">ALL TYPES</option>
              <option value="CLASSROOM">CLASSROOM</option>
              <option value="LAB">LAB / MECHATRONICS</option>
              <option value="AUDITORIUM">AUDITORIUM</option>
              <option value="CONFERENCE">CONFERENCE ROOM</option>
              <option value="STUDY_POD">STUDY POD</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-black border border-neutral-700 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white cursor-pointer font-mono"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="OCCUPIED">OCCUPIED</option>
              <option value="MAINTENANCE">MAINTENANCE</option>
            </select>
          </div>

          {/* Min Capacity Slider */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
              <span>MIN CAPACITY</span>
              <span className="text-white font-bold">{minCapacity} SEATS</span>
            </div>
            <input
              type="range"
              min="0"
              max="250"
              step="10"
              value={minCapacity}
              onChange={(e) => setMinCapacity(Number(e.target.value))}
              className="w-full accent-white cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="text-center py-16 text-neutral-500 text-xs">
          FETCHING SPACES...
        </div>
      ) : displayedRooms.length === 0 ? (
        <div className="text-center py-16 bg-black border border-neutral-800 space-y-2">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white">No Matching Spaces Found</h4>
          <p className="text-xs text-neutral-500">Adjust active query filters or search parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayedRooms.map((room) => {
            const isAvailable = room.status === 'AVAILABLE';
            const isMaintenance = room.status === 'MAINTENANCE';

            return (
              <div
                key={room.id}
                className="bg-black border border-neutral-800 p-4 hover:border-neutral-600 transition-colors flex flex-col justify-between space-y-4 font-mono"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold border border-neutral-700 px-1.5 py-0.5 text-white">
                      [{room.building_code || 'COMPLEX'}]
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 border font-bold ${
                      isAvailable ? 'border-neutral-500 text-white bg-neutral-900' :
                      isMaintenance ? 'border-neutral-800 text-neutral-500 bg-neutral-950' :
                      'border-neutral-700 text-neutral-300'
                    }`}>
                      [{room.status}]
                    </span>
                  </div>

                  <div className="mt-3">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      ROOM #{room.room_number}
                      {room.room_number === 'KSH' && (
                        <span className="block text-xs font-normal text-neutral-400 mt-0.5">KRISHNA SEMINAR HALL</span>
                      )}
                      {room.room_number === 'HSH' && (
                        <span className="block text-xs font-normal text-neutral-400 mt-0.5">HUNDRI SEMINAR HALL</span>
                      )}
                      {room.room_number === 'TSH' && (
                        <span className="block text-xs font-normal text-neutral-400 mt-0.5">TUNGABHADRA SEMINAR HALL</span>
                      )}
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                      {room.building_name} / FL {room.floor}
                    </p>
                  </div>

                  {/* Specs */}
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-neutral-300">
                    <span className="border border-neutral-800 px-2 py-0.5">
                      {room.capacity} SEATS
                    </span>
                    <span className="border border-neutral-800 px-2 py-0.5 text-neutral-400">
                      {room.room_type}
                    </span>
                  </div>

                  {/* Amenities */}
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-neutral-500">
                    {room.has_projector && (
                      <span className="border border-neutral-800 px-1.5 py-0.5 text-neutral-400">
                        [PROJECTOR]
                      </span>
                    )}
                    {room.has_ac && (
                      <span className="border border-neutral-800 px-1.5 py-0.5 text-neutral-400">
                        [HVAC]
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-neutral-900">
                  <button
                    disabled={isMaintenance}
                    onClick={() => onOpenBookingModal(room)}
                    className={`w-full py-1.5 text-xs font-bold transition cursor-pointer ${
                      isMaintenance
                        ? 'border border-neutral-900 text-neutral-600 bg-neutral-950 cursor-not-allowed'
                        : 'bg-white text-black hover:bg-neutral-200'
                    }`}
                  >
                    {isMaintenance ? '[OFFLINE - MAINTENANCE]' : '[RESERVE SPACE]'}
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
