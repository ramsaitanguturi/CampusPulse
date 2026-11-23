import React, { useState, useEffect } from 'react';
import { CampusEvent, Building, Room } from '../types';
import { api } from '../services/api';

interface EventsViewProps {
  buildings: Building[];
  rooms: Room[];
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onRefreshData: () => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  buildings,
  rooms,
  isModalOpen,
  onCloseModal,
  onOpenModal,
  onRefreshData
}) => {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buildingId, setBuildingId] = useState<number>(buildings[0]?.id || 1);
  const [roomId, setRoomId] = useState<number | ''>('');
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('15:00');
  const [category, setCategory] = useState<string>('TECH');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Event title is required.');
      return;
    }

    if (endTime <= startTime) {
      alert('Event end time must be after start time.');
      return;
    }

    setSubmitting(true);
    try {
      const startIso = `${eventDate}T${startTime}:00Z`;
      const endIso = `${eventDate}T${endTime}:00Z`;

      await api.createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        building_id: Number(buildingId),
        room_id: roomId ? Number(roomId) : undefined,
        start_time: startIso,
        end_time: endIso,
        category,
      });

      setTitle('');
      setDescription('');
      onCloseModal();
      fetchEvents();
      onRefreshData();
    } catch (err: any) {
      alert(`Failed to create event: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEvents = events.filter(ev => {
    if (categoryFilter === 'ALL') return true;
    return ev.category === categoryFilter;
  });

  const availableRoomsForBuilding = rooms.filter(r => r.building_id === Number(buildingId));

  return (
    <div className="space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <h1 className="text-base font-bold text-white uppercase tracking-wider">
            Campus Event Schedules
          </h1>
          <p className="text-xs text-neutral-500">
            Synchronized facility reservations for academic colloquia, technical symposiums, and assemblies
          </p>
        </div>

        <button
          id="btn-open-event-modal"
          onClick={onOpenModal}
          className="px-3 py-1 bg-white text-black hover:bg-neutral-200 font-bold transition cursor-pointer text-xs"
        >
          [SCHEDULE EVENT]
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-1 text-xs bg-black border border-neutral-800 p-3 overflow-x-auto">
        <span className="text-neutral-500 uppercase tracking-wider text-[11px] mr-2">CATEGORY:</span>
        {['ALL', 'TECH', 'ACADEMIC', 'WORKSHOP', 'CULTURAL'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-2.5 py-1 text-[11px] font-mono transition cursor-pointer ${
              categoryFilter === cat
                ? 'bg-white text-black font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            [{cat}]
          </button>
        ))}
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
        {loading ? (
          <div className="col-span-full text-center py-16 text-neutral-500 text-xs">
            FETCHING CAMPUS EVENTS...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-black border border-neutral-800 space-y-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">No Events Scheduled</h4>
            <p className="text-xs text-neutral-500">Publish the next academic or technical assembly.</p>
          </div>
        ) : (
          filteredEvents.map(ev => (
            <div
              key={ev.id}
              className="bg-black border border-neutral-800 p-4 hover:border-neutral-600 transition-colors flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] border border-neutral-700 px-1.5 py-0.5 text-white font-bold bg-neutral-900">
                    [{ev.category}]
                  </span>
                  <span className="text-[11px] text-neutral-400 tabular-nums">
                    {new Date(ev.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-3 uppercase tracking-tight">
                  {ev.title}
                </h3>

                <p className="mt-2 text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                  {ev.description || 'Campus-wide assembly and seminar.'}
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-900 space-y-1.5 text-xs text-neutral-400">
                <div className="flex items-center justify-between">
                  <span className="text-white">
                    {ev.building_name} ({ev.building_code})
                  </span>
                  <span className="text-neutral-500 text-[11px]">
                    {ev.room_number ? `ROOM #${ev.room_number}` : 'CENTRAL HALL'}
                  </span>
                </div>

                <div className="text-[11px] text-neutral-500 tabular-nums">
                  START: {new Date(ev.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &rarr;{' '}
                  {new Date(ev.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Event Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono"
          onClick={onCloseModal}
        >
          <div 
            className="w-full max-w-lg bg-black border border-neutral-700 p-5 relative space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  SCHEDULE CAMPUS ASSEMBLY / EVENT
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  Publish a lecture, workshop, or symposium to the university calendar
                </p>
              </div>
              <button
                onClick={onCloseModal}
                className="text-neutral-500 hover:text-white text-xs cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs font-mono">
              {/* Title */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Autonomous Systems Symposium"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
                >
                  <option value="TECH">Technology / Engineering</option>
                  <option value="ACADEMIC">Academic Colloquium</option>
                  <option value="WORKSHOP">Practical Workshop</option>
                  <option value="CULTURAL">Cultural Event</option>
                </select>
              </div>

              {/* Building & Room Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                    Host Building *
                  </label>
                  <select
                    value={buildingId}
                    onChange={(e) => {
                      setBuildingId(Number(e.target.value));
                      setRoomId('');
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                    Room (Optional)
                  </label>
                  <select
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none cursor-pointer"
                  >
                    <option value="">Complex Main Auditorium / Hall</option>
                    {availableRoomsForBuilding.map((r) => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} &bull; Floor {r.floor} ({r.room_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] text-neutral-400 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline speakers, keynote topics, prerequisites, or target audience..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 px-3 py-2 text-white text-xs font-mono focus:border-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-3 py-1.5 bg-black border border-neutral-700 text-xs text-neutral-400 hover:text-white cursor-pointer"
                >
                  [DISMISS]
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 text-xs font-bold transition cursor-pointer disabled:opacity-40"
                >
                  {submitting ? '[SCHEDULING...]' : '[PUBLISH EVENT]'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
