import React, { useState, useEffect } from 'react';
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
    LHB: { x: 180, y: 150, w: 190, h: 140 },
    CC: { x: 440, y: 100, w: 200, h: 150 },
    SCI: { x: 720, y: 160, w: 190, h: 140 },
    SHC: { x: 260, y: 390, w: 210, h: 160 },
    MWB: { x: 600, y: 380, w: 220, h: 160 },
    ENG: { x: 180, y: 150, w: 190, h: 140 },
    TURING: { x: 440, y: 100, w: 200, h: 150 },
    LIB: { x: 260, y: 390, w: 210, h: 160 },
    STU: { x: 600, y: 380, w: 220, h: 160 },
  };

  const filteredRooms = buildingDetails?.rooms.filter(r => 
    filterFloor === 'all' ? true : r.floor === filterFloor
  ) || [];

  const uniqueFloors = buildingDetails ? Array.from(new Set(buildingDetails.rooms.map(r => r.floor))).sort((a,b)=>a-b) : [];

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-800">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
            Campus Spatial Blueprint
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Interactive architectural floorplans, structural nodes, and real-time space occupancy telemetry
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs bg-black px-3 py-1.5 border border-neutral-800">
          <div className="flex items-center space-x-1.5 text-neutral-300">
            <span className="w-2 h-2 bg-white"></span>
            <span>AVAILABLE</span>
          </div>
          <div className="flex items-center space-x-1.5 text-neutral-400">
            <span className="w-2 h-2 bg-neutral-500"></span>
            <span>OCCUPIED</span>
          </div>
          <div className="flex items-center space-x-1.5 text-neutral-500">
            <span className="w-2 h-2 bg-neutral-700"></span>
            <span>MAINTENANCE</span>
          </div>
        </div>
      </div>

      {/* Main Map + Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* SVG Canvas Container (8 cols) */}
        <div className="lg:col-span-8 bg-black border border-neutral-800 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-900 pb-2 mb-3">
            <span className="font-bold uppercase tracking-wider text-white">Campus Architectural Ground Plan</span>
            <span className="border border-neutral-800 px-2 py-0.5 text-[10px]">5 FACILITIES MAPPED</span>
          </div>

          <div className="w-full aspect-[16/10] relative overflow-hidden bg-black border border-neutral-900 flex items-center justify-center">
            <svg 
              viewBox="0 0 1000 640" 
              className="w-full h-full select-none"
            >
              {/* Grid Lines Background */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#151515" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="1000" height="640" fill="url(#grid)" />

              {/* Campus Walkways */}
              <path 
                d="M 275,220 L 540,175 L 815,230 L 710,460 L 365,470 Z" 
                fill="none" 
                stroke="#222222" 
                strokeWidth="20" 
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
              <path 
                d="M 275,220 L 365,470 M 540,175 L 710,460 M 540,175 L 365,470" 
                fill="none" 
                stroke="#222222" 
                strokeWidth="12" 
                strokeLinecap="square"
                strokeLinejoin="miter"
              />

              {/* Central Courtyard */}
              <rect x="460" y="290" width="80" height="60" fill="#0c0c0c" stroke="#333333" strokeWidth="1" />
              <text x="500" y="325" textAnchor="middle" fill="#888888" fontSize="10" fontFamily="monospace">
                CENTRAL QUAD
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
                      fill={isSelected ? "#151515" : "#080808"}
                      stroke={isSelected ? "#ffffff" : "#333333"}
                      strokeWidth={isSelected ? "2" : "1"}
                      className="transition-colors group-hover:stroke-neutral-400"
                    />

                    {/* Building Code Badge */}
                    <rect
                      x={coords.x + 10}
                      y={coords.y + 10}
                      width="54"
                      height="20"
                      fill={isSelected ? "#ffffff" : "#222222"}
                    />
                    <text
                      x={coords.x + 37}
                      y={coords.y + 24}
                      textAnchor="middle"
                      fill={isSelected ? "#000000" : "#ffffff"}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {b.code}
                    </text>

                    {/* Building Name */}
                    <text
                      x={coords.x + 10}
                      y={coords.y + 52}
                      fill="#FFFFFF"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {b.name.length > 20 ? b.name.slice(0, 19) + '..' : b.name}
                    </text>

                    {/* Subtitle Floors / Rooms */}
                    <text
                      x={coords.x + 10}
                      y={coords.y + 70}
                      fill="#777777"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {b.floors} FLOORS / {b.total_rooms} ROOMS
                    </text>

                    {/* Status Breakdown Pills */}
                    <g transform={`translate(${coords.x + 10}, ${coords.y + 88})`}>
                      {/* Available */}
                      <rect x="0" y="0" width="46" height="18" fill="#1e1e1e" stroke="#444444" strokeWidth="1" />
                      <text x="23" y="13" textAnchor="middle" fill="#ffffff" fontSize="9" fontFamily="monospace">
                        A:{b.available_rooms}
                      </text>

                      {/* Occupied */}
                      <rect x="52" y="0" width="46" height="18" fill="#151515" stroke="#333333" strokeWidth="1" />
                      <text x="75" y="13" textAnchor="middle" fill="#888888" fontSize="9" fontFamily="monospace">
                        O:{b.occupied_rooms}
                      </text>

                      {/* Maintenance */}
                      <rect x="104" y="0" width="46" height="18" fill="#101010" stroke="#262626" strokeWidth="1" />
                      <text x="127" y="13" textAnchor="middle" fill="#555555" fontSize="9" fontFamily="monospace">
                        M:{b.maintenance_rooms}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500 mt-3 pt-3 border-t border-neutral-900">
            <span>CLICK NODE TO INSPECT SPACES</span>
            <span className="text-white font-bold">
              [{buildings.find(b => b.id === selectedBuildingId)?.name || 'NONE'}]
            </span>
          </div>
        </div>

        {/* Selected Building Floor Inspector (4 cols) */}
        <div className="lg:col-span-4 bg-black border border-neutral-800 p-4 flex flex-col justify-between font-mono">
          <div>
            {/* Inspector Header */}
            <div className="flex items-start justify-between border-b border-neutral-900 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {buildingDetails?.building.name || 'Building Details'}
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {buildingDetails?.building.description || 'Facility room directory.'}
                </p>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold bg-white text-black">
                [{buildingDetails?.building.code || 'BLD'}]
              </span>
            </div>

            {/* Occupancy Progress Bar */}
            {buildingDetails && (
              <div className="mt-4 p-3 bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-400">OCCUPANCY LOAD</span>
                  <span className="text-white font-bold tabular-nums">
                    {Math.round(((buildingDetails.building.occupied_rooms || 0) / (buildingDetails.building.total_rooms || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-neutral-900 h-1.5 border border-neutral-800 flex">
                  <div 
                    style={{ width: `${(buildingDetails.building.available_rooms / (buildingDetails.building.total_rooms || 1)) * 100}%` }}
                    className="bg-white h-full"
                    title={`Available: ${buildingDetails.building.available_rooms}`}
                  />
                  <div 
                    style={{ width: `${(buildingDetails.building.occupied_rooms / (buildingDetails.building.total_rooms || 1)) * 100}%` }}
                    className="bg-neutral-500 h-full"
                    title={`Occupied: ${buildingDetails.building.occupied_rooms}`}
                  />
                  <div 
                    style={{ width: `${(buildingDetails.building.maintenance_rooms / (buildingDetails.building.total_rooms || 1)) * 100}%` }}
                    className="bg-neutral-700 h-full"
                    title={`Maintenance: ${buildingDetails.building.maintenance_rooms}`}
                  />
                </div>
              </div>
            )}

            {/* Floor Filter Tabs */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                <span>FILTER FLOOR</span>
                <span className="text-white font-bold">{filteredRooms.length} ROOMS</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFilterFloor('all')}
                  className={`px-2 py-1 text-xs cursor-pointer ${
                    filterFloor === 'all'
                      ? 'bg-white text-black font-bold'
                      : 'border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  [ALL]
                </button>
                {uniqueFloors.map(floor => (
                  <button
                    key={floor}
                    onClick={() => setFilterFloor(floor)}
                    className={`px-2 py-1 text-xs cursor-pointer ${
                      filterFloor === floor
                        ? 'bg-white text-black font-bold'
                        : 'border border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    [FL {floor}]
                  </button>
                ))}
              </div>
            </div>

            {/* Room List */}
            <div className="mt-4 max-h-[300px] overflow-y-auto divide-y divide-neutral-900 border border-neutral-900">
              {loadingDetails ? (
                <div className="text-center py-8 text-xs text-neutral-500">
                  LOADING SPACES...
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-500">
                  NO ROOMS LOGGED ON THIS FLOOR.
                </div>
              ) : (
                filteredRooms.map(room => (
                  <div
                    key={room.id}
                    onClick={() => handleSelectRoom(room.id)}
                    className="py-2 px-3 hover:bg-neutral-950 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-white">
                        ROOM #{room.room_number}
                        {room.room_number === 'KSH' && <span className="text-[10px] text-neutral-400 font-normal ml-1">(Krishna)</span>}
                        {room.room_number === 'HSH' && <span className="text-[10px] text-neutral-400 font-normal ml-1">(Hundri)</span>}
                        {room.room_number === 'TSH' && <span className="text-[10px] text-neutral-400 font-normal ml-1">(Tungabhadra)</span>}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {room.room_type} / {room.capacity} SEATS
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`border px-1.5 py-0.5 text-[10px] ${
                        room.status === 'AVAILABLE' ? 'border-neutral-500 text-white bg-neutral-900' :
                        room.status === 'OCCUPIED' ? 'border-neutral-700 text-neutral-300' :
                        'border-neutral-800 text-neutral-500'
                      }`}>
                        [{room.status}]
                      </span>
                      <span className="text-[10px] text-neutral-400 hover:text-white">[VIEW]</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-900 text-[10px] text-neutral-500 text-center">
            SELECT ANY ROOM FOR SPECIFICATIONS &amp; BOOKING
          </div>
        </div>
      </div>

      {/* Room Details Modal */}
      {selectedRoomDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono"
          onClick={() => setSelectedRoomDetail(null)}
        >
          <div 
            className="w-full max-w-lg bg-black border border-neutral-700 p-5 relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  SPACE SPECIFICATION DOSSIER
                </span>
              </div>
              <button
                onClick={() => setSelectedRoomDetail(null)}
                className="text-neutral-500 hover:text-white text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="border border-neutral-700 px-1.5 py-0.5 text-[10px] text-white">
                  [{selectedRoomDetail.building_code}]
                </span>
                <span className="border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-[10px] text-neutral-300">
                  [{selectedRoomDetail.status}]
                </span>
              </div>
              <h3 className="text-base font-bold text-white uppercase">
                Room #{selectedRoomDetail.room_number}
                {selectedRoomDetail.room_number === 'KSH' && ' (Krishna Seminar Hall)'}
                {selectedRoomDetail.room_number === 'HSH' && ' (Hundri Seminar Hall)'}
                {selectedRoomDetail.room_number === 'TSH' && ' (Tungabhadra Seminar Hall)'}
                {' — '}{selectedRoomDetail.building_name}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Floor {selectedRoomDetail.floor} / {selectedRoomDetail.room_type}
              </p>
            </div>

            {/* Hardware Specs Grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">CAPACITY</div>
                <div className="font-bold text-white mt-1">{selectedRoomDetail.capacity} SEATS</div>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">AV SYSTEM</div>
                <div className="font-bold text-white mt-1">
                  {selectedRoomDetail.has_projector ? '[PROJECTOR]' : '[NONE]'}
                </div>
              </div>
              <div className="p-3 bg-neutral-950 border border-neutral-800">
                <div className="text-[10px] text-neutral-500 uppercase">CLIMATE</div>
                <div className="font-bold text-white mt-1">
                  {selectedRoomDetail.has_ac ? '[HVAC ON]' : '[STANDARD]'}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedRoomDetail(null)}
                className="px-3 py-1.5 bg-black border border-neutral-700 text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                [DISMISS]
              </button>
              <button
                onClick={() => {
                  const roomToBook = selectedRoomDetail;
                  setSelectedRoomDetail(null);
                  onOpenBookingModal(roomToBook);
                }}
                className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold cursor-pointer"
              >
                [BOOK THIS SPACE]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
