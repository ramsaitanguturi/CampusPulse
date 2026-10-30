import React, { useState, useEffect } from 'react';
import { 
  DoorClosed, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar,
  Maximize2,
  X
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
  const [loadingRoom, setLoadingRoom] = useState(false);
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
    setLoadingRoom(true);
    try {
      const detail = await api.getRoomDetails(roomId);
      setSelectedRoomDetail(detail);
    } catch (err) {
      console.error('Failed to load room details:', err);
    } finally {
      setLoadingRoom(false);
    }
  };

  // Fixed SVG positions for the 5 campus zones
  const buildingMapCoords: Record<string, { x: number; y: number; w: number; h: number; polygon: string }> = {
    ENG: { 
      x: 180, y: 160, w: 180, h: 140, 
      polygon: "180,160 360,160 360,300 240,300 240,240 180,240" 
    },
    TURING: { 
      x: 440, y: 110, w: 200, h: 150, 
      polygon: "440,110 640,110 640,260 540,260 540,210 440,210" 
    },
    SCI: { 
      x: 720, y: 170, w: 190, h: 140, 
      polygon: "720,170 910,170 910,310 790,310 790,260 720,260" 
    },
    LIB: { 
      x: 260, y: 400, w: 220, h: 160, 
      polygon: "260,400 480,400 480,560 380,560 380,510 260,510" 
    },
    STU: { 
      x: 600, y: 390, w: 230, h: 170, 
      polygon: "600,390 830,390 830,560 710,560 710,500 600,500" 
    },
  };

  const filteredRooms = buildingDetails?.rooms.filter(r => 
    filterFloor === 'all' ? true : r.floor === filterFloor
  ) || [];

  const uniqueFloors = buildingDetails ? Array.from(new Set(buildingDetails.rooms.map(r => r.floor))).sort((a,b)=>a-b) : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl glass-panel border border-cyan-500/20">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-mono tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Interactive Spatial Engine &bull; SVG Digital Twin</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide mt-1">
            Smart Campus Interactive Map
          </h2>
          <p className="text-xs text-slate-400">
            Click on any building footprint to inspect floors, live room occupancy, and book rooms with collision prevention.
          </p>
        </div>

        {/* Status Legend */}
        <div className="flex items-center gap-3 text-xs font-mono bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 glow-emerald"></span>
            <span>AVAILABLE</span>
          </div>
          <div className="flex items-center space-x-1.5 text-amber-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 glow-amber"></span>
            <span>OCCUPIED</span>
          </div>
          <div className="flex items-center space-x-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 glow-rose"></span>
            <span>MAINTENANCE</span>
          </div>
        </div>
      </div>

      {/* Main Map + Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG 2D Canvas Container (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl glass-panel-glow p-4 relative overflow-hidden flex flex-col justify-between">
          {/* Top Canvas Coordinates */}
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400/70 border-b border-cyan-500/10 pb-2 mb-2">
            <span>SECTOR: GRID MATRIX // LAT 42.3601 N &bull; LON 71.0942 W</span>
            <span>PROJECTION: 2D TOPOGRAPHIC DIGITAL TWIN</span>
          </div>

          <div className="w-full aspect-[16/10] relative rounded-xl overflow-hidden bg-[#050811] border border-cyan-500/20 cyber-grid flex items-center justify-center">
            <svg 
              viewBox="0 0 1000 650" 
              className="w-full h-full select-none"
            >
              <defs>
                {/* Glowing Gradients */}
                <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0891B2" stopOpacity="0.1" />
                </linearGradient>

                <linearGradient id="selectedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.25" />
                </linearGradient>

                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Campus Boundary & Compass Radar Rings */}
              <circle cx="500" cy="325" r="280" fill="none" stroke="#0891B2" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.25" />
              <circle cx="500" cy="325" r="160" fill="none" stroke="#0891B2" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.2" />
              <line x1="50" y1="325" x2="950" y2="325" stroke="#0891B2" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.15" />
              <line x1="500" y1="50" x2="500" y2="600" stroke="#0891B2" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.15" />

              {/* Glowing Pathways connecting buildings */}
              <path 
                d="M 270,230 L 540,185 L 815,240 L 715,475 L 370,480 Z" 
                fill="none" 
                stroke="#06B6D4" 
                strokeWidth="2" 
                strokeDasharray="6 8" 
                opacity="0.35" 
              />
              <path 
                d="M 270,230 L 370,480 M 540,185 L 715,475 M 540,185 L 370,480" 
                fill="none" 
                stroke="#38BDF8" 
                strokeWidth="1.2" 
                strokeDasharray="4 6" 
                opacity="0.25" 
              />

              {/* Central Plaza Nexus */}
              <circle cx="500" cy="325" r="32" fill="#0E1E38" stroke="#06B6D4" strokeWidth="1.5" opacity="0.6" />
              <circle cx="500" cy="325" r="14" fill="#06B6D4" opacity="0.2" className="animate-pulse" />
              <text x="500" y="329" textAnchor="middle" fill="#38BDF8" fontSize="10" fontFamily="monospace" fontWeight="bold">NEXUS</text>

              {/* Interactive Building Polygons */}
              {buildings.map((b) => {
                const coords = buildingMapCoords[b.code] || { x: b.map_x * 9, y: b.map_y * 6, w: 180, h: 140, polygon: "" };
                const isSelected = selectedBuildingId === b.id;

                return (
                  <g 
                    key={b.id}
                    id={`map-building-${b.code.toLowerCase()}`}
                    onClick={() => setSelectedBuildingId(b.id)}
                    className="cursor-pointer transition-all duration-300 group"
                  >
                    {/* Footprint polygon / rect */}
                    <rect
                      x={coords.x}
                      y={coords.y}
                      width={coords.w}
                      height={coords.h}
                      rx="12"
                      fill={isSelected ? "url(#selectedGrad)" : "url(#cyanGrad)"}
                      stroke={isSelected ? "#22D3EE" : "#0891B2"}
                      strokeWidth={isSelected ? "2.5" : "1.2"}
                      filter={isSelected ? "url(#glow)" : undefined}
                      className="transition-all duration-300 group-hover:stroke-cyan-300"
                    />

                    {/* Building Code Badge */}
                    <rect
                      x={coords.x + 12}
                      y={coords.y + 12}
                      width="52"
                      height="22"
                      rx="6"
                      fill="#070B14"
                      stroke={isSelected ? "#22D3EE" : "#0891B2"}
                      strokeWidth="1"
                    />
                    <text
                      x={coords.x + 38}
                      y={coords.y + 27}
                      textAnchor="middle"
                      fill="#22D3EE"
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {b.code}
                    </text>

                    {/* Building Name */}
                    <text
                      x={coords.x + 12}
                      y={coords.y + 54}
                      fill="#FFFFFF"
                      fontSize="13"
                      fontWeight="600"
                      className="group-hover:fill-cyan-200"
                    >
                      {b.name.length > 20 ? b.name.slice(0, 19) + '...' : b.name}
                    </text>

                    {/* Floors & Status Subtitle */}
                    <text
                      x={coords.x + 12}
                      y={coords.y + 72}
                      fill="#94A3B8"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {b.floors} FLOORS &bull; {b.total_rooms} ROOMS
                    </text>

                    {/* Live Status Indicators (Green / Amber / Red Dots) */}
                    <g transform={`translate(${coords.x + 14}, ${coords.y + 88})`}>
                      {/* Available Pill */}
                      <rect x="0" y="0" width="46" height="20" rx="4" fill="#064E3B" stroke="#059669" strokeWidth="0.8" />
                      <circle cx="8" cy="10" r="3.5" fill="#34D399" />
                      <text x="26" y="14" textAnchor="middle" fill="#A7F3D0" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {b.available_rooms}
                      </text>

                      {/* Occupied Pill */}
                      <rect x="52" y="0" width="46" height="20" rx="4" fill="#78350F" stroke="#D97706" strokeWidth="0.8" />
                      <circle cx="60" cy="10" r="3.5" fill="#FBBF24" />
                      <text x="78" y="14" textAnchor="middle" fill="#FDE68A" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {b.occupied_rooms}
                      </text>

                      {/* Maintenance Pill */}
                      <rect x="104" y="0" width="46" height="20" rx="4" fill="#881337" stroke="#E11D48" strokeWidth="0.8" />
                      <circle cx="112" cy="10" r="3.5" fill="#F43F5E" />
                      <text x="130" y="14" textAnchor="middle" fill="#FECDD3" fontSize="10" fontFamily="monospace" fontWeight="bold">
                        {b.maintenance_rooms}
                      </text>
                    </g>

                    {/* Pulsing beacon if selected */}
                    {isSelected && (
                      <circle
                        cx={coords.x + coords.w - 18}
                        cy={coords.y + 18}
                        r="6"
                        fill="#06B6D4"
                        className="animate-ping"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800">
            <span>Tip: Select any building above or choose from the side panel to view floor plan rooms.</span>
            <span className="font-mono text-cyan-400">STATUS: CALIBRATED</span>
          </div>
        </div>

        {/* Selected Building Floor Inspector (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl glass-panel p-5 flex flex-col justify-between">
          <div>
            {/* Inspector Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest uppercase text-cyan-400">
                  Building Facility Telemetry
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {buildingDetails?.building.name || 'Select a Building'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {buildingDetails?.building.description || 'Spatial occupancy details.'}
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {buildingDetails?.building.code || 'ENG'}
              </span>
            </div>

            {/* Occupancy Progress Bar */}
            {buildingDetails && (
              <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Occupancy Distribution:</span>
                  <span className="text-cyan-300">
                    {Math.round(((buildingDetails.building.occupied_rooms || 0) / (buildingDetails.building.total_rooms || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
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
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-mono uppercase tracking-wider text-[10px]">Filter Floor Level:</span>
                <span className="text-cyan-400 font-mono text-[10px]">{filteredRooms.length} ROOMS</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterFloor('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    filterFloor === 'all'
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  ALL
                </button>
                {uniqueFloors.map(floor => (
                  <button
                    key={floor}
                    onClick={() => setFilterFloor(floor)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      filterFloor === floor
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    FLOOR {floor}
                  </button>
                ))}
              </div>
            </div>

            {/* Room List Grid */}
            <div className="mt-4 max-h-[320px] overflow-y-auto space-y-2 pr-1">
              {loadingDetails ? (
                <div className="text-center py-8 text-xs text-slate-400 animate-pulse">
                  Loading spatial room data...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No rooms mapped to this floor.
                </div>
              ) : (
                filteredRooms.map(room => {
                  const statusColors = {
                    AVAILABLE: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:border-emerald-400',
                    OCCUPIED: 'border-amber-500/30 bg-amber-950/20 text-amber-300 hover:border-amber-400',
                    MAINTENANCE: 'border-rose-500/30 bg-rose-950/20 text-rose-300 hover:border-rose-400',
                  }[room.status];

                  const dotColor = {
                    AVAILABLE: 'bg-emerald-400 glow-emerald',
                    OCCUPIED: 'bg-amber-400 glow-amber',
                    MAINTENANCE: 'bg-rose-400 glow-rose',
                  }[room.status];

                  return (
                    <div
                      key={room.id}
                      onClick={() => handleSelectRoom(room.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${statusColors}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                        <div>
                          <div className="font-mono font-bold text-sm text-white group-hover:text-cyan-300">
                            Room {room.room_number}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {room.room_type} &bull; Cap: {room.capacity}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                          {room.status}
                        </span>
                        <Maximize2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-400 text-center">
            Click any room card for details & conflict-free booking.
          </div>
        </div>
      </div>

      {/* Room Details Modal */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl glass-panel-glow p-6 border border-cyan-500/40 relative space-y-4">
            <button
              onClick={() => setSelectedRoomDetail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center glow-cyan">
                <DoorClosed className="w-6 h-6 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
                  {selectedRoomDetail.building_name} ({selectedRoomDetail.building_code})
                </span>
                <h3 className="text-xl font-bold text-white">
                  Room {selectedRoomDetail.room_number}
                </h3>
              </div>
            </div>

            {/* Room Specs Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">FLOOR / CAPACITY</span>
                <span className="text-slate-100 font-bold text-sm">Floor {selectedRoomDetail.floor} / {selectedRoomDetail.capacity} Seats</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">ROOM TYPE</span>
                <span className="text-slate-100 font-bold text-sm">{selectedRoomDetail.room_type}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">CURRENT STATUS</span>
                <span className={`font-bold text-sm ${
                  selectedRoomDetail.status === 'AVAILABLE' ? 'text-emerald-400' :
                  selectedRoomDetail.status === 'OCCUPIED' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {selectedRoomDetail.status}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">EQUIPMENT</span>
                <span className="text-slate-100 font-medium">
                  {selectedRoomDetail.has_projector ? 'Projector' : 'No Proj'} &bull; {selectedRoomDetail.has_ac ? 'HVAC AC' : 'Standard'}
                </span>
              </div>
            </div>

            {/* Active Session Info */}
            {selectedRoomDetail.active_booking_title ? (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs">
                <div className="flex items-center space-x-1.5 text-amber-400 font-mono font-bold mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>ACTIVE BOOKING IN PROGRESS</span>
                </div>
                <p className="text-amber-200">{selectedRoomDetail.active_booking_title}</p>
                {selectedRoomDetail.active_booking_end && (
                  <p className="text-[10px] font-mono text-amber-300/80 mt-1">
                    Concludes at: {new Date(selectedRoomDetail.active_booking_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ) : selectedRoomDetail.status === 'AVAILABLE' ? (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Room is currently unoccupied and ready for immediate reservation.</span>
              </div>
            ) : null}

            {/* Maintenance Warning */}
            {selectedRoomDetail.has_open_ticket && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Active maintenance ticket logged for this room. Facility engineering is assigned.</span>
              </div>
            )}

            {/* Upcoming Bookings */}
            {selectedRoomDetail.upcoming_bookings && selectedRoomDetail.upcoming_bookings.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                  Upcoming Reserved Windows:
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {selectedRoomDetail.upcoming_bookings.map(ub => (
                    <div key={ub.id} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs flex justify-between items-center">
                      <span className="text-slate-200 font-medium truncate max-w-[200px]">{ub.title}</span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {new Date(ub.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedRoomDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                CLOSE
              </button>
              {selectedRoomDetail.status !== 'MAINTENANCE' && (
                <button
                  id="btn-modal-book-room"
                  onClick={() => {
                    const r = selectedRoomDetail;
                    setSelectedRoomDetail(null);
                    onOpenBookingModal(r);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all glow-cyan"
                >
                  SCHEDULE BOOKING
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
