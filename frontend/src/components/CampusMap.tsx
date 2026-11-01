import React, { useState, useEffect } from 'react';
import { 
  Maximize2,
  X,
  Users,
  Tv,
  Wind
} from 'lucide-react';
import { Building, Room, RoomDetail } from '../types';
import { api } from '../services/api';

interface CampusMapProps {
  buildings: Building[];
  onOpenBookingModal: (room: Room) => void;
}

export const CampusMap: React.FC<CampusMapProps> = ({ buildings, onOpenBookingModal }) => {
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(buildings[0]?.id || 1);
  const [buildingDetails, setBuildingDetails] = useState<{ building: Building; rooms: Room[] } | null>(null);
  const [selectedRoomDetail, setSelectedRoomDetail] = useState<RoomDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [filterFloor, setFilterFloor] = useState<number | 'all'>('all');

  const loadBuildingDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const data = await api.getBuildingById(id);
      setBuildingDetails(data);
      setFilterFloor('all');
    } catch (err) {
      console.error('Failed to load building details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedBuildingId) {
      loadBuildingDetails(selectedBuildingId);
    }
  }, [selectedBuildingId]);

  const handleSelectRoom = async (roomId: number) => {
    try {
      const detail = await api.getRoomDetails(roomId);
      setSelectedRoomDetail(detail);
    } catch (err) {
      console.error('Failed to load room details:', err);
    }
  };

  const buildingMapCoords: Record<string, { x: number; y: number; w: number; h: number }> = {
    ENG: { x: 180, y: 150, w: 190, h: 140 },
    TURING: { x: 440, y: 100, w: 200, h: 150 },
    SCI: { x: 720, y: 160, w: 190, h: 140 },
    LIB: { x: 260, y: 390, w: 210, h: 160 },
    STU: { x: 600, y: 380, w: 220, h: 160 },
  };

  const filteredRooms = buildingDetails?.rooms.filter(r => 
    filterFloor === 'all' ? true : r.floor === filterFloor
  ) || [];

  const uniqueFloors = buildingDetails ? Array.from(new Set(buildingDetails.rooms.map(r => r.floor))).sort((a,b)=>a-b) : [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1B24] pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Interactive Campus Map
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Select a facility to inspect floor plans, real-time occupancy, and reserve available rooms.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs bg-[#0C0C12] px-3.5 py-2 rounded-lg border border-[#1E1D2A]">
          <div className="flex items-center space-x-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center space-x-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Occupied</span>
          </div>
          <div className="flex items-center space-x-1.5 text-zinc-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
            <span>Maintenance</span>
          </div>
        </div>
      </div>

      {/* Main Map + Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Canvas Container (8 cols) */}
        <div className="lg:col-span-8 surface-card rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-[#1C1B24] pb-2.5 mb-3">
            <span className="font-semibold text-white">Campus Architectural Ground Plan</span>
            <span>5 Facilities Mapped</span>
          </div>

          <div className="w-full aspect-[16/10] relative rounded-lg overflow-hidden bg-black border border-[#1E1D2A] flex items-center justify-center">
            <svg 
              viewBox="0 0 1000 640" 
              className="w-full h-full select-none"
            >
              {/* Campus Walkways */}
              <path 
                d="M 275,220 L 540,175 L 815,230 L 710,460 L 365,470 Z" 
                fill="none" 
                stroke="#15141E" 
                strokeWidth="24" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path 
                d="M 275,220 L 365,470 M 540,175 L 710,460 M 540,175 L 365,470" 
                fill="none" 
                stroke="#15141E" 
                strokeWidth="16" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Central Courtyard */}
              <circle cx="500" cy="320" r="38" fill="#0E0D17" stroke="#252136" strokeWidth="2" />
              <text x="500" y="324" textAnchor="middle" fill="#A1A1AA" fontSize="11" fontWeight="500">
                Central Quad
              </text>

              {/* Interactive Building Footprints */}
              {buildings.map((b) => {
                const coords = buildingMapCoords[b.code] || { x: b.map_x * 9, y: b.map_y * 6, w: 190, h: 140 };
                const isSelected = selectedBuildingId === b.id;

                return (
                  <g 
                    key={b.id}
                    id={`map-building-${b.code.toLowerCase()}`}
                    onClick={() => setSelectedBuildingId(b.id)}
                    className="cursor-pointer group"
                  >
                    {/* Building Box */}
                    <rect
                      x={coords.x}
                      y={coords.y}
                      width={coords.w}
                      height={coords.h}
                      rx="8"
                      fill={isSelected ? "#19142A" : "#0D0D14"}
                      stroke={isSelected ? "#8B5CF6" : "#222030"}
                      strokeWidth={isSelected ? "2" : "1"}
                      className="transition-colors group-hover:stroke-violet-400"
                    />

                    {/* Building Code Badge */}
                    <rect
                      x={coords.x + 12}
                      y={coords.y + 12}
                      width="54"
                      height="22"
                      rx="4"
                      fill={isSelected ? "#2E1065" : "#1A1926"}
                    />
                    <text
                      x={coords.x + 39}
                      y={coords.y + 27}
                      textAnchor="middle"
                      fill={isSelected ? "#DDD6FE" : "#F4F4F5"}
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {b.code}
                    </text>

                    {/* Building Name */}
                    <text
                      x={coords.x + 12}
                      y={coords.y + 56}
                      fill="#FFFFFF"
                      fontSize="13"
                      fontWeight="600"
                    >
                      {b.name.length > 20 ? b.name.slice(0, 19) + '...' : b.name}
                    </text>

                    {/* Subtitle Floors / Rooms */}
                    <text
                      x={coords.x + 12}
                      y={coords.y + 74}
                      fill="#A1A1AA"
                      fontSize="11"
                    >
                      {b.floors} Floors &bull; {b.total_rooms} Rooms
                    </text>

                    {/* Status Breakdown Pills */}
                    <g transform={`translate(${coords.x + 12}, ${coords.y + 92})`}>
                      {/* Available */}
                      <rect x="0" y="0" width="48" height="20" rx="4" fill="#064E3B" />
                      <circle cx="8" cy="10" r="3" fill="#34D399" />
                      <text x="28" y="14" textAnchor="middle" fill="#A7F3D0" fontSize="11" fontWeight="bold">
                        {b.available_rooms}
                      </text>

                      {/* Occupied */}
                      <rect x="54" y="0" width="48" height="20" rx="4" fill="#78350F" />
                      <circle cx="62" cy="10" r="3" fill="#FBBF24" />
                      <text x="82" y="14" textAnchor="middle" fill="#FDE68A" fontSize="11" fontWeight="bold">
                        {b.occupied_rooms}
                      </text>

                      {/* Maintenance */}
                      <rect x="108" y="0" width="48" height="20" rx="4" fill="#881337" />
                      <circle cx="116" cy="10" r="3" fill="#F43F5E" />
                      <text x="136" y="14" textAnchor="middle" fill="#FECDD3" fontSize="11" fontWeight="bold">
                        {b.maintenance_rooms}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-[#1C1B24]">
            <span>Click any complex to inspect rooms and availability.</span>
            <span className="text-violet-300 font-medium">{buildings.find(b => b.id === selectedBuildingId)?.name} selected</span>
          </div>
        </div>

        {/* Selected Building Floor Inspector (4 cols) */}
        <div className="lg:col-span-4 surface-card rounded-xl p-5 flex flex-col justify-between">
          <div>
            {/* Inspector Header */}
            <div className="flex items-start justify-between border-b border-[#1C1B24] pb-3">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {buildingDetails?.building.name || 'Building Details'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {buildingDetails?.building.description || 'Facility room directory.'}
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-violet-950/60 text-violet-300 border border-violet-800/60">
                {buildingDetails?.building.code || 'ENG'}
              </span>
            </div>

            {/* Occupancy Progress Bar */}
            {buildingDetails && (
              <div className="mt-4 p-3 rounded-lg bg-[#07070B] border border-[#1E1D2A] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Occupancy Distribution</span>
                  <span className="text-zinc-200 font-medium tabular-nums">
                    {Math.round(((buildingDetails.building.occupied_rooms || 0) / (buildingDetails.building.total_rooms || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden flex">
                  <div 
                    style={{ width: `${(buildingDetails.building.available_rooms / (buildingDetails.building.total_rooms || 1)) * 100}%` }}
                    className="bg-emerald-500 h-full"
                    title={`Available: ${buildingDetails.building.available_rooms}`}
                  />
                  <div 
                    style={{ width: `${(buildingDetails.building.occupied_rooms / (buildingDetails.building.total_rooms || 1)) * 100}%` }}
                    className="bg-amber-500 h-full"
                    title={`Occupied: ${buildingDetails.building.occupied_rooms}`}
                  />
                  <div 
                    style={{ width: `${(buildingDetails.building.maintenance_rooms / (buildingDetails.building.total_rooms || 1)) * 100}%` }}
                    className="bg-rose-500 h-full"
                    title={`Maintenance: ${buildingDetails.building.maintenance_rooms}`}
                  />
                </div>
              </div>
            )}

            {/* Floor Filter Tabs */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                <span>Filter by Floor</span>
                <span className="text-zinc-300">{filteredRooms.length} rooms</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterFloor('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    filterFloor === 'all'
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'bg-[#12111A] text-zinc-300 hover:text-white border border-[#222030]'
                  }`}
                >
                  All
                </button>
                {uniqueFloors.map(floor => (
                  <button
                    key={floor}
                    onClick={() => setFilterFloor(floor)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      filterFloor === floor
                        ? 'bg-violet-600 text-white font-semibold'
                        : 'bg-[#12111A] text-zinc-300 hover:text-white border border-[#222030]'
                    }`}
                  >
                    Floor {floor}
                  </button>
                ))}
              </div>
            </div>

            {/* Room List */}
            <div className="mt-4 max-h-[300px] overflow-y-auto divide-y divide-[#1C1B24] pr-1">
              {loadingDetails ? (
                <div className="text-center py-8 text-xs text-zinc-400">
                  Loading rooms...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-400">
                  No rooms found for this floor.
                </div>
              ) : (
                filteredRooms.map(room => {
                  const statusBadge = {
                    AVAILABLE: 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
                    OCCUPIED: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
                    MAINTENANCE: 'bg-rose-950/40 text-rose-300 border-rose-800/40',
                  }[room.status];

                  return (
                    <div
                      key={room.id}
                      onClick={() => handleSelectRoom(room.id)}
                      className="py-2.5 px-2 hover:bg-[#151422] rounded-lg transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-semibold text-sm text-zinc-200 group-hover:text-violet-300">
                          Room {room.room_number}
                        </div>
                        <div className="text-xs text-zinc-400 mt-0.5">
                          {room.room_type} &bull; {room.capacity} seats
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusBadge}`}>
                          {room.status}
                        </span>
                        <Maximize2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-violet-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1C1B24] text-xs text-zinc-400 text-center">
            Click any room to view details or reserve.
          </div>
        </div>
      </div>

      {/* Room Details Modal */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl surface-elevated p-6 border border-[#2D273F] relative space-y-4">
            <button
              onClick={() => setSelectedRoomDetail(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/60">
                  {selectedRoomDetail.building_code}
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                  {selectedRoomDetail.status}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-2">
                Room {selectedRoomDetail.room_number} &bull; {selectedRoomDetail.building_name}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Floor {selectedRoomDetail.floor} &bull; {selectedRoomDetail.room_type}
              </p>
            </div>

            {/* Hardware Specs */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0C0C12] border border-[#1E1D2A] flex items-center space-x-2 text-zinc-300">
                <Users className="w-4 h-4 text-violet-400" />
                <span>{selectedRoomDetail.capacity} Seats</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0C0C12] border border-[#1E1D2A] flex items-center space-x-2 text-zinc-300">
                <Tv className="w-4 h-4 text-violet-400" />
                <span>{selectedRoomDetail.has_projector ? 'Projector' : 'No Display'}</span>
              </div>
              <div className="p-3 rounded-lg bg-[#0C0C12] border border-[#1E1D2A] flex items-center space-x-2 text-zinc-300">
                <Wind className="w-4 h-4 text-violet-400" />
                <span>{selectedRoomDetail.has_ac ? 'Climate Control' : 'Standard'}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedRoomDetail(null)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const roomToBook = selectedRoomDetail;
                  setSelectedRoomDetail(null);
                  onOpenBookingModal(roomToBook);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer shadow-sm"
              >
                Book This Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
